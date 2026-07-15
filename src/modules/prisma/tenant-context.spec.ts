import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  let context: TenantContext;

  beforeEach(() => {
    context = new TenantContext();
  });

  it('retorna undefined fora de um contexto', () => {
    expect(context.churchId).toBeUndefined();
  });

  it('expõe o churchId setado dentro de um run', () => {
    context.run({}, () => {
      context.setChurchId('igreja-1');
      expect(context.churchId).toBe('igreja-1');
    });
  });

  it('não vaza o churchId para fora do run', () => {
    context.run({}, () => context.setChurchId('igreja-1'));
    expect(context.churchId).toBeUndefined();
  });

  it('mantém o contexto através de awaits (fluxo async)', async () => {
    await context.run({ churchId: 'igreja-1' }, async () => {
      await Promise.resolve();
      expect(context.churchId).toBe('igreja-1');
    });
  });

  it('isola contextos concorrentes', async () => {
    await Promise.all([
      context.run({ churchId: 'igreja-a' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(context.churchId).toBe('igreja-a');
      }),
      context.run({ churchId: 'igreja-b' }, async () => {
        await Promise.resolve();
        expect(context.churchId).toBe('igreja-b');
      }),
    ]);
  });

  it('setChurchId fora de contexto lança (middleware ausente)', () => {
    expect(() => context.setChurchId('igreja-1')).toThrow(
      /fora de um contexto/,
    );
  });
});
