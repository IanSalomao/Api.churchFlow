import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { TenantContext } from './tenant-context';
import { extendWithTenant, type TenantClient } from './tenant.extension';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** Client cru, SEM escopo de tenant — uso restrito: auth, churches, seeds. */
  readonly unscoped: PrismaClient;
  /** Client escopado por churchId do contexto — padrão nos módulos de feature. */
  readonly tenant: TenantClient;

  constructor(config: ConfigService, tenantContext: TenantContext) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    this.unscoped = new PrismaClient({ adapter });
    this.tenant = extendWithTenant(this.unscoped, tenantContext);
  }

  async onModuleInit(): Promise<void> {
    await this.unscoped.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.unscoped.$disconnect();
  }
}
