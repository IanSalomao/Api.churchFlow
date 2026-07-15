import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const CHURCH_ID = 'igreja-1';
// exp de um token fictício (o service deriva expiresAt do decode do JWT)
const FAKE_EXP = 1_900_000_000;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    unscoped: {
      church: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
      passwordResetToken: {
        findUnique: jest.Mock;
        updateMany: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      $transaction: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; decode: jest.Mock };
  let configService: { getOrThrow: jest.Mock };
  let mailService: { sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    prisma = {
      unscoped: {
        church: {
          create: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        passwordResetToken: {
          findUnique: jest.fn(),
          updateMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn().mockResolvedValue([]),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
      decode: jest.fn().mockReturnValue({ exp: FAKE_EXP }),
    };
    configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'JWT_EXPIRATION_REMEMBER_ME' ? '30d' : '24h',
      ),
    };
    mailService = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      name: 'Igreja Teste',
      email: 'contato@teste.com',
      password: 'senhaSegura123',
    };

    it('persiste a senha com hash bcrypt (nunca em texto puro)', async () => {
      prisma.unscoped.church.create.mockResolvedValue({ id: CHURCH_ID });
      await service.register(dto);

      const data = prisma.unscoped.church.create.mock.calls[0][0].data;
      expect(data.password).not.toBe(dto.password);
      await expect(bcrypt.compare(dto.password, data.password)).resolves.toBe(
        true,
      );
    });

    it('retorna token autenticado e os dados da igreja', async () => {
      const church = { id: CHURCH_ID, name: dto.name, email: dto.email };
      prisma.unscoped.church.create.mockResolvedValue(church);

      await expect(service.register(dto)).resolves.toEqual({
        token: 'jwt-token',
        church,
      });
    });

    it('e-mail duplicado (P2002) vira 409 EMAIL_ALREADY_IN_USE', async () => {
      prisma.unscoped.church.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
      );

      const promise = service.register(dto);
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_IN_USE',
        status: 409,
      });
    });

    it('outros erros do banco não são engolidos', async () => {
      prisma.unscoped.church.create.mockRejectedValue(
        new Error('conexão caiu'),
      );
      await expect(service.register(dto)).rejects.toThrow('conexão caiu');
    });
  });

  describe('login', () => {
    const dto = { email: 'contato@teste.com', password: 'senhaSegura123' };

    const withActiveChurch = async (password: string) => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        id: CHURCH_ID,
        password: await bcrypt.hash(password, 4),
      });
    };

    it('busca apenas igreja ativa (deletedAt null)', async () => {
      await withActiveChurch(dto.password);
      await service.login(dto);
      expect(prisma.unscoped.church.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: dto.email, deletedAt: null },
        }),
      );
    });

    it('retorna token e expiresAt derivado do exp do JWT', async () => {
      await withActiveChurch(dto.password);
      await expect(service.login(dto)).resolves.toEqual({
        token: 'jwt-token',
        expiresAt: new Date(FAKE_EXP * 1000).toISOString(),
      });
    });

    it('usa JWT_EXPIRATION_DEFAULT sem rememberMe', async () => {
      await withActiveChurch(dto.password);
      await service.login(dto);
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'JWT_EXPIRATION_DEFAULT',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: CHURCH_ID },
        { expiresIn: '24h' },
      );
    });

    it('usa JWT_EXPIRATION_REMEMBER_ME com rememberMe', async () => {
      await withActiveChurch(dto.password);
      await service.login({ ...dto, rememberMe: true });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: CHURCH_ID },
        { expiresIn: '30d' },
      );
    });

    it('401 INVALID_CREDENTIALS para e-mail inexistente', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    });

    it('401 INVALID_CREDENTIALS para senha errada (mesma resposta)', async () => {
      await withActiveChurch('outraSenha');
      await expect(service.login(dto)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'contato@teste.com' };

    it('responde genérico sem tocar em tokens quando o e-mail não existe', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);
      expect(result.message).toMatch(/Se o e-mail informado existir/);
      expect(prisma.unscoped.$transaction).not.toHaveBeenCalled();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('invalida tokens válidos anteriores e cria o novo na mesma transação', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        id: CHURCH_ID,
        email: dto.email,
      });

      const result = await service.forgotPassword(dto);
      expect(result.message).toMatch(/Se o e-mail informado existir/);

      // invalidação: todo token ainda válido da igreja ganha usedAt
      const updateManyArgs =
        prisma.unscoped.passwordResetToken.updateMany.mock.calls[0][0];
      expect(updateManyArgs.where).toMatchObject({
        churchId: CHURCH_ID,
        usedAt: null,
      });
      expect(updateManyArgs.data.usedAt).toBeInstanceOf(Date);

      // criação: token aleatório com expiração de 1h
      const createArgs =
        prisma.unscoped.passwordResetToken.create.mock.calls[0][0];
      expect(createArgs.data.churchId).toBe(CHURCH_ID);
      expect(createArgs.data.token).toMatch(/^[0-9a-f]{64}$/);
      const ttlMs =
        createArgs.data.expiresAt.getTime() -
        updateManyArgs.data.usedAt.getTime();
      expect(ttlMs).toBe(60 * 60 * 1000);

      expect(prisma.unscoped.$transaction).toHaveBeenCalledTimes(1);
      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(
        dto.email,
        createArgs.data.token,
      );
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'token-recebido', newPassword: 'novaSenha456' };
    const validToken = {
      id: 'token-id',
      churchId: CHURCH_ID,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      usedAt: null,
    };

    it('400 INVALID_OR_EXPIRED_TOKEN para token inexistente', async () => {
      prisma.unscoped.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        status: 400,
      });
    });

    it('400 para token expirado', async () => {
      prisma.unscoped.passwordResetToken.findUnique.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    });

    it('400 para token já utilizado', async () => {
      prisma.unscoped.passwordResetToken.findUnique.mockResolvedValue({
        ...validToken,
        usedAt: new Date(),
      });
      await expect(service.resetPassword(dto)).rejects.toMatchObject({
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    });

    it('troca a senha (novo hash) e marca used_at na mesma transação', async () => {
      prisma.unscoped.passwordResetToken.findUnique.mockResolvedValue(
        validToken,
      );

      const result = await service.resetPassword(dto);
      expect(result.message).toBe('Senha alterada com sucesso.');

      const churchUpdate = prisma.unscoped.church.update.mock.calls[0][0];
      expect(churchUpdate.where).toEqual({ id: CHURCH_ID });
      expect(churchUpdate.data.password).not.toBe(dto.newPassword);
      await expect(
        bcrypt.compare(dto.newPassword, churchUpdate.data.password),
      ).resolves.toBe(true);

      const tokenUpdate =
        prisma.unscoped.passwordResetToken.update.mock.calls[0][0];
      expect(tokenUpdate.where).toEqual({ id: validToken.id });
      expect(tokenUpdate.data.usedAt).toBeInstanceOf(Date);

      expect(prisma.unscoped.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
