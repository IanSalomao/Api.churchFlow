import { scopeArgs, TENANTED_MODELS } from './tenant.extension';

const CHURCH_ID = 'igreja-1';

describe('scopeArgs', () => {
  it('injeta churchId no where de findMany preservando filtros do caller', () => {
    const result = scopeArgs(
      'findMany',
      { where: { name: 'Dízimo' } },
      CHURCH_ID,
    );
    expect(result.where).toEqual({ name: 'Dízimo', churchId: CHURCH_ID });
  });

  it('injeta churchId também em where unique (findUnique por PK)', () => {
    const result = scopeArgs('findUnique', { where: { id: 'abc' } }, CHURCH_ID);
    expect(result.where).toEqual({ id: 'abc', churchId: CHURCH_ID });
  });

  it('lida com args ausentes (count sem where)', () => {
    const result = scopeArgs('count', undefined, CHURCH_ID);
    expect(result.where).toEqual({ churchId: CHURCH_ID });
  });

  it('sobrescreve churchId passado pelo caller no where', () => {
    const result = scopeArgs(
      'findMany',
      { where: { churchId: 'outra-igreja' } },
      CHURCH_ID,
    );
    expect(result.where.churchId).toBe(CHURCH_ID);
  });

  it('em update, escopa o where e remove churchId/church do data', () => {
    const result = scopeArgs(
      'update',
      {
        where: { id: 'abc' },
        data: { name: 'Novo', churchId: 'outra', church: {} },
      },
      CHURCH_ID,
    );
    expect(result.where).toEqual({ id: 'abc', churchId: CHURCH_ID });
    expect(result.data).toEqual({ name: 'Novo' });
  });

  it('em create, força o churchId do contexto no data', () => {
    const result = scopeArgs(
      'create',
      { data: { name: 'Membro', churchId: 'outra-igreja' } },
      CHURCH_ID,
    );
    expect(result.data).toEqual({ name: 'Membro', churchId: CHURCH_ID });
  });

  it('em createMany com array, força o churchId em cada item', () => {
    const result = scopeArgs(
      'createMany',
      { data: [{ name: 'A' }, { name: 'B', churchId: 'outra' }] },
      CHURCH_ID,
    );
    expect(result.data).toEqual([
      { name: 'A', churchId: CHURCH_ID },
      { name: 'B', churchId: CHURCH_ID },
    ]);
  });

  it('em upsert, escopa where e create, e limpa o update', () => {
    const result = scopeArgs(
      'upsert',
      {
        where: { id: 'abc' },
        create: { name: 'Novo' },
        update: { name: 'Editado', churchId: 'outra' },
      },
      CHURCH_ID,
    );
    expect(result.where).toEqual({ id: 'abc', churchId: CHURCH_ID });
    expect(result.create).toEqual({ name: 'Novo', churchId: CHURCH_ID });
    expect(result.update).toEqual({ name: 'Editado' });
  });

  it('lança em operação não mapeada (fail-closed)', () => {
    expect(() => scopeArgs('operacaoFutura', {}, CHURCH_ID)).toThrow(
      /não mapeada/,
    );
  });
});

describe('TENANTED_MODELS', () => {
  it('cobre todos os modelos com churchId, incluindo PasswordResetToken', () => {
    expect([...TENANTED_MODELS].sort()).toEqual(
      [
        'Category',
        'Member',
        'Ministry',
        'PasswordResetToken',
        'Report',
        'Transaction',
      ].sort(),
    );
  });
});
