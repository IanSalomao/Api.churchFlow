import { Test } from '@nestjs/testing';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const CATEGORY_ID = 'categoria-1';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    tenant: {
      category: {
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
        category: {
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
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe('findAll', () => {
    it('pagina com skip/take corretos e filtra deletedAt: null', async () => {
      prisma.tenant.category.findMany.mockResolvedValue([]);
      prisma.tenant.category.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.tenant.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('filtra por type quando informado', async () => {
      prisma.tenant.category.findMany.mockResolvedValue([]);
      prisma.tenant.category.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, type: 'income' });

      expect(prisma.tenant.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, type: 'income' },
        }),
      );
    });

    it('não filtra por type quando omitido (retorna ambos os tipos)', async () => {
      prisma.tenant.category.findMany.mockResolvedValue([]);
      prisma.tenant.category.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 });

      expect(prisma.tenant.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('retorna items + meta com totalPages calculado', async () => {
      const categories = [{ id: '1' }, { id: '2' }];
      prisma.tenant.category.findMany.mockResolvedValue(categories);
      prisma.tenant.category.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        items: categories,
        meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
      });
    });
  });

  describe('findOne', () => {
    it('404 RESOURCE_NOT_FOUND quando não existe (ou já excluída)', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(null);

      const promise = service.findOne(CATEGORY_ID);
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.category.findFirst).toHaveBeenCalledWith({
        where: { id: CATEGORY_ID, deletedAt: null },
      });
    });

    it('retorna a categoria quando encontrada', async () => {
      const category = { id: CATEGORY_ID, name: 'Dízimo', type: 'income' };
      prisma.tenant.category.findFirst.mockResolvedValue(category);

      await expect(service.findOne(CATEGORY_ID)).resolves.toEqual(category);
    });
  });

  describe('create', () => {
    it('persiste os campos do dto (type definido na criação)', async () => {
      const dto = {
        name: 'Dízimo',
        type: 'income' as const,
        color: '#22C55E',
      };
      prisma.tenant.category.create.mockResolvedValue({
        id: CATEGORY_ID,
        ...dto,
      });

      await service.create(dto);

      expect(prisma.tenant.category.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('update', () => {
    it('404 quando a categoria não existe', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(null);

      await expect(
        service.update(CATEGORY_ID, { name: 'Novo Nome' }),
      ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND', status: 404 });
      expect(prisma.tenant.category.update).not.toHaveBeenCalled();
    });

    it('422 CATEGORY_TYPE_IMMUTABLE quando type é informado, mesmo igual ao atual', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({
        id: CATEGORY_ID,
        type: 'income',
      });

      await expect(
        service.update(CATEGORY_ID, { type: 'income' } as never),
      ).rejects.toMatchObject({
        code: 'CATEGORY_TYPE_IMMUTABLE',
        status: 422,
      });
      expect(prisma.tenant.category.update).not.toHaveBeenCalled();
    });

    it('atualiza parcialmente (sem name) quando a categoria existe', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({ id: CATEGORY_ID });
      const dto = { color: '#16A34A' };
      prisma.tenant.category.update.mockResolvedValue({
        id: CATEGORY_ID,
        ...dto,
      });

      const result = await service.update(CATEGORY_ID, dto);

      expect(prisma.tenant.category.update).toHaveBeenCalledWith({
        where: { id: CATEGORY_ID },
        data: dto,
      });
      expect(result).toEqual({ id: CATEGORY_ID, ...dto });
    });
  });

  describe('remove', () => {
    it('404 quando a categoria não existe', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(null);

      await expect(service.remove(CATEGORY_ID)).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
      expect(prisma.tenant.category.update).not.toHaveBeenCalled();
    });

    it('faz soft delete via update com deletedAt, nunca delete físico', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({ id: CATEGORY_ID });
      prisma.tenant.category.update.mockResolvedValue({});

      await service.remove(CATEGORY_ID);

      expect(prisma.tenant.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CATEGORY_ID },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('permite exclusão mesmo com transações vinculadas (sem checagem extra)', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({ id: CATEGORY_ID });
      prisma.tenant.category.update.mockResolvedValue({});

      await service.remove(CATEGORY_ID);

      expect(prisma.tenant.category.findFirst).toHaveBeenCalledTimes(1);
    });
  });
});
