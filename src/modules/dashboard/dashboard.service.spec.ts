import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';
import { DashboardComparisonQueryDto } from './dto/dashboard-comparison-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const NOW = new Date('2026-07-15T12:00:00.000Z');

function query(overrides: Partial<DashboardQueryDto> = {}): DashboardQueryDto {
  const dto = new DashboardQueryDto();
  Object.assign(dto, { period: 'currentMonth', type: 'all', ...overrides });
  return dto;
}

function comparisonQuery(
  overrides: Partial<DashboardComparisonQueryDto> = {},
): DashboardComparisonQueryDto {
  const dto = new DashboardComparisonQueryDto();
  Object.assign(dto, {
    period: 'currentMonth',
    groupBy: 'month',
    ...overrides,
  });
  return dto;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    tenant: {
      transaction: { findMany: jest.Mock };
      member: { count: jest.Mock };
      ministry: { count: jest.Mock };
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    prisma = {
      tenant: {
        transaction: { findMany: jest.fn().mockResolvedValue([]) },
        member: { count: jest.fn().mockResolvedValue(0) },
        ministry: { count: jest.fn().mockResolvedValue(0) },
        $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getSummary', () => {
    it('soma balance/transactionsCount/averageTicket a partir de todas as transações, sem filtro de período', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        { value: 1000 },
        { value: -400 },
        { value: -100 },
      ]);

      const result = await service.getSummary(query());

      expect(result.balance).toBe(500);
      expect(result.transactionsCount).toBe(3);
      // ticket médio é a média das magnitudes: (1000 + 400 + 100) / 3
      expect(result.averageTicket).toBe(500);
    });

    it('averageTicket é 0 quando não há transações (evita divisão por zero)', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([]);

      const result = await service.getSummary(query());

      expect(result.transactionsCount).toBe(0);
      expect(result.averageTicket).toBe(0);
    });

    it('income/expense são magnitudes positivas calculadas só dentro do período; periodBalance é o saldo líquido do período', async () => {
      prisma.tenant.transaction.findMany
        .mockResolvedValueOnce([]) // all-time (balance)
        .mockResolvedValueOnce([
          { value: 500, type: 'income' },
          { value: -1200, type: 'expense' },
        ]); // período

      const result = await service.getSummary(query());

      expect(result.income).toBe(500);
      expect(result.expense).toBe(1200);
      expect(result.periodBalance).toBe(-700);
    });

    it('balance não é afetado por period/dateFrom/dateTo (where all-time sem filtro de data)', async () => {
      await service.getSummary(query({ period: 'last12Months' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(1, {
        where: { deletedAt: null },
        select: { value: true },
      });
    });

    it('membersCount e ministriesCount contam todos os ativos, ignorando os filtros de transação', async () => {
      prisma.tenant.member.count.mockResolvedValueOnce(87);
      prisma.tenant.ministry.count.mockResolvedValueOnce(6);

      const result = await service.getSummary(
        query({ type: 'income', ministryId: 'ministerio-1' }),
      );

      expect(prisma.tenant.member.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(prisma.tenant.ministry.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result.membersCount).toBe(87);
      expect(result.ministriesCount).toBe(6);
    });

    it('aplica type/categoryIds/ministryId no where das transações (all-time e período)', async () => {
      await service.getSummary(
        query({
          type: 'income',
          categoryIds: ['cat-1', 'cat-2'],
          ministryId: 'ministerio-1',
        }),
      );

      const expectedWhere = {
        deletedAt: null,
        type: 'income',
        categoryId: { in: ['cat-1', 'cat-2'] },
        ministryId: 'ministerio-1',
      };
      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(1, {
        where: expectedWhere,
        select: { value: true },
      });
      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          ...expectedWhere,
          date: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-15T00:00:00.000Z'),
          },
        },
        select: { value: true, type: true },
      });
    });

    it('period=currentMonth filtra do dia 1 do mês corrente até hoje', async () => {
      await service.getSummary(query({ period: 'currentMonth' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-07-01T00:00:00.000Z'),
              lte: new Date('2026-07-15T00:00:00.000Z'),
            },
          }),
        }),
      );
    });

    it('period=last3Months filtra desde o dia 1 de 2 meses atrás até hoje', async () => {
      await service.getSummary(query({ period: 'last3Months' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lte: new Date('2026-07-15T00:00:00.000Z'),
            },
          }),
        }),
      );
    });

    it('period=last6Months filtra desde o dia 1 de 5 meses atrás até hoje', async () => {
      await service.getSummary(query({ period: 'last6Months' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-02-01T00:00:00.000Z'),
              lte: new Date('2026-07-15T00:00:00.000Z'),
            },
          }),
        }),
      );
    });

    it('period=last12Months filtra desde o dia 1 de 11 meses atrás até hoje', async () => {
      await service.getSummary(query({ period: 'last12Months' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2025-08-01T00:00:00.000Z'),
              lte: new Date('2026-07-15T00:00:00.000Z'),
            },
          }),
        }),
      );
    });

    it('period=currentYear filtra desde 1º de janeiro do ano corrente até hoje', async () => {
      await service.getSummary(query({ period: 'currentYear' }));

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-07-15T00:00:00.000Z'),
            },
          }),
        }),
      );
    });

    it('period=custom usa exatamente dateFrom/dateTo informados', async () => {
      await service.getSummary(
        query({
          period: 'custom',
          dateFrom: '2026-02-10',
          dateTo: '2026-03-20',
        }),
      );

      expect(prisma.tenant.transaction.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-02-10'),
              lte: new Date('2026-03-20'),
            },
          }),
        }),
      );
    });
  });

  describe('getCharts', () => {
    it('agrupa o gráfico de linha por dia quando o período tem até 31 dias', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        {
          date: new Date('2026-07-01'),
          value: 500,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
        {
          date: new Date('2026-07-02'),
          value: -1200,
          type: 'expense',
          category: { id: 'cat-2', name: 'Aluguel', color: '#EF4444' },
        },
      ]);

      const result = await service.getCharts(query({ period: 'currentMonth' }));

      const zero = (date: string) => ({ date, income: 0, expense: 0 });
      expect(result.line).toEqual([
        { date: '2026-07-01', income: 500, expense: 0 },
        { date: '2026-07-02', income: 0, expense: 1200 },
        zero('2026-07-03'),
        zero('2026-07-04'),
        zero('2026-07-05'),
        zero('2026-07-06'),
        zero('2026-07-07'),
        zero('2026-07-08'),
        zero('2026-07-09'),
        zero('2026-07-10'),
        zero('2026-07-11'),
        zero('2026-07-12'),
        zero('2026-07-13'),
        zero('2026-07-14'),
        zero('2026-07-15'),
      ]);
    });

    it('agrupa o gráfico de linha por mês quando o período supera 31 dias', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        {
          date: new Date('2026-05-05'),
          value: 300,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
        {
          date: new Date('2026-05-20'),
          value: 200,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
        {
          date: new Date('2026-06-10'),
          value: -900,
          type: 'expense',
          category: { id: 'cat-2', name: 'Aluguel', color: '#EF4444' },
        },
      ]);

      const result = await service.getCharts(query({ period: 'last3Months' }));

      expect(result.line).toEqual([
        { date: '2026-05-01', income: 500, expense: 0 },
        { date: '2026-06-01', income: 0, expense: 900 },
        { date: '2026-07-01', income: 0, expense: 0 },
      ]);
    });

    it('preenche com zero todos os dias do período quando não há nenhuma transação', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([]);

      const result = await service.getCharts(
        query({
          period: 'custom',
          dateFrom: '2026-03-10',
          dateTo: '2026-03-13',
        }),
      );

      expect(result.line).toEqual([
        { date: '2026-03-10', income: 0, expense: 0 },
        { date: '2026-03-11', income: 0, expense: 0 },
        { date: '2026-03-12', income: 0, expense: 0 },
        { date: '2026-03-13', income: 0, expense: 0 },
      ]);
    });

    it('agrupa entradas e saídas por categoria com nome/cor e valor em magnitude positiva', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        {
          date: new Date('2026-07-01'),
          value: 500,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
        {
          date: new Date('2026-07-03'),
          value: 300,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
        {
          date: new Date('2026-07-02'),
          value: -1200,
          type: 'expense',
          category: { id: 'cat-2', name: 'Aluguel', color: '#EF4444' },
        },
      ]);

      const result = await service.getCharts(query());

      expect(result.incomeByCategory).toEqual([
        { categoryId: 'cat-1', name: 'Dízimo', color: '#22C55E', value: 800 },
      ]);
      expect(result.expenseByCategory).toEqual([
        { categoryId: 'cat-2', name: 'Aluguel', color: '#EF4444', value: 1200 },
      ]);
    });

    it('não retorna categorias sem transações do respectivo tipo', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        {
          date: new Date('2026-07-01'),
          value: 500,
          type: 'income',
          category: { id: 'cat-1', name: 'Dízimo', color: '#22C55E' },
        },
      ]);

      const result = await service.getCharts(query());

      expect(result.expenseByCategory).toEqual([]);
    });

    it('aplica os mesmos filtros (type/categoryIds/ministryId) e o período no where', async () => {
      await service.getCharts(
        query({
          period: 'custom',
          dateFrom: '2026-02-10',
          dateTo: '2026-03-20',
          type: 'expense',
          categoryIds: ['cat-2'],
          ministryId: 'ministerio-1',
        }),
      );

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            type: 'expense',
            categoryId: { in: ['cat-2'] },
            ministryId: 'ministerio-1',
            date: {
              gte: new Date('2026-02-10'),
              lte: new Date('2026-03-20'),
            },
          },
        }),
      );
    });
  });

  describe('getComparison', () => {
    it('agrupa por mês, preenche buckets contínuos e retorna sampleSize 0 quando há um único bucket', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        { date: new Date('2026-07-05'), value: 500, type: 'income' },
        { date: new Date('2026-07-10'), value: -200, type: 'expense' },
      ]);

      const result = await service.getComparison(
        comparisonQuery({ period: 'currentMonth', groupBy: 'month' }),
      );

      expect(result.groupBy).toBe('month');
      expect(result.buckets).toEqual([
        {
          periodStart: '2026-07-01',
          label: 'Jul/26',
          income: 500,
          expense: 200,
        },
      ]);
      expect(result.comparison).toEqual({
        sampleSize: 0,
        incomeVsAvg: null,
        expenseVsAvg: null,
      });
    });

    it('calcula incomeVsAvg/expenseVsAvg do último bucket vs. a média dos anteriores (exemplo do spec)', async () => {
      const monthlySummaries: {
        month: string;
        income: number;
        expense: number;
      }[] = [
        { month: '2026-02', income: 100000, expense: 60000 },
        { month: '2026-03', income: 105000, expense: 58000 },
        { month: '2026-04', income: 98000, expense: 62000 },
        { month: '2026-05', income: 102000, expense: 59000 },
        { month: '2026-06', income: 95000, expense: 61000 },
        { month: '2026-07', income: 90000, expense: 70000 },
      ];
      const monthlyRows = monthlySummaries.flatMap(
        ({ month, income, expense }) => [
          { date: new Date(`${month}-01`), value: income, type: 'income' },
          { date: new Date(`${month}-01`), value: -expense, type: 'expense' },
        ],
      );
      prisma.tenant.transaction.findMany.mockResolvedValueOnce(monthlyRows);

      const result = await service.getComparison(
        comparisonQuery({
          period: 'custom',
          dateFrom: '2026-02-01',
          dateTo: '2026-07-31',
          groupBy: 'month',
        }),
      );

      expect(result.buckets).toEqual([
        {
          periodStart: '2026-02-01',
          label: 'Fev/26',
          income: 100000,
          expense: 60000,
        },
        {
          periodStart: '2026-03-01',
          label: 'Mar/26',
          income: 105000,
          expense: 58000,
        },
        {
          periodStart: '2026-04-01',
          label: 'Abr/26',
          income: 98000,
          expense: 62000,
        },
        {
          periodStart: '2026-05-01',
          label: 'Mai/26',
          income: 102000,
          expense: 59000,
        },
        {
          periodStart: '2026-06-01',
          label: 'Jun/26',
          income: 95000,
          expense: 61000,
        },
        {
          periodStart: '2026-07-01',
          label: 'Jul/26',
          income: 90000,
          expense: 70000,
        },
      ]);
      expect(result.comparison).toEqual({
        sampleSize: 5,
        incomeVsAvg: -10.0,
        expenseVsAvg: 16.7,
      });
    });

    it('agrupa por semana (domingo a sábado), rotulando a faixa de dias e cruzando o mês quando aplicável', async () => {
      prisma.tenant.transaction.findMany.mockResolvedValueOnce([
        { date: new Date('2026-06-30'), value: 1000, type: 'income' },
        { date: new Date('2026-07-08'), value: -400, type: 'expense' },
      ]);

      const result = await service.getComparison(
        comparisonQuery({
          period: 'custom',
          dateFrom: '2026-06-28',
          dateTo: '2026-07-05',
          groupBy: 'week',
        }),
      );

      expect(result.groupBy).toBe('week');
      expect(result.buckets).toEqual([
        {
          periodStart: '2026-06-28',
          label: '28/jun–04/jul',
          income: 1000,
          expense: 0,
        },
        {
          periodStart: '2026-07-05',
          label: '05–11/jul',
          income: 0,
          expense: 400,
        },
      ]);
      // média anterior de expense é 0 → divisão impossível → null
      expect(result.comparison).toEqual({
        sampleSize: 1,
        incomeVsAvg: -100.0,
        expenseVsAvg: null,
      });
    });

    it('aplica categoryIds/ministryId no where, sem filtrar por type (comparison sempre traz os dois tipos)', async () => {
      await service.getComparison(
        comparisonQuery({
          period: 'custom',
          dateFrom: '2026-02-10',
          dateTo: '2026-03-20',
          categoryIds: ['cat-2'],
          ministryId: 'ministerio-1',
        }),
      );

      expect(prisma.tenant.transaction.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          categoryId: { in: ['cat-2'] },
          ministryId: 'ministerio-1',
          date: {
            gte: new Date('2026-02-10'),
            lte: new Date('2026-03-20'),
          },
        },
        select: { date: true, value: true, type: true },
      });
    });
  });
});
