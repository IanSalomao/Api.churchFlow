import { Test } from '@nestjs/testing';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';

const MEMBER_ID = 'membro-1';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: {
    tenant: {
      member: {
        findMany: jest.Mock;
        count: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        member: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        // $transaction do service recebe um array de Promises já disparadas
        // (não um callback) — o mock só precisa aguardar esse array.
        $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [MembersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(MembersService);
  });

  describe('findAll', () => {
    it('pagina com skip/take corretos e filtra deletedAt: null', async () => {
      prisma.tenant.member.findMany.mockResolvedValue([]);
      prisma.tenant.member.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.tenant.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('aplica busca por nome (contains, insensitive) quando informado', async () => {
      prisma.tenant.member.findMany.mockResolvedValue([]);
      prisma.tenant.member.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'joão' });

      expect(prisma.tenant.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'joão', mode: 'insensitive' },
          },
        }),
      );
    });

    it('retorna items + meta com totalPages calculado', async () => {
      const members = [{ id: '1' }, { id: '2' }];
      prisma.tenant.member.findMany.mockResolvedValue(members);
      prisma.tenant.member.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        items: members,
        meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
      });
    });
  });

  describe('findOne', () => {
    it('404 MEMBER_NOT_FOUND quando não existe (ou já excluído)', async () => {
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      const promise = service.findOne(MEMBER_ID);
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'MEMBER_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.member.findFirst).toHaveBeenCalledWith({
        where: { id: MEMBER_ID, deletedAt: null },
      });
    });

    it('retorna o membro quando encontrado', async () => {
      const member = { id: MEMBER_ID, name: 'João' };
      prisma.tenant.member.findFirst.mockResolvedValue(member);

      await expect(service.findOne(MEMBER_ID)).resolves.toEqual(member);
    });
  });

  describe('create', () => {
    it('persiste os campos do dto (churchId é injetado pela extension, não aqui)', async () => {
      const dto = { name: 'João da Silva' };
      prisma.tenant.member.create.mockResolvedValue({ id: MEMBER_ID, ...dto });

      await service.create(dto);

      expect(prisma.tenant.member.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('404 quando o membro não existe', async () => {
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      await expect(
        service.update(MEMBER_ID, { name: 'Novo Nome' }),
      ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
      expect(prisma.tenant.member.update).not.toHaveBeenCalled();
    });

    it('atualiza quando o membro existe', async () => {
      prisma.tenant.member.findFirst.mockResolvedValue({ id: MEMBER_ID });
      const dto = { name: 'Novo Nome' };
      prisma.tenant.member.update.mockResolvedValue({ id: MEMBER_ID, ...dto });

      const result = await service.update(MEMBER_ID, dto);

      expect(prisma.tenant.member.update).toHaveBeenCalledWith({
        where: { id: MEMBER_ID },
        data: dto,
      });
      expect(result).toEqual({ id: MEMBER_ID, ...dto });
    });
  });

  describe('remove', () => {
    it('404 quando o membro não existe', async () => {
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      await expect(service.remove(MEMBER_ID)).rejects.toMatchObject({
        code: 'MEMBER_NOT_FOUND',
      });
      expect(prisma.tenant.member.update).not.toHaveBeenCalled();
    });

    it('faz soft delete via update com deletedAt, nunca delete físico', async () => {
      prisma.tenant.member.findFirst.mockResolvedValue({ id: MEMBER_ID });
      prisma.tenant.member.update.mockResolvedValue({});

      await service.remove(MEMBER_ID);

      expect(prisma.tenant.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MEMBER_ID },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });
});
