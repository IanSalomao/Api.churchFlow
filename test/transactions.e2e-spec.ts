import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-transactions@teste.local';
const OTHER_EMAIL = 'e2e-transactions-outra-igreja@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let otherAuthToken: string;
  let churchId: string;
  let otherChurchId: string;
  let incomeCategoryId: string;
  let expenseCategoryId: string;
  let otherChurchCategoryId: string;
  let memberId: string;
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

  const login = async (
    email: string,
  ): Promise<{ token: string; churchId: string }> => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Igreja E2E Transactions', email, password: PASSWORD });
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const church = await prisma.unscoped.church.findFirstOrThrow({
      where: { email },
    });
    return { token: response.body.data.token as string, churchId: church.id };
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

    ({ token: authToken, churchId } = await login(EMAIL));
    ({ token: otherAuthToken, churchId: otherChurchId } =
      await login(OTHER_EMAIL));

    const incomeCategory = await prisma.unscoped.category.create({
      data: { churchId, name: 'Dízimo', type: 'income', color: '#22C55E' },
    });
    incomeCategoryId = incomeCategory.id;

    const expenseCategory = await prisma.unscoped.category.create({
      data: { churchId, name: 'Aluguel', type: 'expense', color: '#EF4444' },
    });
    expenseCategoryId = expenseCategory.id;

    const otherCategory = await prisma.unscoped.category.create({
      data: {
        churchId: otherChurchId,
        name: 'Categoria de outra igreja',
        type: 'income',
        color: '#3B82F6',
      },
    });
    otherChurchCategoryId = otherCategory.id;

    const memberResponse = await request(app.getHttpServer())
      .post('/v1/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'João da Silva' })
      .expect(201);
    memberId = memberResponse.body.data.id as string;

    const ministryResponse = await request(app.getHttpServer())
      .post('/v1/ministries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Ministério de Louvor' })
      .expect(201);
    ministryId = ministryResponse.body.data.id as string;
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
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${authToken}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${authToken}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${authToken}`),
  };

  describe('POST /v1/transactions', () => {
    it('cria uma entrada com value positivo espelhando o sinal', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 500,
          date: '2026-07-01',
          categoryId: incomeCategoryId,
          description: 'Dízimo do mês',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        type: 'income',
        value: 500,
        description: 'Dízimo do mês',
        member: null,
        ministry: null,
      });
      expect(response.body.data.category).toMatchObject({
        id: incomeCategoryId,
        name: 'Dízimo',
        deleted: false,
      });
    });

    it('cria uma saída com value negativo espelhando o sinal', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'expense',
          value: 1200,
          date: '2026-07-05',
          categoryId: expenseCategoryId,
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        type: 'expense',
        value: -1200,
      });
    });

    it('cria vinculando member e ministry existentes', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 300,
          date: '2026-07-06',
          categoryId: incomeCategoryId,
          memberId,
          ministryId,
        })
        .expect(201);

      expect(response.body.data.member).toMatchObject({
        id: memberId,
        deleted: false,
      });
      expect(response.body.data.ministry).toMatchObject({
        id: ministryId,
        deleted: false,
      });
    });

    it('categoria de outro tipo → 422 CATEGORY_TYPE_MISMATCH', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: expenseCategoryId,
        })
        .expect(422);

      expect(response.body.error.code).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('categoria inexistente → 404 CATEGORY_NOT_FOUND', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(404);

      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('categoria de outra igreja → 404 (isolamento de tenant)', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: otherChurchCategoryId,
        })
        .expect(404);

      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('memberId inexistente → 404 MEMBER_NOT_FOUND', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: incomeCategoryId,
          memberId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(404);

      expect(response.body.error.code).toBe('MEMBER_NOT_FOUND');
    });

    it('ministryId inexistente → 404 MINISTRY_NOT_FOUND', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: incomeCategoryId,
          ministryId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(404);

      expect(response.body.error.code).toBe('MINISTRY_NOT_FOUND');
    });

    it('value zero ou negativo → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 0,
          date: '2026-07-01',
          categoryId: incomeCategoryId,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 100,
          date: '2026-07-01',
          categoryId: incomeCategoryId,
        })
        .expect(401);
    });
  });

  describe('GET /v1/transactions', () => {
    beforeAll(async () => {
      await authed.post('/v1/transactions').send({
        type: 'income',
        value: 700,
        date: '2026-06-10',
        categoryId: incomeCategoryId,
        description: 'Oferta especial',
      });
      await authed.post('/v1/transactions').send({
        type: 'expense',
        value: 200,
        date: '2026-06-15',
        categoryId: expenseCategoryId,
        description: 'Conta de luz',
      });
      await request(app.getHttpServer())
        .post('/v1/transactions')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          type: 'income',
          value: 999,
          date: '2026-06-10',
          categoryId: otherChurchCategoryId,
        });
    });

    it('lista paginada com meta e não vaza transação de outra igreja', async () => {
      const response = await authed.get('/v1/transactions').expect(200);

      expect(response.body.data.meta).toMatchObject({ page: 1, limit: 20 });
      const values = response.body.data.items.map(
        (t: { value: number }) => t.value,
      );
      expect(values).not.toContain(999);
    });

    it('filtra por type', async () => {
      const response = await authed
        .get('/v1/transactions?type=expense')
        .expect(200);

      const types = response.body.data.items.map(
        (t: { type: string }) => t.type,
      );
      expect(types.every((type: string) => type === 'expense')).toBe(true);
    });

    it('filtra por categoryId', async () => {
      const response = await authed
        .get(`/v1/transactions?categoryId=${incomeCategoryId}`)
        .expect(200);

      const categoryIds = response.body.data.items.map(
        (t: { category: { id: string } }) => t.category.id,
      );
      expect(categoryIds.every((id: string) => id === incomeCategoryId)).toBe(
        true,
      );
    });

    it('filtra por período (dateFrom/dateTo)', async () => {
      const response = await authed
        .get('/v1/transactions?dateFrom=2026-06-01&dateTo=2026-06-30')
        .expect(200);

      const descriptions = response.body.data.items.map(
        (t: { description: string }) => t.description,
      );
      expect(descriptions).toEqual(
        expect.arrayContaining(['Oferta especial', 'Conta de luz']),
      );
    });

    it('busca por descrição', async () => {
      const response = await authed
        .get('/v1/transactions?search=luz')
        .expect(200);

      const descriptions = response.body.data.items.map(
        (t: { description: string }) => t.description,
      );
      expect(descriptions).toEqual(['Conta de luz']);
    });
  });

  describe('fluxo GET/PATCH/DELETE por id', () => {
    let transactionId: string;

    beforeAll(async () => {
      const response = await authed.post('/v1/transactions').send({
        type: 'income',
        value: 400,
        date: '2026-07-10',
        categoryId: incomeCategoryId,
        memberId,
        description: 'Dízimo de teste',
      });
      transactionId = response.body.data.id as string;
    });

    it('GET /v1/transactions/:id retorna a transação com relações aninhadas', async () => {
      const response = await authed
        .get(`/v1/transactions/${transactionId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        description: 'Dízimo de teste',
        value: 400,
      });
      expect(response.body.data.member).toMatchObject({
        id: memberId,
        deleted: false,
      });
    });

    it('outra igreja não acessa a transação por id (404, não vazamento)', async () => {
      await request(app.getHttpServer())
        .get(`/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(404);
    });

    it('PATCH /v1/transactions/:id atualiza parcialmente sem exigir os demais campos', async () => {
      const response = await authed
        .patch(`/v1/transactions/${transactionId}`)
        .send({ description: 'Dízimo de teste (ajustado)' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        description: 'Dízimo de teste (ajustado)',
        value: 400,
      });
    });

    it('PATCH trocando para uma categoria de outro tipo → 422 CATEGORY_TYPE_MISMATCH', async () => {
      const response = await authed
        .patch(`/v1/transactions/${transactionId}`)
        .send({ categoryId: expenseCategoryId })
        .expect(422);

      expect(response.body.error.code).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('PATCH memberId: null remove o vínculo com o membro', async () => {
      const response = await authed
        .patch(`/v1/transactions/${transactionId}`)
        .send({ memberId: null })
        .expect(200);

      expect(response.body.data.member).toBeNull();
    });

    it('DELETE /v1/transactions/:id faz soft delete', async () => {
      await authed.delete(`/v1/transactions/${transactionId}`).expect(200);
      await authed.get(`/v1/transactions/${transactionId}`).expect(404);
    });

    it('id inexistente → 404 TRANSACTION_NOT_FOUND', async () => {
      const response = await authed
        .get('/v1/transactions/00000000-0000-0000-0000-000000000000')
        .expect(404);
      expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('vínculo com registro excluído', () => {
    it('mantém o nome do membro na transação e marca deleted: true quando ele é excluído', async () => {
      const memberResponse = await authed
        .post('/v1/members')
        .send({ name: 'Membro a Excluir' })
        .expect(201);
      const disposableMemberId = memberResponse.body.data.id as string;

      const transactionResponse = await authed
        .post('/v1/transactions')
        .send({
          type: 'income',
          value: 50,
          date: '2026-07-12',
          categoryId: incomeCategoryId,
          memberId: disposableMemberId,
        })
        .expect(201);
      const disposableTransactionId = transactionResponse.body.data
        .id as string;

      await authed.delete(`/v1/members/${disposableMemberId}`).expect(200);

      const response = await authed
        .get(`/v1/transactions/${disposableTransactionId}`)
        .expect(200);

      expect(response.body.data.member).toMatchObject({
        id: disposableMemberId,
        name: 'Membro a Excluir',
        deleted: true,
      });
    });
  });
});
