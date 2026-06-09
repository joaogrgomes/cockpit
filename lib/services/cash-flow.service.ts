import "server-only";

import { and, asc, eq, like, sql } from "drizzle-orm";
import {
  calculateCashFlowProjection,
  getCurrentPeriodMonth,
  getYearMonths,
} from "@/lib/cash-flow";
import { getDb } from "@/lib/db";
import {
  cashFlowSettings,
  futureExpensePayables,
  futureIncomeReceivables,
  monthlyClosings,
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
} from "@/lib/db/schema";
import type { CashFlowSettings } from "@/types";

export type CashFlowSettingsInput = {
  startMonth: string;
  initialBalance: number;
};

export type CashFlowSettingsView = {
  id: string | null;
  startMonth: string;
  initialBalance: number;
  isFallback: boolean;
};

export type CashFlowProjectionResult = {
  year: number;
  settings: CashFlowSettingsView;
  months: ReturnType<typeof calculateCashFlowProjection>["months"];
  summary: ReturnType<typeof calculateCashFlowProjection>["summary"];
};

function toNumber(value: number | string | bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toSettingsView(settings: CashFlowSettings | null): CashFlowSettingsView {
  if (!settings) {
    return {
      id: null,
      startMonth: getCurrentPeriodMonth(),
      initialBalance: 0,
      isFallback: true,
    };
  }

  return {
    id: settings.id,
    startMonth: settings.startMonth,
    initialBalance: settings.initialBalance,
    isFallback: false,
  };
}

export async function getCashFlowSettings(): Promise<CashFlowSettingsView> {
  const db = getDb();
  const settings = await db
    .select()
    .from(cashFlowSettings)
    .orderBy(asc(cashFlowSettings.createdAt))
    .limit(1);

  return toSettingsView(settings[0] ?? null);
}

export async function upsertCashFlowSettings(
  input: CashFlowSettingsInput
): Promise<CashFlowSettings> {
  const db = getDb();
  const current = await db
    .select()
    .from(cashFlowSettings)
    .orderBy(asc(cashFlowSettings.createdAt))
    .limit(1);

  if (current[0]) {
    const updated = await db
      .update(cashFlowSettings)
      .set({
        startMonth: input.startMonth,
        initialBalance: input.initialBalance,
        updatedAt: sql`now()`,
      })
      .where(eq(cashFlowSettings.id, current[0].id))
      .returning();

    return updated[0];
  }

  const created = await db
    .insert(cashFlowSettings)
    .values({
      startMonth: input.startMonth,
      initialBalance: input.initialBalance,
    })
    .returning();

  return created[0];
}

export async function getCashFlowProjection(
  year: number
): Promise<CashFlowProjectionResult> {
  const db = getDb();
  const settings = await getCashFlowSettings();
  const yearFilter = `${year}-%`;

  const [
    activeIncomes,
    activeExpenses,
    linkedIncomeRows,
    oneTimeIncomeRows,
    futureExpectedIncomeRows,
    closingRows,
    fixedExpenseRows,
    variableExpenseRows,
    futureExpectedFixedExpenseRows,
    futureExpectedVariableExpenseRows,
  ] =
    await Promise.all([
    db
      .select({ id: monthlyIncomes.id, name: monthlyIncomes.name, amount: monthlyIncomes.amount })
      .from(monthlyIncomes)
      .where(eq(monthlyIncomes.isActive, true)),
    db
      .select({ amount: monthlyExpenses.amount, expenseType: monthlyExpenses.expenseType })
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.isActive, true)),
    db
      .select({
        periodMonth: monthlyIncomeEntries.periodMonth,
        monthlyIncomeId: monthlyIncomeEntries.monthlyIncomeId,
        totalAmount: sql<number>`coalesce(sum(${monthlyIncomeEntries.amount}), 0)`,
      })
      .from(monthlyIncomeEntries)
      .innerJoin(monthlyIncomes, eq(monthlyIncomeEntries.monthlyIncomeId, monthlyIncomes.id))
      .where(
        and(
          like(monthlyIncomeEntries.periodMonth, yearFilter),
          eq(monthlyIncomes.isActive, true)
        )
      )
      .groupBy(monthlyIncomeEntries.periodMonth, monthlyIncomeEntries.monthlyIncomeId),
    db
      .select({
        periodMonth: monthlyIncomeEntries.periodMonth,
        totalAmount: sql<number>`coalesce(sum(${monthlyIncomeEntries.amount}), 0)`,
      })
      .from(monthlyIncomeEntries)
      .where(
        and(
          like(monthlyIncomeEntries.periodMonth, yearFilter),
          sql`${monthlyIncomeEntries.monthlyIncomeId} IS NULL`
        )
      )
      .groupBy(monthlyIncomeEntries.periodMonth),
    db
      .select({
        periodMonth: sql<string>`to_char(${futureIncomeReceivables.expectedDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`coalesce(sum(${futureIncomeReceivables.expectedAmount}), 0)`,
      })
      .from(futureIncomeReceivables)
      .where(
        and(
          eq(futureIncomeReceivables.status, "prevista"),
          sql`${futureIncomeReceivables.expectedDate} >= make_date(${year}, 1, 1)`,
          sql`${futureIncomeReceivables.expectedDate} <= make_date(${year}, 12, 31)`
        )
      )
      .groupBy(sql`to_char(${futureIncomeReceivables.expectedDate}, 'YYYY-MM')`),
    db
      .select({ periodMonth: monthlyClosings.periodMonth })
      .from(monthlyClosings)
      .where(like(monthlyClosings.periodMonth, yearFilter)),
    db
      .select({
        periodMonth: monthlyExpenseEntries.periodMonth,
        totalAmount: sql<number>`coalesce(sum(${monthlyExpenseEntries.amount}), 0)`,
      })
      .from(monthlyExpenseEntries)
      .leftJoin(monthlyExpenses, eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id))
      .where(
        and(
          like(monthlyExpenseEntries.periodMonth, yearFilter),
          sql`coalesce(${monthlyExpenses.expenseType}, ${monthlyExpenseEntries.expenseType}) = 'fixo'`
        )
      )
      .groupBy(monthlyExpenseEntries.periodMonth),
    db
      .select({
        periodMonth: monthlyExpenseEntries.periodMonth,
        totalAmount: sql<number>`coalesce(sum(${monthlyExpenseEntries.amount}), 0)`,
      })
      .from(monthlyExpenseEntries)
      .leftJoin(monthlyExpenses, eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id))
      .where(
        and(
          like(monthlyExpenseEntries.periodMonth, yearFilter),
          sql`coalesce(${monthlyExpenses.expenseType}, ${monthlyExpenseEntries.expenseType}) = 'variavel'`
        )
      )
      .groupBy(monthlyExpenseEntries.periodMonth),
    db
      .select({
        periodMonth: sql<string>`to_char(${futureExpensePayables.expectedDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`coalesce(sum(${futureExpensePayables.expectedAmount}), 0)`,
      })
      .from(futureExpensePayables)
      .where(
        and(
          eq(futureExpensePayables.status, "previsto"),
          eq(futureExpensePayables.expenseType, "fixo"),
          sql`${futureExpensePayables.expectedDate} >= make_date(${year}, 1, 1)`,
          sql`${futureExpensePayables.expectedDate} <= make_date(${year}, 12, 31)`
        )
      )
      .groupBy(sql`to_char(${futureExpensePayables.expectedDate}, 'YYYY-MM')`),
    db
      .select({
        periodMonth: sql<string>`to_char(${futureExpensePayables.expectedDate}, 'YYYY-MM')`,
        totalAmount: sql<number>`coalesce(sum(${futureExpensePayables.expectedAmount}), 0)`,
      })
      .from(futureExpensePayables)
      .where(
        and(
          eq(futureExpensePayables.status, "previsto"),
          eq(futureExpensePayables.expenseType, "variavel"),
          sql`${futureExpensePayables.expectedDate} >= make_date(${year}, 1, 1)`,
          sql`${futureExpensePayables.expectedDate} <= make_date(${year}, 12, 31)`
        )
      )
      .groupBy(sql`to_char(${futureExpensePayables.expectedDate}, 'YYYY-MM')`),
    ]);

  const plannedIncomesTotal = activeIncomes.reduce((acc, row) => acc + row.amount, 0);

  let plannedFixedExpensesTotal = 0;
  let plannedVariableExpensesTotal = 0;

  for (const expense of activeExpenses) {
    if (expense.expenseType === "fixo") {
      plannedFixedExpensesTotal += expense.amount;
    } else {
      plannedVariableExpensesTotal += expense.amount;
    }
  }

  const actualLinkedIncomeByMonthMap = new Map<string, number>();
  const incomeRealizedByMonthAndIncomeId = new Map<string, number>();

  for (const row of linkedIncomeRows) {
    const amount = toNumber(row.totalAmount);
    actualLinkedIncomeByMonthMap.set(
      row.periodMonth,
      (actualLinkedIncomeByMonthMap.get(row.periodMonth) ?? 0) + amount
    );
    incomeRealizedByMonthAndIncomeId.set(`${row.periodMonth}:${row.monthlyIncomeId}`, amount);
  }

  const actualLinkedIncomesByMonth = Object.fromEntries(actualLinkedIncomeByMonthMap);

  const actualOneTimeIncomesByMonth = Object.fromEntries(
    oneTimeIncomeRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const futureExpectedIncomesByMonth = Object.fromEntries(
    futureExpectedIncomeRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const actualFixedExpensesByMonth = Object.fromEntries(
    fixedExpenseRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const actualVariableExpensesByMonth = Object.fromEntries(
    variableExpenseRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );
  const futureExpectedFixedExpensesByMonth = Object.fromEntries(
    futureExpectedFixedExpenseRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );
  const futureExpectedVariableExpensesByMonth = Object.fromEntries(
    futureExpectedVariableExpenseRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const incomePlanItemsByMonth = Object.fromEntries(
    getYearMonths(year).map((periodMonth) => [
      periodMonth,
      activeIncomes.map((income) => ({
        id: income.id,
        name: income.name,
        plannedAmount: income.amount,
        realizedAmount:
          incomeRealizedByMonthAndIncomeId.get(`${periodMonth}:${income.id}`) ?? 0,
      })),
    ])
  );

  const projection = calculateCashFlowProjection({
    year,
    startMonth: settings.startMonth,
    initialBalance: settings.initialBalance,
    plannedIncomesTotal,
    actualLinkedIncomesByMonth,
    actualOneTimeIncomesByMonth,
    futureExpectedIncomesByMonth,
    incomePlanItemsByMonth,
    closedMonths: new Set(closingRows.map((row) => row.periodMonth)),
    plannedFixedExpensesTotal,
    actualFixedExpensesByMonth,
    futureExpectedFixedExpensesByMonth,
    plannedVariableExpensesTotal,
    actualVariableExpensesByMonth,
    futureExpectedVariableExpensesByMonth,
  });

  return {
    year,
    settings,
    months: projection.months,
    summary: projection.summary,
  };
}
