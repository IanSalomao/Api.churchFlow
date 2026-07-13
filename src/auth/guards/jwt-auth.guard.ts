import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { churchId?: string }>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new AppException(
        'UNAUTHORIZED',
        'Token de autenticação ausente.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppException(
          'TOKEN_EXPIRED',
          'Sessão expirada. Faça login novamente.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new AppException(
        'UNAUTHORIZED',
        'Token de autenticação inválido.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Revogação imediata: conta excluída (soft delete) derruba o token na
    // hora, mesmo ele sendo criptograficamente válido por até 30 dias.
    const church = await this.prisma.unscoped.church.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!church) {
      throw new AppException(
        'UNAUTHORIZED',
        'Conta inexistente ou desativada.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Elo com a tenant extension: daqui em diante toda query em modelo com
    // tenant é escopada por este churchId automaticamente.
    request.churchId = church.id;
    this.tenantContext.setChurchId(church.id);
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
