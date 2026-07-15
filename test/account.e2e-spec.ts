import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-account@teste.local';
const OTHER_EMAIL = 'e2e-account-outra-igreja@teste.local';
const DELETE_EMAIL = 'e2e-account-exclusao@teste.local';
const PASSWORD = 'senhaSegura123';

describe('Account (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  const cleanup = async () => {
    await prisma.unscoped.church.deleteMany({
      where: { email: { in: [EMAIL, OTHER_EMAIL, DELETE_EMAIL] } },
    });
  };

  const register = async (
    email: string,
    name = 'Igreja E2E Account',
  ): Promise<void> => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name, email, password: PASSWORD });
  };

  const login = async (email: string): Promise<string> => {
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

    await register(EMAIL);
    await register(OTHER_EMAIL, 'Outra Igreja E2E');
    authToken = await login(EMAIL);
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
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${authToken}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${authToken}`),
  };

  describe('GET /v1/account', () => {
    it('retorna o perfil da igreja autenticada, sem a senha', async () => {
      const response = await authed.get('/v1/account').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Igreja E2E Account',
        email: EMAIL,
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer()).get('/v1/account').expect(401);
    });
  });

  describe('PATCH /v1/account', () => {
    it('atualiza cnpj e denomination (só preenchíveis por aqui)', async () => {
      const response = await authed
        .patch('/v1/account')
        .send({ cnpj: '11.444.777/0001-61', denomination: 'Batista' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        cnpj: '11.444.777/0001-61',
        denomination: 'Batista',
      });
    });

    it('cnpj com dígito verificador inválido → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .patch('/v1/account')
        .send({ cnpj: '11.444.777/0001-00' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual({
        field: 'cnpj',
        message: 'CNPJ inválido.',
      });
    });

    it('e-mail já usado por outra igreja ativa → 409 EMAIL_ALREADY_IN_USE', async () => {
      const response = await authed
        .patch('/v1/account')
        .send({ email: OTHER_EMAIL })
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
    });

    it('sem token → 401', async () => {
      await request(app.getHttpServer())
        .patch('/v1/account')
        .send({ denomination: 'Batista' })
        .expect(401);
    });
  });

  describe('PATCH /v1/account/password', () => {
    it('senha atual incorreta → 401 INVALID_CREDENTIALS', async () => {
      const response = await authed
        .patch('/v1/account/password')
        .send({ currentPassword: 'senhaErrada', newPassword: 'novaSenha456' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('nova senha curta → 400 VALIDATION_ERROR', async () => {
      const response = await authed
        .patch('/v1/account/password')
        .send({ currentPassword: PASSWORD, newPassword: 'curta' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('senha atual correta → 200 e login passa a exigir a nova senha', async () => {
      const newPassword = 'novaSenhaSegura456';
      const response = await authed
        .patch('/v1/account/password')
        .send({ currentPassword: PASSWORD, newPassword })
        .expect(200);

      expect(response.body.data.message).toBe('Senha alterada com sucesso.');

      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(401);
      const relogin = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: newPassword })
        .expect(200);
      authToken = relogin.body.data.token as string;
    });
  });

  describe('DELETE /v1/account', () => {
    let deleteAuthToken: string;
    const deleteAuthed = () =>
      request(app.getHttpServer())
        .delete('/v1/account')
        .set('Authorization', `Bearer ${deleteAuthToken}`);

    beforeAll(async () => {
      await register(DELETE_EMAIL, 'Igreja E2E Exclusão');
      deleteAuthToken = await login(DELETE_EMAIL);
    });

    it('senha atual incorreta → 401 INVALID_CREDENTIALS', async () => {
      const response = await deleteAuthed()
        .send({ currentPassword: 'senhaErrada', confirmationPhrase: 'EXCLUIR' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('frase de confirmação incorreta → 400 VALIDATION_ERROR', async () => {
      const response = await deleteAuthed()
        .send({ currentPassword: PASSWORD, confirmationPhrase: 'errado' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual({
        field: 'confirmationPhrase',
        message: 'A frase de confirmação não corresponde.',
      });
    });

    it('exclui a conta e revoga o token imediatamente', async () => {
      const response = await deleteAuthed()
        .send({ currentPassword: PASSWORD, confirmationPhrase: 'EXCLUIR' })
        .expect(200);

      expect(response.body.data.message).toBe('Conta excluída com sucesso.');

      await request(app.getHttpServer())
        .get('/v1/account')
        .set('Authorization', `Bearer ${deleteAuthToken}`)
        .expect(401);
    });

    it('e-mail da conta excluída pode ser reutilizado no cadastro', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          name: 'Nova Igreja Mesmo E-mail',
          email: DELETE_EMAIL,
          password: PASSWORD,
        })
        .expect(201);
    });
  });
});
