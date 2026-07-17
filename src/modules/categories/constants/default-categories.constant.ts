import { TransactionType } from '../../../../generated/prisma/client';

/**
 * Categorias criadas automaticamente para toda igreja nova no cadastro
 * (ver AuthService.register). Cor é obrigatória no schema — a igreja pode
 * editá-la depois, quando o CRUD de categories existir.
 */
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: TransactionType;
  color: string;
}> = [
  { name: 'Dízimos', type: TransactionType.income, color: '#16A34A' },
  { name: 'Ofertas', type: TransactionType.income, color: '#22C55E' },
  {
    name: 'Ofertas missionárias',
    type: TransactionType.income,
    color: '#0D9488',
  },
  { name: 'Outros', type: TransactionType.income, color: '#94A3B8' },
  { name: 'Contas fixas', type: TransactionType.expense, color: '#DC2626' },
  { name: 'Salários', type: TransactionType.expense, color: '#EA580C' },
  {
    name: 'Aquisição de bens',
    type: TransactionType.expense,
    color: '#CA8A04',
  },
  {
    name: 'Obras e manutenções',
    type: TransactionType.expense,
    color: '#92400E',
  },
  { name: 'Outros', type: TransactionType.expense, color: '#94A3B8' },
];
