import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardComparisonQueryDto } from './dto/dashboard-comparison-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  DashboardComparisonGroupBy,
  DashboardPeriod,
} from './dto/dashboard-query.constants';

const MONTHS_BACK_BY_PERIOD: Partial<Record<DashboardPeriod, number>> = {
  currentMonth: 0,
  last3Months: 2,
  last6Months: 5,
  last12Months: 11,
};

const MONTHLY_GRANULARITY_THRESHOLD_DAYS = 31;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const MONTH_ABBREVIATIONS_PT_BR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

type PeriodRange = { from: Date; to: Date };

type PeriodFilterQuery = {
  period: DashboardPeriod;
  dateFrom?: string;
  dateTo?: string;
};

type LineRow = {
  date: Date;
  value: Prisma.Decimal | number;
  type: TransactionType;
};

type ComparisonRow = {
  date: Date;
  value: Prisma.Decimal | number;
  type: TransactionType;
};

type ComparisonBucketDef = { key: string; periodStart: Date };

type CategoryRow = {
  value: Prisma.Decimal | number;
  type: TransactionType;
  category: { id: string; name: string; color: string };
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: DashboardQueryDto) {
    const baseWhere = this.buildBaseWhere(query);
    const periodWhere = this.buildPeriodWhere(query, baseWhere);

    const [allTimeRows, periodRows, membersCount, ministriesCount] =
      await this.prisma.tenant.$transaction([
        this.prisma.tenant.transaction.findMany({
          where: baseWhere,
          select: { value: true },
        }),
        this.prisma.tenant.transaction.findMany({
          where: periodWhere,
          select: { value: true, type: true },
        }),
        this.prisma.tenant.member.count({ where: { deletedAt: null } }),
        this.prisma.tenant.ministry.count({ where: { deletedAt: null } }),
      ]);

    const balance = allTimeRows.reduce(
      (sum, row) => sum + Number(row.value),
      0,
    );
    const transactionsCount = allTimeRows.length;
    const averageTicket =
      transactionsCount > 0
        ? allTimeRows.reduce(
            (sum, row) => sum + Math.abs(Number(row.value)),
            0,
          ) / transactionsCount
        : 0;

    const income = periodRows
      .filter((row) => row.type === TransactionType.income)
      .reduce((sum, row) => sum + Number(row.value), 0);
    const expense = Math.abs(
      periodRows
        .filter((row) => row.type === TransactionType.expense)
        .reduce((sum, row) => sum + Number(row.value), 0),
    );

    return {
      balance: round2(balance),
      income: round2(income),
      expense: round2(expense),
      periodBalance: round2(income - expense),
      membersCount,
      transactionsCount,
      ministriesCount,
      averageTicket: round2(averageTicket),
    };
  }

  async getCharts(query: DashboardQueryDto) {
    const baseWhere = this.buildBaseWhere(query);
    const { from, to } = this.getPeriodRange(query);
    const where: Prisma.TransactionWhereInput = {
      ...baseWhere,
      date: { gte: from, lte: to },
    };

    const rows = await this.prisma.tenant.transaction.findMany({
      where,
      select: {
        date: true,
        value: true,
        type: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'asc' },
    });

    const monthly = this.isMonthlyGranularity(from, to);

    return {
      line: this.buildLineSeries(rows, monthly, from, to),
      incomeByCategory: this.buildCategoryBreakdown(
        rows,
        TransactionType.income,
      ),
      expenseByCategory: this.buildCategoryBreakdown(
        rows,
        TransactionType.expense,
      ),
    };
  }

  async getComparison(query: DashboardComparisonQueryDto) {
    const { from, to } = this.getPeriodRange(query);
    const where: Prisma.TransactionWhereInput = {
      ...this.buildComparisonWhere(query),
      date: { gte: from, lte: to },
    };

    const rows = await this.prisma.tenant.transaction.findMany({
      where,
      select: { date: true, value: true, type: true },
    });

    const buckets = this.buildComparisonSeries(rows, query.groupBy, from, to);

    return {
      groupBy: query.groupBy,
      buckets,
      comparison: this.buildComparisonStats(buckets),
    };
  }

  private buildComparisonWhere(
    query: DashboardComparisonQueryDto,
  ): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      ...(query.categoryIds?.length && {
        categoryId: { in: query.categoryIds },
      }),
      ...(query.ministryId && { ministryId: query.ministryId }),
    };
  }

  private buildComparisonBucketDefs(
    from: Date,
    to: Date,
    groupBy: DashboardComparisonGroupBy,
  ): ComparisonBucketDef[] {
    const defs: ComparisonBucketDef[] = [];

    if (groupBy === 'month') {
      const cursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
      );
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      while (cursor.getTime() <= end.getTime()) {
        defs.push({
          key: cursor.toISOString().slice(0, 10),
          periodStart: new Date(cursor),
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return defs;
    }

    const cursor = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
    while (cursor.getTime() <= to.getTime()) {
      defs.push({
        key: cursor.toISOString().slice(0, 10),
        periodStart: new Date(cursor),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return defs;
  }

  private buildComparisonLabel(
    periodStart: Date,
    groupBy: DashboardComparisonGroupBy,
  ): string {
    if (groupBy === 'month') {
      const yy = String(periodStart.getUTCFullYear()).slice(-2);
      return `${MONTH_ABBREVIATIONS_PT_BR[periodStart.getUTCMonth()]}/${yy}`;
    }

    const weekEnd = new Date(periodStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const startDay = pad2(periodStart.getUTCDate());
    const endDay = pad2(weekEnd.getUTCDate());
    const startMonth =
      MONTH_ABBREVIATIONS_PT_BR[periodStart.getUTCMonth()].toLowerCase();
    const endMonth =
      MONTH_ABBREVIATIONS_PT_BR[weekEnd.getUTCMonth()].toLowerCase();

    if (
      periodStart.getUTCMonth() === weekEnd.getUTCMonth() &&
      periodStart.getUTCFullYear() === weekEnd.getUTCFullYear()
    ) {
      return `${startDay}–${endDay}/${endMonth}`;
    }
    return `${startDay}/${startMonth}–${endDay}/${endMonth}`;
  }

  private buildComparisonSeries(
    rows: ComparisonRow[],
    groupBy: DashboardComparisonGroupBy,
    from: Date,
    to: Date,
  ) {
    const buckets = new Map<string, { income: number; expense: number }>();
    const defs = this.buildComparisonBucketDefs(from, to, groupBy);

    for (const def of defs) {
      buckets.set(def.key, { income: 0, expense: 0 });
    }

    for (const row of rows) {
      const rowStart =
        groupBy === 'month'
          ? new Date(
              Date.UTC(row.date.getUTCFullYear(), row.date.getUTCMonth(), 1),
            )
          : new Date(
              Date.UTC(
                row.date.getUTCFullYear(),
                row.date.getUTCMonth(),
                row.date.getUTCDate() - row.date.getUTCDay(),
              ),
            );
      const key = rowStart.toISOString().slice(0, 10);
      const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
      const value = Number(row.value);
      if (row.type === TransactionType.income) {
        bucket.income += value;
      } else {
        bucket.expense += Math.abs(value);
      }
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, totals]) => ({
        periodStart: key,
        label: this.buildComparisonLabel(new Date(key), groupBy),
        income: round2(totals.income),
        expense: round2(totals.expense),
      }));
  }

  private buildComparisonStats(buckets: { income: number; expense: number }[]) {
    const last = buckets[buckets.length - 1];
    const previous = buckets.slice(0, -1);
    const sampleSize = previous.length;

    const vsAvg = (
      pick: (b: { income: number; expense: number }) => number,
    ) => {
      if (sampleSize === 0) return null;
      const avg =
        previous.reduce((sum, bucket) => sum + pick(bucket), 0) / sampleSize;
      if (avg === 0) return null;
      return Math.round(((pick(last) - avg) / avg) * 1000) / 10;
    };

    return {
      sampleSize,
      incomeVsAvg: vsAvg((b) => b.income),
      expenseVsAvg: vsAvg((b) => b.expense),
    };
  }

  private buildBaseWhere(
    query: DashboardQueryDto,
  ): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      ...(query.type !== 'all' && { type: query.type }),
      ...(query.categoryIds?.length && {
        categoryId: { in: query.categoryIds },
      }),
      ...(query.ministryId && { ministryId: query.ministryId }),
    };
  }

  private buildPeriodWhere(
    query: DashboardQueryDto,
    baseWhere: Prisma.TransactionWhereInput,
  ): Prisma.TransactionWhereInput {
    const { from, to } = this.getPeriodRange(query);
    return { ...baseWhere, date: { gte: from, lte: to } };
  }

  private getPeriodRange(query: PeriodFilterQuery): PeriodRange {
    if (query.period === 'custom') {
      return {
        from: new Date(query.dateFrom as string),
        to: new Date(query.dateTo as string),
      };
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    if (query.period === 'currentYear') {
      return {
        from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
        to: today,
      };
    }

    const monthsBack = MONTHS_BACK_BY_PERIOD[query.period] ?? 0;
    return {
      from: new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1),
      ),
      to: today,
    };
  }

  private isMonthlyGranularity(from: Date, to: Date): boolean {
    const diffDays = (to.getTime() - from.getTime()) / MS_PER_DAY;
    return diffDays > MONTHLY_GRANULARITY_THRESHOLD_DAYS;
  }

  private buildBucketKeys(from: Date, to: Date, monthly: boolean): string[] {
    const keys: string[] = [];

    if (monthly) {
      const cursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
      );
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      while (cursor.getTime() <= end.getTime()) {
        keys.push(`${cursor.toISOString().slice(0, 7)}-01`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      const cursor = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
      );
      const end = new Date(
        Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
      );
      while (cursor.getTime() <= end.getTime()) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return keys;
  }

  private buildLineSeries(
    rows: LineRow[],
    monthly: boolean,
    from: Date,
    to: Date,
  ) {
    const buckets = new Map<string, { income: number; expense: number }>();

    for (const key of this.buildBucketKeys(from, to, monthly)) {
      buckets.set(key, { income: 0, expense: 0 });
    }

    for (const row of rows) {
      const key = monthly
        ? `${row.date.toISOString().slice(0, 7)}-01`
        : row.date.toISOString().slice(0, 10);
      const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
      const value = Number(row.value);
      if (row.type === TransactionType.income) {
        bucket.income += value;
      } else {
        bucket.expense += Math.abs(value);
      }
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({
        date,
        income: round2(totals.income),
        expense: round2(totals.expense),
      }));
  }

  private buildCategoryBreakdown(rows: CategoryRow[], type: TransactionType) {
    const buckets = new Map<
      string,
      { categoryId: string; name: string; color: string; value: number }
    >();

    for (const row of rows) {
      if (row.type !== type) continue;
      const bucket = buckets.get(row.category.id) ?? {
        categoryId: row.category.id,
        name: row.category.name,
        color: row.category.color,
        value: 0,
      };
      bucket.value += Math.abs(Number(row.value));
      buckets.set(row.category.id, bucket);
    }

    return [...buckets.values()]
      .sort((a, b) => b.value - a.value)
      .map((bucket) => ({ ...bucket, value: round2(bucket.value) }));
  }
}
