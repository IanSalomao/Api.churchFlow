import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';

/**
 * Cria um store de tenant vazio para cada request. Middleware roda antes dos
 * guards no pipeline do Nest, então o JwtAuthGuard só precisa mutar o store.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenantContext.run({}, () => next());
  }
}
