import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from './account.service';

const CHURCH_ID = 'igreja-1';

describe('AccountService', () => {
  let service: AccountService;
  let prisma: {
    unscoped: {
      church: { findFirst: jest.Mock; update: jest.Mock };
    };
  };

  beforeEach(async () => {
    prisma = {
      unscoped: {
        church: {
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AccountService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AccountService);
  });

  describe('getProfile', () => {
    it('busca apenas a igreja ativa (deletedAt null), sem a senha', async () => {
      const church = { id: CHURCH_ID, name: 'Igreja Teste' };
      prisma.unscoped.church.findFirst.mockResolvedValue(church);

      await expect(service.getProfile(CHURCH_ID)).resolves.toEqual(church);
      expect(prisma.unscoped.church.findFirst).toHaveBeenCalledWith({
        where: { id: CHURCH_ID, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cnpj: true,
          denomination: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('updateProfile', () => {
    const dto = { cnpj: '11.444.777/0001-61', denomination: 'Batista' };

    it('atualiza os campos informados e retorna o perfil sem a senha', async () => {
      const updated = { id: CHURCH_ID, ...dto };
      prisma.unscoped.church.update.mockResolvedValue(updated);

      await expect(service.updateProfile(CHURCH_ID, dto)).resolves.toEqual(
        updated,
      );
      expect(prisma.unscoped.church.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CHURCH_ID }, data: dto }),
      );
    });

    it('e-mail duplicado (P2002) vira 409 EMAIL_ALREADY_IN_USE', async () => {
      prisma.unscoped.church.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
      );

      const promise = service.updateProfile(CHURCH_ID, {
        email: 'em-uso@teste.com',
      });
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_IN_USE',
        status: 409,
      });
    });

    it('outros erros do banco não são engolidos', async () => {
      prisma.unscoped.church.update.mockRejectedValue(
        new Error('conexão caiu'),
      );
      await expect(service.updateProfile(CHURCH_ID, dto)).rejects.toThrow(
        'conexão caiu',
      );
    });
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'senhaAtual123',
      newPassword: 'senhaNova456',
    };

    it('401 INVALID_CREDENTIALS quando a senha atual está incorreta', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        password: await bcrypt.hash('outraSenha', 4),
      });

      const promise = service.changePassword(CHURCH_ID, dto);
      await expect(promise).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
      expect(prisma.unscoped.church.update).not.toHaveBeenCalled();
    });

    it('persiste a nova senha com hash bcrypt quando a senha atual confere', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        password: await bcrypt.hash(dto.currentPassword, 4),
      });

      const result = await service.changePassword(CHURCH_ID, dto);
      expect(result).toEqual({ message: 'Senha alterada com sucesso.' });

      const updateArgs = prisma.unscoped.church.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: CHURCH_ID });
      expect(updateArgs.data.password).not.toBe(dto.newPassword);
      await expect(
        bcrypt.compare(dto.newPassword, updateArgs.data.password),
      ).resolves.toBe(true);
    });
  });

  describe('deleteAccount', () => {
    const dto = {
      currentPassword: 'senhaAtual123',
      confirmationPhrase: 'EXCLUIR',
    };

    it('401 INVALID_CREDENTIALS quando a senha atual está incorreta', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        password: await bcrypt.hash('outraSenha', 4),
      });

      const promise = service.deleteAccount(CHURCH_ID, dto);
      await expect(promise).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
      expect(prisma.unscoped.church.update).not.toHaveBeenCalled();
    });

    it('faz soft delete via update com deletedAt quando a senha confere', async () => {
      prisma.unscoped.church.findFirst.mockResolvedValue({
        password: await bcrypt.hash(dto.currentPassword, 4),
      });

      const result = await service.deleteAccount(CHURCH_ID, dto);
      expect(result).toEqual({ message: 'Conta excluída com sucesso.' });
      expect(prisma.unscoped.church.update).toHaveBeenCalledWith({
        where: { id: CHURCH_ID },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });
  });
});
