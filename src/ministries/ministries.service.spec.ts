import { Test } from '@nestjs/testing';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { MinistriesService } from './ministries.service';

const MINISTRY_ID = 'ministerio-1';
const RESPONSIBLE_ID = 'membro-1';

describe('MinistriesService', () => {
  let service: MinistriesService;
  let prisma: {
    tenant: {
      ministry: {
        findMany: jest.Mock;
        count: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      member: {
        findFirst: jest.Mock;
      };
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        ministry: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        member: {
          findFirst: jest.fn(),
        },
        // $transaction do service recebe um array de Promises já disparadas
        // (não um callback) — o mock só precisa aguardar esse array.
        $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MinistriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(MinistriesService);
  });

  describe('findAll', () => {
    it('pagina com skip/take corretos e filtra deletedAt: null', async () => {
      prisma.tenant.ministry.findMany.mockResolvedValue([]);
      prisma.tenant.ministry.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.tenant.ministry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('aplica busca por nome (contains, insensitive) quando informado', async () => {
      prisma.tenant.ministry.findMany.mockResolvedValue([]);
      prisma.tenant.ministry.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'louvor' });

      expect(prisma.tenant.ministry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'louvor', mode: 'insensitive' },
          },
        }),
      );
    });

    it('retorna data + meta com totalPages calculado', async () => {
      const ministries = [{ id: '1' }, { id: '2' }];
      prisma.tenant.ministry.findMany.mockResolvedValue(ministries);
      prisma.tenant.ministry.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: ministries,
        meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
      });
    });
  });

  describe('findOne', () => {
    it('404 MINISTRY_NOT_FOUND quando não existe (ou já excluído)', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue(null);

      const promise = service.findOne(MINISTRY_ID);
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'MINISTRY_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.ministry.findFirst).toHaveBeenCalledWith({
        where: { id: MINISTRY_ID, deletedAt: null },
      });
    });

    it('retorna o ministério quando encontrado', async () => {
      const ministry = { id: MINISTRY_ID, name: 'Ministério de Louvor' };
      prisma.tenant.ministry.findFirst.mockResolvedValue(ministry);

      await expect(service.findOne(MINISTRY_ID)).resolves.toEqual(ministry);
    });
  });

  describe('create', () => {
    it('persiste os campos do dto quando não há responsibleId', async () => {
      const dto = { name: 'Ministério de Louvor' };
      prisma.tenant.ministry.create.mockResolvedValue({
        id: MINISTRY_ID,
        ...dto,
      });

      await service.create(dto);

      expect(prisma.tenant.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.tenant.ministry.create).toHaveBeenCalledWith({ data: dto });
    });

    it('valida que o responsável existe antes de criar', async () => {
      const dto = {
        name: 'Ministério de Louvor',
        responsibleId: RESPONSIBLE_ID,
      };
      prisma.tenant.member.findFirst.mockResolvedValue({ id: RESPONSIBLE_ID });
      prisma.tenant.ministry.create.mockResolvedValue({
        id: MINISTRY_ID,
        ...dto,
      });

      await service.create(dto);

      expect(prisma.tenant.member.findFirst).toHaveBeenCalledWith({
        where: { id: RESPONSIBLE_ID, deletedAt: null },
      });
      expect(prisma.tenant.ministry.create).toHaveBeenCalledWith({ data: dto });
    });

    it('404 quando o responsável informado não existe e não cria o ministério', async () => {
      const dto = {
        name: 'Ministério de Louvor',
        responsibleId: RESPONSIBLE_ID,
      };
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'MINISTRY_RESPONSIBLE_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.ministry.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404 quando o ministério não existe', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue(null);

      await expect(
        service.update(MINISTRY_ID, { name: 'Novo Nome' }),
      ).rejects.toMatchObject({ code: 'MINISTRY_NOT_FOUND' });
      expect(prisma.tenant.ministry.update).not.toHaveBeenCalled();
    });

    it('404 quando o novo responsável não existe e não atualiza o ministério', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue({ id: MINISTRY_ID });
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      await expect(
        service.update(MINISTRY_ID, { responsibleId: RESPONSIBLE_ID }),
      ).rejects.toMatchObject({ code: 'MINISTRY_RESPONSIBLE_NOT_FOUND' });
      expect(prisma.tenant.ministry.update).not.toHaveBeenCalled();
    });

    it('atualiza parcialmente (sem name) quando o ministério existe', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue({ id: MINISTRY_ID });
      const dto = { description: 'Nova descrição' };
      prisma.tenant.ministry.update.mockResolvedValue({
        id: MINISTRY_ID,
        ...dto,
      });

      const result = await service.update(MINISTRY_ID, dto);

      expect(prisma.tenant.ministry.update).toHaveBeenCalledWith({
        where: { id: MINISTRY_ID },
        data: dto,
      });
      expect(result).toEqual({ id: MINISTRY_ID, ...dto });
    });
  });

  describe('remove', () => {
    it('404 quando o ministério não existe', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue(null);

      await expect(service.remove(MINISTRY_ID)).rejects.toMatchObject({
        code: 'MINISTRY_NOT_FOUND',
      });
      expect(prisma.tenant.ministry.update).not.toHaveBeenCalled();
    });

    it('faz soft delete via update com deletedAt, nunca delete físico', async () => {
      prisma.tenant.ministry.findFirst.mockResolvedValue({ id: MINISTRY_ID });
      prisma.tenant.ministry.update.mockResolvedValue({});

      await service.remove(MINISTRY_ID);

      expect(prisma.tenant.ministry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MINISTRY_ID },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });
});
