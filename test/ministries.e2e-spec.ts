import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-ministries@teste.local';
const OTHER_EMAIL = 'e2e-ministries-outra-igreja@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Ministries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let otherAuthToken: string;
  let responsibleId: string;
  let otherResponsibleId: string;

  const cleanup = async () => {
    await prisma.unscoped.ministry.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.member.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    // category também tem FK para church sem cascade — o registro cria as
    // categorias padrão automaticamente, então precisam sair antes da igreja.
    await prisma.unscoped.category.deleteMany({
      where: { church: { email: { in: [EMAIL, OTHER_EMAIL] } } },
    });
    await prisma.unscoped.church.deleteMany({
      where: { email: { in: [EMAIL, OTHER_EMAIL] } },
    });
  };

  const login = async (email: string): Promise<string> => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Igreja E2E Ministries', email, password: PASSWORD });
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return response.body.data.token as string;
  };

  const createMember = async (token: string, name: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/v1/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);
    return response.body.data.id as string;
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
    responsibleId = await createMember(authToken, 'Responsável Principal');
    otherResponsibleId = await createMember(
      otherAuthToken,
      'Responsável Outra Igreja',
    );
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

  describe('POST /v1/ministries', () => {
    it('cria um ministério só com o nome (demais campos opcionais)', async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({ name: 'Ministério de Louvor' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Ministério de Louvor',
      });
      expect(response.body.data.id).toEqual(expect.any(String));
    });

    it('nome ausente → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({ description: 'Sem nome' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/ministries')
        .send({ name: 'Sem Token' })
        .expect(401);
    });

    it('cria com responsibleId válido (membro existente)', async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({ name: 'Ministério Infantil', responsibleId })
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Ministério Infantil',
        responsibleId,
      });
    });

    it('responsibleId inexistente → 404 MINISTRY_RESPONSIBLE_NOT_FOUND', async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({
          name: 'Ministério Sem Responsável Válido',
          responsibleId: '11111111-1111-4111-8111-111111111111',
        })
        .expect(404);

      expect(response.body.error.code).toBe('MINISTRY_RESPONSIBLE_NOT_FOUND');
    });

    it('responsibleId de membro de outra igreja → 404 (isolamento de tenant)', async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({
          name: 'Ministério Com Responsável Alheio',
          responsibleId: otherResponsibleId,
        })
        .expect(404);

      expect(response.body.error.code).toBe('MINISTRY_RESPONSIBLE_NOT_FOUND');
    });
  });

  describe('GET /v1/ministries', () => {
    beforeAll(async () => {
      await authed
        .post('/v1/ministries')
        .send({ name: 'Ministério de Casais' });
      await request(app.getHttpServer())
        .post('/v1/ministries')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ name: 'Ministério Da Outra Igreja' });
    });

    it('lista paginada com meta e não vaza ministério de outra igreja', async () => {
      const response = await authed.get('/v1/ministries').expect(200);

      expect(response.body.data.meta).toMatchObject({ page: 1, limit: 20 });
      const names = response.body.data.items.map(
        (m: { name: string }) => m.name,
      );
      expect(names).toContain('Ministério de Casais');
      expect(names).not.toContain('Ministério Da Outra Igreja');
    });

    it('busca por nome filtra a listagem', async () => {
      const response = await authed
        .get('/v1/ministries?search=casais')
        .expect(200);

      const names = response.body.data.items.map(
        (m: { name: string }) => m.name,
      );
      expect(names).toEqual(['Ministério de Casais']);
    });
  });

  describe('fluxo GET/PATCH/DELETE por id', () => {
    let ministryId: string;

    beforeAll(async () => {
      const response = await authed
        .post('/v1/ministries')
        .send({ name: 'Ministério de Mídia', description: 'Áudio e vídeo' });
      ministryId = response.body.data.id as string;
    });

    it('GET /v1/ministries/:id retorna o ministério', async () => {
      const response = await authed
        .get(`/v1/ministries/${ministryId}`)
        .expect(200);
      expect(response.body.data).toMatchObject({ name: 'Ministério de Mídia' });
    });

    it('outra igreja não acessa o ministério por id (404, não vazamento)', async () => {
      await request(app.getHttpServer())
        .get(`/v1/ministries/${ministryId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(404);
    });

    it('PATCH /v1/ministries/:id atualiza parcialmente sem exigir name', async () => {
      const response = await authed
        .patch(`/v1/ministries/${ministryId}`)
        .send({ description: 'Áudio, vídeo e transmissão' })
        .expect(200);
      expect(response.body.data).toMatchObject({
        name: 'Ministério de Mídia',
        description: 'Áudio, vídeo e transmissão',
      });
    });

    it('PATCH com responsibleId inexistente → 404 MINISTRY_RESPONSIBLE_NOT_FOUND', async () => {
      const response = await authed
        .patch(`/v1/ministries/${ministryId}`)
        .send({ responsibleId: '11111111-1111-4111-8111-111111111111' })
        .expect(404);
      expect(response.body.error.code).toBe('MINISTRY_RESPONSIBLE_NOT_FOUND');
    });

    it('DELETE /v1/ministries/:id faz soft delete', async () => {
      await authed.delete(`/v1/ministries/${ministryId}`).expect(200);
      await authed.get(`/v1/ministries/${ministryId}`).expect(404);
    });

    it('id inexistente → 404 MINISTRY_NOT_FOUND', async () => {
      const response = await authed
        .get('/v1/ministries/00000000-0000-0000-0000-000000000000')
        .expect(404);
      expect(response.body.error.code).toBe('MINISTRY_NOT_FOUND');
    });
  });
});
