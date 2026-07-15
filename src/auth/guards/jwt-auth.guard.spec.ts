import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: { unscoped: { church: { findFirst: jest.Mock } } };
  let tenantContext: { setChurchId: jest.Mock };
  let request: { headers: Record<string, string>; churchId?: string };

  const contextFor = (req: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwtService = { verifyAsync: jest.fn() };
    prisma = { unscoped: { church: { findFirst: jest.fn() } } };
    tenantContext = { setChurchId: jest.fn() };
    request = { headers: {} };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      prisma as unknown as PrismaService,
      tenantContext as unknown as TenantContext,
      reflector as unknown as Reflector,
    );
  });

  it('libera rota @Public sem validar token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('401 UNAUTHORIZED sem header Authorization', async () => {
    const promise = guard.canActivate(contextFor(request));
    await expect(promise).rejects.toBeInstanceOf(AppException);
    await expect(promise).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('401 TOKEN_EXPIRED quando o JWT expirou', async () => {
    request.headers.authorization = 'Bearer token-expirado';
    jwtService.verifyAsync.mockRejectedValue(
      new TokenExpiredError('jwt expired', new Date()),
    );
    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
      status: 401,
    });
  });

  it('401 UNAUTHORIZED para token inválido', async () => {
    request.headers.authorization = 'Bearer token-invalido';
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('401 quando a igreja foi excluída (revogação imediata)', async () => {
    request.headers.authorization = 'Bearer token-valido';
    jwtService.verifyAsync.mockResolvedValue({ sub: 'igreja-1' });
    prisma.unscoped.church.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(prisma.unscoped.church.findFirst).toHaveBeenCalledWith({
      where: { id: 'igreja-1', deletedAt: null },
      select: { id: true },
    });
    expect(tenantContext.setChurchId).not.toHaveBeenCalled();
  });

  it('sucesso: popula request.churchId e o TenantContext', async () => {
    request.headers.authorization = 'Bearer token-valido';
    jwtService.verifyAsync.mockResolvedValue({ sub: 'igreja-1' });
    prisma.unscoped.church.findFirst.mockResolvedValue({ id: 'igreja-1' });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.churchId).toBe('igreja-1');
    expect(tenantContext.setChurchId).toHaveBeenCalledWith('igreja-1');
  });
});
