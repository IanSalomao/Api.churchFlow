import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-members@teste.local';
const OTHER_EMAIL = 'e2e-members-outra-igreja@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Members (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let otherAuthToken: string;

  const cleanup = async () => {
    await prisma.unscoped.member.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    // category/ministry têm FK para church sem cascade — o registro cria os
    // defaults automaticamente, então precisam sair antes da igreja.
    await prisma.unscoped.category.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
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
      .send({ name: 'Igreja E2E Members', email, password: PASSWORD });
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

  describe('POST /v1/members', () => {
    it('cria um membro só com o nome (demais campos opcionais)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'João da Silva' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({ name: 'João da Silva' });
      expect(response.body.data.id).toEqual(expect.any(String));
    });

    it('nome ausente → 400 VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'sem-nome@teste.local' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/members')
        .send({ name: 'Sem Token' })
        .expect(401);
    });

    it('cria com birthDate e baptismDate válidos', async () => {
      const response = await authed
        .post('/v1/members')
        .send({
          name: 'Ana Paula',
          birthDate: '1990-05-20',
          baptismDate: '2010-12-01',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({ name: 'Ana Paula' });
      expect(new Date(response.body.data.birthDate).toISOString()).toContain(
        '1990-05-20',
      );
      expect(new Date(response.body.data.baptismDate).toISOString()).toContain(
        '2010-12-01',
      );
    });

    it('birthDate posterior a baptismDate → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/members')
        .send({
          name: 'Data Inválida',
          birthDate: '2015-01-01',
          baptismDate: '2010-12-01',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /v1/members', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Maria Souza' });
      await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ name: 'Membro Da Outra Igreja' });
    });

    it('lista paginada com meta e não vaza membro de outra igreja', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.meta).toMatchObject({ page: 1, limit: 20 });
      const names = response.body.data.items.map(
        (m: { name: string }) => m.name,
      );
      expect(names).toContain('Maria Souza');
      expect(names).not.toContain('Membro Da Outra Igreja');
    });

    it('busca por nome filtra a listagem', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/members?search=maria')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const names = response.body.data.items.map(
        (m: { name: string }) => m.name,
      );
      expect(names).toEqual(['Maria Souza']);
    });
  });

  describe('fluxo GET/PATCH/DELETE por id', () => {
    let memberId: string;

    beforeAll(async () => {
      const response = await authed
        .post('/v1/members')
        .send({ name: 'Pedro Almeida' });
      memberId = response.body.data.id as string;
    });

    it('GET /v1/members/:id retorna o membro', async () => {
      const response = await authed.get(`/v1/members/${memberId}`).expect(200);
      expect(response.body.data).toMatchObject({ name: 'Pedro Almeida' });
    });

    it('outra igreja não acessa o membro por id (404, não vazamento)', async () => {
      await request(app.getHttpServer())
        .get(`/v1/members/${memberId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(404);
    });

    it('PATCH /v1/members/:id atualiza os dados', async () => {
      const response = await authed
        .patch(`/v1/members/${memberId}`)
        .send({ phone: '(11) 98888-0000' })
        .expect(200);
      expect(response.body.data).toMatchObject({
        name: 'Pedro Almeida',
        phone: '(11) 98888-0000',
      });
    });

    it('DELETE /v1/members/:id faz soft delete', async () => {
      await authed.delete(`/v1/members/${memberId}`).expect(200);
      await authed.get(`/v1/members/${memberId}`).expect(404);
    });

    it('id inexistente → 404 MEMBER_NOT_FOUND', async () => {
      const response = await authed
        .get('/v1/members/00000000-0000-0000-0000-000000000000')
        .expect(404);
      expect(response.body.error.code).toBe('MEMBER_NOT_FOUND');
    });
  });
});
