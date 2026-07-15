import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'e2e-dashboard@teste.local';
const OTHER_EMAIL = 'e2e-dashboard-outra-igreja@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let otherAuthToken: string;
  let churchId: string;
  let otherChurchId: string;
  let incomeCategoryId: string;
  let expenseCategoryId: string;
  let ministryId: string;

  const cleanup = async () => {
    await prisma.unscoped.transaction.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.category.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.ministry.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.member.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.church.deleteMany({
      where: { email: { in: [EMAIL, OTHER_EMAIL] } },
    });
  };

  const login = async (email: string): Promise<string> => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Igreja E2E Dashboard', email, password: PASSWORD });
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return response.body.data.token as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    authToken = await login(EMAIL);
    otherAuthToken = await login(OTHER_EMAIL);

    const church = await prisma.unscoped.church.findFirstOrThrow({
      where: { email: EMAIL },
    });
    const otherChurch = await prisma.unscoped.church.findFirstOrThrow({
      where: { email: OTHER_EMAIL },
    });
    churchId = church.id;
    otherChurchId = otherChurch.id;

    const ministry = await prisma.unscoped.ministry.create({
      data: { churchId, name: 'Ministério E2E' },
    });
    ministryId = ministry.id;

    const incomeCategory = await prisma.unscoped.category.create({
      data: {
        churchId,
        name: 'Dízimo',
        type: 'income',
        color: '#22C55E',
      },
    });
    incomeCategoryId = incomeCategory.id;

    const expenseCategory = await prisma.unscoped.category.create({
      data: {
        churchId,
        name: 'Aluguel',
        type: 'expense',
        color: '#EF4444',
      },
    });
    expenseCategoryId = expenseCategory.id;

    // T1: income, com ministério, dentro do período custom de teste (jan/fev)
    await prisma.unscoped.transaction.create({
      data: {
        churchId,
        categoryId: incomeCategoryId,
        type: 'income',
        value: 500,
        date: new Date('2026-01-05'),
        ministryId,
      },
    });
    // T2: income, sem ministério, dentro do período custom de teste (jan/fev)
    await prisma.unscoped.transaction.create({
      data: {
        churchId,
        categoryId: incomeCategoryId,
        type: 'income',
        value: 300,
        date: new Date('2026-02-10'),
      },
    });
    // T3: expense, com ministério, dentro do período custom de teste (jan/fev)
    await prisma.unscoped.transaction.create({
      data: {
        churchId,
        categoryId: expenseCategoryId,
        type: 'expense',
        value: -1200,
        date: new Date('2026-01-20'),
        ministryId,
      },
    });
    // T4: expense, fora do período custom de teste (mar) — só entra no "all-time"
    await prisma.unscoped.transaction.create({
      data: {
        churchId,
        categoryId: expenseCategoryId,
        type: 'expense',
        value: -200,
        date: new Date('2026-03-01'),
      },
    });

    // Transação de outra igreja — nunca deve vazar nos totais acima
    const otherCategory = await prisma.unscoped.category.create({
      data: {
        churchId: otherChurchId,
        name: 'Categoria Outra Igreja',
        type: 'income',
        color: '#000000',
      },
    });
    await prisma.unscoped.transaction.create({
      data: {
        churchId: otherChurchId,
        categoryId: otherCategory.id,
        type: 'income',
        value: 99999,
        date: new Date('2026-01-10'),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const authed = {
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${authToken}`),
  };

  describe('GET /v1/dashboard/summary', () => {
    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .get('/v1/dashboard/summary')
        .expect(401);
    });

    it('balance/transactionsCount/averageTicket somam todas as transações, sem filtro de período (e sem vazar de outra igreja)', async () => {
      const response = await authed
        .get('/v1/dashboard/summary?period=last12Months')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        balance: -600,
        transactionsCount: 4,
        averageTicket: 550,
      });
    });

    it('period=custom calcula income/expense/periodBalance só dentro do intervalo informado', async () => {
      const response = await authed
        .get(
          '/v1/dashboard/summary?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28',
        )
        .expect(200);

      expect(response.body.data).toMatchObject({
        income: 800,
        expense: 1200,
        periodBalance: -400,
      });
    });

    it('filtra por ministryId e oculta transações sem ministério vinculado', async () => {
      const response = await authed
        .get(
          `/v1/dashboard/summary?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28&ministryId=${ministryId}`,
        )
        .expect(200);

      expect(response.body.data).toMatchObject({
        income: 500,
        expense: 1200,
        periodBalance: -700,
      });
    });

    it('filtra por categoryIds', async () => {
      const response = await authed
        .get(
          `/v1/dashboard/summary?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28&categoryIds=${incomeCategoryId}`,
        )
        .expect(200);

      expect(response.body.data).toMatchObject({
        income: 800,
        expense: 0,
        periodBalance: 800,
      });
    });

    it('filtra por type=expense', async () => {
      const response = await authed
        .get(
          '/v1/dashboard/summary?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28&type=expense',
        )
        .expect(200);

      expect(response.body.data).toMatchObject({
        income: 0,
        expense: 1200,
      });
    });

    it('membersCount e ministriesCount refletem a igreja autenticada', async () => {
      const response = await authed.get('/v1/dashboard/summary').expect(200);

      expect(response.body.data.ministriesCount).toBe(1);
    });

    it('period=custom sem dateFrom/dateTo → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .get('/v1/dashboard/summary?period=custom')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('dateTo anterior a dateFrom → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .get(
          '/v1/dashboard/summary?period=custom&dateFrom=2026-02-01&dateTo=2026-01-01',
        )
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('categoryIds com uuid inválido → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .get('/v1/dashboard/summary?categoryIds=nao-e-um-uuid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('outra igreja não vê os dados desta igreja', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/v1/dashboard/summary?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28',
        )
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(200);

      expect(response.body.data.income).toBe(99999);
      expect(response.body.data.expense).toBe(0);
    });
  });

  describe('GET /v1/dashboard/charts', () => {
    it('agrupa o gráfico de linha por mês para um período maior que 31 dias', async () => {
      const response = await authed
        .get(
          '/v1/dashboard/charts?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28',
        )
        .expect(200);

      expect(response.body.data.line).toEqual([
        { date: '2026-01-01', income: 500, expense: 1200 },
        { date: '2026-02-01', income: 300, expense: 0 },
      ]);
    });

    it('retorna entradas e saídas por categoria com nome e cor', async () => {
      const response = await authed
        .get(
          '/v1/dashboard/charts?period=custom&dateFrom=2026-01-01&dateTo=2026-02-28',
        )
        .expect(200);

      expect(response.body.data.incomeByCategory).toEqual([
        {
          categoryId: incomeCategoryId,
          name: 'Dízimo',
          color: '#22C55E',
          value: 800,
        },
      ]);
      expect(response.body.data.expenseByCategory).toEqual([
        {
          categoryId: expenseCategoryId,
          name: 'Aluguel',
          color: '#EF4444',
          value: 1200,
        },
      ]);
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .get('/v1/dashboard/charts')
        .expect(401);
    });
  });
});
