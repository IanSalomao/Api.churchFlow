export const DASHBOARD_PERIODS = [
  'currentMonth',
  'last3Months',
  'last6Months',
  'last12Months',
  'currentYear',
  'custom',
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_TRANSACTION_TYPE_FILTERS = [
  'all',
  'income',
  'expense',
] as const;

export type DashboardTransactionTypeFilter =
  (typeof DASHBOARD_TRANSACTION_TYPE_FILTERS)[number];
