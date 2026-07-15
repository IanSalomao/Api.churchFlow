import { Test } from '@nestjs/testing';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';

const TRANSACTION_ID = 'transacao-1';
const CATEGORY_ID = 'categoria-1';
const MEMBER_ID = 'membro-1';
const MINISTRY_ID = 'ministerio-1';

const baseCategory = {
  id: CATEGORY_ID,
  name: 'Dízimo',
  color: '#22C55E',
  type: 'income',
  deletedAt: null,
};

const baseTransactionRow = {
  id: TRANSACTION_ID,
  churchId: 'igreja-1',
  categoryId: CATEGORY_ID,
  type: 'income',
  value: 500,
  date: new Date('2026-07-01'),
  description: 'Dízimo do mês',
  memberId: null,
  ministryId: null,
  deletedAt: null,
  createdAt: new Date('2026-07-01T09:00:00Z'),
  updatedAt: new Date('2026-07-01T09:00:00Z'),
  category: baseCategory,
  member: null,
  ministry: null,
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    tenant: {
      transaction: {
        findMany: jest.Mock;
        count: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      category: { findFirst: jest.Mock };
      member: { findFirst: jest.Mock };
      ministry: { findFirst: jest.Mock };
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        transaction: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        category: { findFirst: jest.fn() },
        member: { findFirst: jest.fn() },
        ministry: { findFirst: jest.fn() },
        $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  describe('findAll', () => {
    it('pagina com skip/take corretos, filtra deletedAt: null e ordena por -date por padrão', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValue([]);
      prisma.tenant.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 10,
          take: 10,
          orderBy: { date: 'desc' },
        }),
      );
    });

    it('aplica busca na descrição (contains, insensitive)', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValue([]);
      prisma.tenant.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'dízimo' });

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            description: { contains: 'dízimo', mode: 'insensitive' },
          },
        }),
      );
    });

    it('aplica filtro de período por dateFrom/dateTo', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValue([]);
      prisma.tenant.transaction.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 20,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      });

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            date: { gte: new Date('2026-07-01'), lte: new Date('2026-07-31') },
          },
        }),
      );
    });

    it('aplica filtro de categoryId e type', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValue([]);
      prisma.tenant.transaction.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 20,
        categoryId: CATEGORY_ID,
        type: 'expense',
      });

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, categoryId: CATEGORY_ID, type: 'expense' },
        }),
      );
    });

    it('aplica sort customizado (ex.: "value" vira orderBy asc)', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValue([]);
      prisma.tenant.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, sort: 'value' });

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { value: 'asc' } }),
      );
    });

    it('mapeia category/member/ministry aninhados e calcula meta', async () => {
      const rows = [
        baseTransactionRow,
        {
          ...baseTransactionRow,
          id: 'transacao-2',
          memberId: MEMBER_ID,
          member: { id: MEMBER_ID, name: 'João da Silva', deletedAt: null },
        },
      ];
      prisma.tenant.transaction.findMany.mockResolvedValue(rows);
      prisma.tenant.transaction.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
      expect(result.data[0]).toEqual({
        id: TRANSACTION_ID,
        churchId: 'igreja-1',
        type: 'income',
        value: 500,
        date: baseTransactionRow.date,
        description: 'Dízimo do mês',
        deletedAt: null,
        createdAt: baseTransactionRow.createdAt,
        updatedAt: baseTransactionRow.updatedAt,
        category: {
          id: CATEGORY_ID,
          name: 'Dízimo',
          color: '#22C55E',
          deleted: false,
        },
        member: null,
        ministry: null,
      });
      expect(result.data[1].member).toEqual({
        id: MEMBER_ID,
        name: 'João da Silva',
        deleted: false,
      });
    });

    it('marca category/member/ministry como deleted: true quando o vínculo foi excluído', async () => {
      const row = {
        ...baseTransactionRow,
        category: { ...baseCategory, deletedAt: new Date() },
        memberId: MEMBER_ID,
        member: { id: MEMBER_ID, name: 'João da Silva', deletedAt: new Date() },
      };
      prisma.tenant.transaction.findMany.mockResolvedValue([row]);
      prisma.tenant.transaction.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data[0].category).toMatchObject({ deleted: true });
      expect(result.data[0].member).toMatchObject({ deleted: true });
    });
  });

  describe('findOne', () => {
    it('404 TRANSACTION_NOT_FOUND quando não existe (ou já excluída)', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(null);

      const promise = service.findOne(TRANSACTION_ID);
      await expect(promise).rejects.toBeInstanceOf(AppException);
      await expect(promise).rejects.toMatchObject({
        code: 'TRANSACTION_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.transaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID, deletedAt: null },
        }),
      );
    });

    it('retorna a transação mapeada quando encontrada', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);

      const result = await service.findOne(TRANSACTION_ID);

      expect(result).toMatchObject({ id: TRANSACTION_ID, value: 500 });
      expect(result.member).toBeNull();
      expect(result.ministry).toBeNull();
    });
  });

  describe('create', () => {
    it('404 CATEGORY_NOT_FOUND quando a categoria não existe (ou está excluída)', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(null);

      const dto = {
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
      };

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'CATEGORY_NOT_FOUND',
        status: 404,
      });
      expect(prisma.tenant.transaction.create).not.toHaveBeenCalled();
    });

    it('422 CATEGORY_TYPE_MISMATCH quando a categoria é de outro tipo', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({
        ...baseCategory,
        type: 'expense',
      });

      const dto = {
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
      };

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'CATEGORY_TYPE_MISMATCH',
        status: 422,
      });
      expect(prisma.tenant.transaction.create).not.toHaveBeenCalled();
    });

    it('404 MEMBER_NOT_FOUND quando memberId informado não existe', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(baseCategory);
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      const dto = {
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
        memberId: MEMBER_ID,
      };

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'MEMBER_NOT_FOUND',
      });
      expect(prisma.tenant.transaction.create).not.toHaveBeenCalled();
    });

    it('404 MINISTRY_NOT_FOUND quando ministryId informado não existe', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(baseCategory);
      prisma.tenant.ministry.findFirst.mockResolvedValue(null);

      const dto = {
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
        ministryId: MINISTRY_ID,
      };

      await expect(service.create(dto)).rejects.toMatchObject({
        code: 'MINISTRY_NOT_FOUND',
      });
      expect(prisma.tenant.transaction.create).not.toHaveBeenCalled();
    });

    it('não valida member/ministry quando não informados', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(baseCategory);
      prisma.tenant.transaction.create.mockResolvedValue(baseTransactionRow);

      await service.create({
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
      });

      expect(prisma.tenant.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.tenant.ministry.findFirst).not.toHaveBeenCalled();
    });

    it('persiste value positivo quando type=income', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue(baseCategory);
      prisma.tenant.transaction.create.mockResolvedValue(baseTransactionRow);

      await service.create({
        type: 'income',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
      });

      expect(prisma.tenant.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: 500 }),
        }),
      );
    });

    it('persiste value negativo quando type=expense', async () => {
      prisma.tenant.category.findFirst.mockResolvedValue({
        ...baseCategory,
        type: 'expense',
      });
      prisma.tenant.transaction.create.mockResolvedValue({
        ...baseTransactionRow,
        type: 'expense',
        value: -500,
      });

      await service.create({
        type: 'expense',
        value: 500,
        date: '2026-07-01',
        categoryId: CATEGORY_ID,
      });

      expect(prisma.tenant.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: -500 }),
        }),
      );
    });
  });

  describe('update', () => {
    it('404 TRANSACTION_NOT_FOUND quando a transação não existe', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TRANSACTION_ID, { description: 'Novo texto' }),
      ).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' });
      expect(prisma.tenant.transaction.update).not.toHaveBeenCalled();
    });

    it('não revalida categoria quando type e categoryId não são enviados', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.transaction.update.mockResolvedValue(baseTransactionRow);

      await service.update(TRANSACTION_ID, { description: 'Ajustado' });

      expect(prisma.tenant.category.findFirst).not.toHaveBeenCalled();
      expect(prisma.tenant.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID },
          data: expect.objectContaining({ description: 'Ajustado' }),
        }),
      );
    });

    it('revalida categoria com o type atual quando só categoryId muda', async () => {
      const OTHER_CATEGORY_ID = 'categoria-2';
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.category.findFirst.mockResolvedValue({
        ...baseCategory,
        id: OTHER_CATEGORY_ID,
        type: 'expense',
      });

      await expect(
        service.update(TRANSACTION_ID, { categoryId: OTHER_CATEGORY_ID }),
      ).rejects.toMatchObject({ code: 'CATEGORY_TYPE_MISMATCH' });
      expect(prisma.tenant.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OTHER_CATEGORY_ID, deletedAt: null },
        }),
      );
      expect(prisma.tenant.transaction.update).not.toHaveBeenCalled();
    });

    it('revalida categoria com o categoryId atual quando só type muda', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.category.findFirst.mockResolvedValue(baseCategory);

      await expect(
        service.update(TRANSACTION_ID, { type: 'expense' }),
      ).rejects.toMatchObject({ code: 'CATEGORY_TYPE_MISMATCH' });
      expect(prisma.tenant.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CATEGORY_ID, deletedAt: null },
        }),
      );
    });

    it('recalcula o sinal quando só value muda (mantém o type atual)', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.transaction.update.mockResolvedValue(baseTransactionRow);

      await service.update(TRANSACTION_ID, { value: 550 });

      expect(prisma.tenant.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: 550 }),
        }),
      );
    });

    it('recalcula o sinal quando só type muda (mantém a magnitude atual)', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.category.findFirst.mockResolvedValue({
        ...baseCategory,
        type: 'expense',
      });
      prisma.tenant.transaction.update.mockResolvedValue(baseTransactionRow);

      await service.update(TRANSACTION_ID, {
        type: 'expense',
        categoryId: CATEGORY_ID,
      });

      expect(prisma.tenant.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ value: -500 }),
        }),
      );
    });

    it('permite limpar memberId e ministryId enviando null', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue({
        ...baseTransactionRow,
        memberId: MEMBER_ID,
        ministryId: MINISTRY_ID,
      });
      prisma.tenant.transaction.update.mockResolvedValue(baseTransactionRow);

      await service.update(TRANSACTION_ID, {
        memberId: null,
        ministryId: null,
      });

      expect(prisma.tenant.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.tenant.ministry.findFirst).not.toHaveBeenCalled();
      expect(prisma.tenant.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ memberId: null, ministryId: null }),
        }),
      );
    });

    it('404 MEMBER_NOT_FOUND quando o novo memberId não existe', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.member.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TRANSACTION_ID, { memberId: MEMBER_ID }),
      ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' });
      expect(prisma.tenant.transaction.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('404 TRANSACTION_NOT_FOUND quando não existe', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(null);

      await expect(service.remove(TRANSACTION_ID)).rejects.toMatchObject({
        code: 'TRANSACTION_NOT_FOUND',
      });
      expect(prisma.tenant.transaction.update).not.toHaveBeenCalled();
    });

    it('faz soft delete via update com deletedAt, nunca delete físico', async () => {
      prisma.tenant.transaction.findFirst.mockResolvedValue(baseTransactionRow);
      prisma.tenant.transaction.update.mockResolvedValue({});

      await service.remove(TRANSACTION_ID);

      expect(prisma.tenant.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TRANSACTION_ID },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });
});
