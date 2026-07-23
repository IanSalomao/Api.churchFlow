import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-categories@teste.local';
const OTHER_EMAIL = 'e2e-categories-outra-igreja@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let otherAuthToken: string;

  const cleanup = async () => {
    await prisma.unscoped.category.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    // ministry também tem FK para church sem cascade — o registro cria os
    // ministérios padrão automaticamente, então precisam sair antes da igreja.
    await prisma.unscoped.ministry.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.church.deleteMany({
      where: { email: { in: [EMAIL, OTHER_EMAIL] } },
    });
  };

  const login = async (email: string): Promise<string> => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Igreja E2E Categories', email, password: PASSWORD });
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

  describe('POST /v1/categories', () => {
    it('cria uma categoria de entrada (income)', async () => {
      const response = await authed
        .post('/v1/categories')
        .send({ name: 'Dízimo', type: 'income', color: '#22C55E' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Dízimo',
        description: null,
        type: 'income',
        color: '#22C55E',
      });
      expect(response.body.data.id).toEqual(expect.any(String));
    });

    it('cria uma categoria de saída (expense) com descrição', async () => {
      const response = await authed
        .post('/v1/categories')
        .send({
          name: 'Aluguel',
          description: 'Aluguel do templo',
          type: 'expense',
          color: '#EF4444',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Aluguel',
        description: 'Aluguel do templo',
        type: 'expense',
        color: '#EF4444',
      });
    });

    it('nome ausente → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/categories')
        .send({ type: 'income', color: '#22C55E' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('type inválido → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/categories')
        .send({ name: 'Categoria X', type: 'invalido', color: '#22C55E' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('color fora do padrão hex → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/categories')
        .send({ name: 'Categoria Y', type: 'income', color: 'verde' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/categories')
        .send({ name: 'Sem Token', type: 'income', color: '#22C55E' })
        .expect(401);
    });
  });

  describe('GET /v1/categories', () => {
    beforeAll(async () => {
      await authed
        .post('/v1/categories')
        .send({ name: 'Oferta', type: 'income', color: '#22C55E' });
      await authed
        .post('/v1/categories')
        .send({ name: 'Manutenção', type: 'expense', color: '#EF4444' });
      await request(app.getHttpServer())
        .post('/v1/categories')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          name: 'Categoria Da Outra Igreja',
          type: 'income',
          color: '#000000',
        });
    });

    it('lista paginada com meta e não vaza categoria de outra igreja', async () => {
      const response = await authed.get('/v1/categories').expect(200);

      expect(response.body.data.meta).toMatchObject({ page: 1, limit: 20 });
      const names = response.body.data.items.map(
        (c: { name: string }) => c.name,
      );
      expect(names).toContain('Oferta');
      expect(names).toContain('Manutenção');
      expect(names).not.toContain('Categoria Da Outra Igreja');
    });

    it('filtra por type=income', async () => {
      const response = await authed
        .get('/v1/categories?type=income')
        .expect(200);

      const items = response.body.data.items as {
        name: string;
        type: string;
      }[];
      expect(items.every((c) => c.type === 'income')).toBe(true);
      expect(items.map((c) => c.name)).toContain('Oferta');
    });

    it('filtra por type=expense', async () => {
      const response = await authed
        .get('/v1/categories?type=expense')
        .expect(200);

      const items = response.body.data.items as {
        name: string;
        type: string;
      }[];
      expect(items.every((c) => c.type === 'expense')).toBe(true);
      expect(items.map((c) => c.name)).toContain('Manutenção');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer()).get('/v1/categories').expect(401);
    });
  });

  describe('fluxo PATCH/DELETE por id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await authed
        .post('/v1/categories')
        .send({ name: 'Dízimo Mensal', type: 'income', color: '#22C55E' });
      categoryId = response.body.data.id as string;
    });

    it('PATCH /v1/categories/:id atualiza parcialmente sem exigir name', async () => {
      const response = await authed
        .patch(`/v1/categories/${categoryId}`)
        .send({ color: '#16A34A' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Dízimo Mensal',
        type: 'income',
        color: '#16A34A',
      });
    });

    it('PATCH com type → 422 CATEGORY_TYPE_IMMUTABLE', async () => {
      const response = await authed
        .patch(`/v1/categories/${categoryId}`)
        .send({ type: 'expense' })
        .expect(422);

      expect(response.body.error.code).toBe('CATEGORY_TYPE_IMMUTABLE');
    });

    it('PATCH em categoria de outra igreja → 404 (isolamento de tenant)', async () => {
      await request(app.getHttpServer())
        .patch(`/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ color: '#000000' })
        .expect(404);
    });

    it('PATCH em id inexistente → 404 RESOURCE_NOT_FOUND', async () => {
      const response = await authed
        .patch('/v1/categories/00000000-0000-0000-0000-000000000000')
        .send({ color: '#000000' })
        .expect(404);

      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('DELETE /v1/categories/:id faz soft delete e some da listagem', async () => {
      await authed.delete(`/v1/categories/${categoryId}`).expect(200);

      const response = await authed.get('/v1/categories').expect(200);
      const names = response.body.data.items.map(
        (c: { name: string }) => c.name,
      );
      expect(names).not.toContain('Dízimo Mensal');
    });

    it('DELETE em id inexistente → 404 RESOURCE_NOT_FOUND', async () => {
      const response = await authed
        .delete('/v1/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
