import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Injeta o churchId autenticado (populado pelo JwtAuthGuard) no handler. */
export const CurrentChurch = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{ churchId?: string }>();
    if (!request.churchId) {
      throw new Error(
        '@CurrentChurch usado em rota sem autenticação (guard ausente ou rota @Public)',
      );
    }
    return request.churchId;
  },
);
