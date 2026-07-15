/*
 * Este arquivo manipula os args dinâmicos das queries do Prisma (tipados como
 * `any` pela própria API de extensions), então as regras no-unsafe-* não se
 * aplicam de forma útil aqui — o contrato real é validado pelos testes de
 * scopeArgs e pelo próprio client em runtime.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Prisma, PrismaClient } from '../../../generated/prisma/client';
import { TenantContext } from './tenant-context';

/**
 * Modelos escopados por churchId. PasswordResetToken está na lista de
 * propósito: qualquer acesso via client escopado sem contexto falha alto;
 * o fluxo de reset (sem tenant) usa `prisma.unscoped` explicitamente.
 * Church fica de fora — ele É o tenant (não tem coluna churchId).
 *
 * Limitações conhecidas (revisão manual obrigatória nesses casos):
 * - $queryRaw/$executeRaw não passam por query extensions;
 * - escritas/leituras aninhadas via relação não são re-interceptadas por
 *   modelo aninhado (as rows top-level são escopadas e toda escrita força o
 *   churchId do contexto, então as FKs apontam para dentro do tenant).
 */
export const TENANTED_MODELS: ReadonlySet<Prisma.ModelName> =
  new Set<Prisma.ModelName>([
    'Member',
    'Ministry',
    'Category',
    'Transaction',
    'Report',
    'PasswordResetToken',
  ]);

// Remove churchId/relação church vindos do caller — o valor é sempre o do contexto.
function stripTenantFields(data: any): any {
  if (!data) return data;
  const rest = { ...data };
  delete rest.church;
  delete rest.churchId;
  return rest;
}

function withTenantData(data: any, churchId: string): any {
  return { ...stripTenantFields(data ?? {}), churchId };
}

/** Pura e exportada para teste unitário sem client. */
export function scopeArgs(operation: string, args: any, churchId: string): any {
  const scoped = { ...(args ?? {}) };
  switch (operation) {
    case 'findUnique':
    case 'findUniqueOrThrow':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'delete':
    case 'deleteMany':
      // Merge também nos where unique (extendedWhereUnique): acesso
      // cross-tenant por PK vira not-found, a semântica correta de 404.
      scoped.where = { ...scoped.where, churchId };
      break;
    case 'update':
    case 'updateMany':
    case 'updateManyAndReturn':
      scoped.where = { ...scoped.where, churchId };
      scoped.data = stripTenantFields(scoped.data);
      break;
    case 'create':
      scoped.data = withTenantData(scoped.data, churchId);
      break;
    case 'createMany':
    case 'createManyAndReturn':
      scoped.data = Array.isArray(scoped.data)
        ? scoped.data.map((item: any) => withTenantData(item, churchId))
        : withTenantData(scoped.data, churchId);
      break;
    case 'upsert':
      scoped.where = { ...scoped.where, churchId };
      scoped.create = withTenantData(scoped.create, churchId);
      scoped.update = stripTenantFields(scoped.update);
      break;
    default:
      throw new Error(
        `Tenant extension: operação "${operation}" não mapeada — bloqueada por segurança`,
      );
  }
  return scoped;
}

export function createTenantExtension(tenantContext: TenantContext) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!TENANTED_MODELS.has(model)) {
            return query(args);
          }
          const churchId = tenantContext.churchId;
          if (!churchId) {
            // Fail-closed: rota sem auth tocando modelo com tenant é bug,
            // não deve virar query sem filtro.
            throw new Error(
              `Acesso ao modelo com tenant "${model}" (${operation}) sem churchId no contexto. ` +
                'Rota sem autenticação deve usar prisma.unscoped.',
            );
          }
          return query(scopeArgs(operation, args, churchId));
        },
      },
    },
  });
}

export function extendWithTenant(
  client: PrismaClient,
  tenantContext: TenantContext,
) {
  return client.$extends(createTenantExtension(tenantContext));
}

export type TenantClient = ReturnType<typeof extendWithTenant>;
