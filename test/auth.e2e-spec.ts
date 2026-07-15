import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/modules/mail/mail.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const EMAIL = 'e2e-auth@teste.local';
const PASSWORD = 'senhaSegura123';
const NEW_PASSWORD = 'novaSenha456';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  // Mock do MailService: o e2e valida o fluxo, não a entrega pelo Resend —
  // e captura o token de recuperação enviado "por e-mail".
  const mailMock = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
  const lastResetToken = (): string =>
    mailMock.sendPasswordReset.mock.calls.at(-1)?.[1] as string;

  const cleanup = async () => {
    await prisma.unscoped.passwordResetToken.deleteMany({
      where: { church: { email: EMAIL } },
    });
    await prisma.unscoped.church.deleteMany({ where: { email: EMAIL } });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('POST /v1/auth/register', () => {
    it('cria a conta e retorna token + igreja no envelope (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Igreja E2E', email: EMAIL, password: PASSWORD })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.church).toMatchObject({
        name: 'Igreja E2E',
        email: EMAIL,
      });
      expect(response.body.data.church.password).toBeUndefined();
    });

    it('e-mail duplicado → 409 EMAIL_ALREADY_IN_USE', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Outra Igreja', email: EMAIL, password: PASSWORD })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: { code: 'EMAIL_ALREADY_IN_USE' },
      });
    });

    it('senha curta → 400 VALIDATION_ERROR com details por campo', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Igreja', email: 'x@teste.local', password: 'curta' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual({
        field: 'password',
        message: 'A senha deve ter no mínimo 8 caracteres.',
      });
    });
  });

  describe('POST /v1/auth/login', () => {
    it('credenciais válidas → 200 com token e expiresAt', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.token).toBe('string');
      expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
      authToken = response.body.data.token;
    });

    it('rememberMe estende a expiração (30d > 24h)', async () => {
      const short = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
      const long = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD, rememberMe: true })
        .expect(200);

      expect(new Date(long.body.data.expiresAt).getTime()).toBeGreaterThan(
        new Date(short.body.data.expiresAt).getTime(),
      );
    });

    it('senha errada → 401 INVALID_CREDENTIALS', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: 'senhaErrada' })
        .expect(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('e-mail inexistente → mesma resposta 401 genérica', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'ninguem@teste.local', password: PASSWORD })
        .expect(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('rota protegida (guard global)', () => {
    it('sem token → 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1')
        .expect(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('token inválido → 401', async () => {
      await request(app.getHttpServer())
        .get('/v1')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });

    it('token válido → 200 com envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body).toEqual({ success: true, data: 'Hello World!' });
    });
  });

  describe('recuperação de senha', () => {
    it('forgot-password responde 200 genérico e envia o e-mail', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      expect(response.body.data.message).toMatch(
        /Se o e-mail informado existir/,
      );
      expect(mailMock.sendPasswordReset).toHaveBeenCalledWith(
        EMAIL,
        expect.stringMatching(/^[0-9a-f]{64}$/),
      );
    });

    it('e-mail inexistente → mesma resposta 200, sem envio', async () => {
      const sends = mailMock.sendPasswordReset.mock.calls.length;
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'ninguem@teste.local' })
        .expect(200);

      expect(response.body.data.message).toMatch(
        /Se o e-mail informado existir/,
      );
      expect(mailMock.sendPasswordReset).toHaveBeenCalledTimes(sends);
    });

    it('novo pedido invalida o token anterior (nunca há dois válidos)', async () => {
      const firstToken = lastResetToken();
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token: firstToken, newPassword: NEW_PASSWORD })
        .expect(400);
      expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('reset com token válido troca a senha; token não é reutilizável', async () => {
      const token = lastResetToken();
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      // senha nova funciona, antiga não
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: NEW_PASSWORD })
        .expect(200);
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(401);

      // uso único: repetir o mesmo token falha
      const reuse = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token, newPassword: 'maisOutraSenha789' })
        .expect(400);
      expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('token inexistente → 400 INVALID_OR_EXPIRED_TOKEN', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token: 'deadbeef', newPassword: NEW_PASSWORD })
        .expect(400);
    });
  });
});
