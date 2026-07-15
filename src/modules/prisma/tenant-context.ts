import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  churchId?: string;
}

/**
 * Contexto de tenant por request, baseado em AsyncLocalStorage.
 *
 * O store (vazio) é criado pelo TenantContextMiddleware no início de cada
 * request; o JwtAuthGuard preenche o churchId após validar o token. Fora do
 * ciclo HTTP (seeds, jobs), use `run({ churchId }, fn)` explicitamente.
 */
@Injectable()
export class TenantContext {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  setChurchId(churchId: string): void {
    const store = this.als.getStore();
    if (!store) {
      throw new Error(
        'setChurchId chamado fora de um contexto de tenant (TenantContextMiddleware ausente?)',
      );
    }
    store.churchId = churchId;
  }

  get churchId(): string | undefined {
    return this.als.getStore()?.churchId;
  }
}
