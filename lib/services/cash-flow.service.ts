import "server-only";

import { and, asc, eq, like, sql } from "drizzle-orm";
import { calculateCashFlowProjection, getCurrentPeriodMonth } from "@/lib/cash-flow";
import { getDb } from "@/lib/db";
import {
  cashFlowSettings,
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

  const [activeIncomes, activeExpenses, incomeRows, fixedExpenseRows] = await Promise.all([
    db
      .select({ amount: monthlyIncomes.amount })
      .from(monthlyIncomes)
      .where(eq(monthlyIncomes.isActive, true)),
    db
      .select({ amount: monthlyExpenses.amount, expenseType: monthlyExpenses.expenseType })
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.isActive, true)),
    db
      .select({
        periodMonth: monthlyIncomeEntries.periodMonth,
        totalAmount: sql<number>`coalesce(sum(${monthlyIncomeEntries.amount}), 0)`,
      })
      .from(monthlyIncomeEntries)
      .where(like(monthlyIncomeEntries.periodMonth, yearFilter))
      .groupBy(monthlyIncomeEntries.periodMonth),
    db
      .select({
        periodMonth: monthlyExpenseEntries.periodMonth,
        totalAmount: sql<number>`coalesce(sum(${monthlyExpenseEntries.amount}), 0)`,
      })
      .from(monthlyExpenseEntries)
      .innerJoin(
        monthlyExpenses,
        eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id)
      )
      .where(
        and(
          like(monthlyExpenseEntries.periodMonth, yearFilter),
          eq(monthlyExpenses.expenseType, "fixo")
        )
      )
      .groupBy(monthlyExpenseEntries.periodMonth),
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

  const actualIncomesByMonth = Object.fromEntries(
    incomeRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const actualFixedExpensesByMonth = Object.fromEntries(
    fixedExpenseRows.map((row) => [row.periodMonth, toNumber(row.totalAmount)])
  );

  const projection = calculateCashFlowProjection({
    year,
    startMonth: settings.startMonth,
    initialBalance: settings.initialBalance,
    plannedIncomesTotal,
    actualIncomesByMonth,
    plannedFixedExpensesTotal,
    actualFixedExpensesByMonth,
    plannedVariableExpensesTotal,
  });

  return {
    year,
    settings,
    months: projection.months,
    summary: projection.summary,
  };
}
