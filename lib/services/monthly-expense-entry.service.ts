import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { monthlyExpenseEntries, monthlyExpenses } from "@/lib/db/schema";
import {
  buildTrackingSummary,
  buildTrackingSummaryByCategory,
  calcTrackingStatusByExpenseType,
  getOverdueReason,
  getTrackingDisplayStatus,
  isFixedExpenseOverdue,
  splitItemsByExpenseType,
  sumEntryAmounts,
  type ExpenseTrackingCategorySummaryItem,
  type ExpenseTrackingDisplayStatus,
  type ExpenseTrackingStatus,
  type ExpenseTrackingSummary,
} from "@/lib/expense-tracking";
import type { MonthlyExpenseEntry, NewMonthlyExpenseEntry } from "@/types";

export type MonthlyExpenseEntryCreateInput = Pick<
  NewMonthlyExpenseEntry,
  | "monthlyExpenseId"
  | "name"
  | "category"
  | "expenseType"
  | "periodMonth"
  | "amount"
  | "paidAt"
  | "paymentMethod"
  | "notes"
>;

export type ExpenseTrackingEntryView = {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

export type ExpenseTrackingItemView = {
  monthlyExpenseId: string;
  name: string;
  category: string;
  expenseType: string;
  dueDay: number | null;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  status: ExpenseTrackingStatus;
  displayStatus: ExpenseTrackingDisplayStatus;
  isOverdue: boolean;
  overdueReason: string | null;
  entries: ExpenseTrackingEntryView[];
};

export type ExpenseTrackingOneTimeEntryView = {
  id: string;
  name: string;
  category: string;
  expenseType: string;
  amount: number;
  paidAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

export type ExpenseTrackingByPeriod = {
  periodMonth: string;
  summary: ExpenseTrackingSummary;
  fixedSummary: ExpenseTrackingSummary;
  variableSummary: ExpenseTrackingSummary;
  items: ExpenseTrackingItemView[];
  fixedItems: ExpenseTrackingItemView[];
  variableItems: ExpenseTrackingItemView[];
  oneTimeEntries: ExpenseTrackingOneTimeEntryView[];
  summaryByCategory: ExpenseTrackingCategorySummaryItem[];
};

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

export async function listEntriesByPeriod(
  periodMonth: string
): Promise<MonthlyExpenseEntry[]> {
  const db = getDb();

  return db
    .select()
    .from(monthlyExpenseEntries)
    .where(eq(monthlyExpenseEntries.periodMonth, periodMonth))
    .orderBy(asc(monthlyExpenseEntries.paidAt), asc(monthlyExpenseEntries.createdAt));
}

export async function listEntriesByExpenseAndPeriod(
  monthlyExpenseId: string,
  periodMonth: string
): Promise<MonthlyExpenseEntry[]> {
  const db = getDb();

  return db
    .select()
    .from(monthlyExpenseEntries)
    .where(
      and(
        eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenseId),
        eq(monthlyExpenseEntries.periodMonth, periodMonth)
      )
    )
    .orderBy(asc(monthlyExpenseEntries.paidAt), asc(monthlyExpenseEntries.createdAt));
}

export async function createMonthlyExpenseEntry(
  input: MonthlyExpenseEntryCreateInput
): Promise<MonthlyExpenseEntry> {
  const db = getDb();

  const result = await db
    .insert(monthlyExpenseEntries)
    .values({
      monthlyExpenseId: input.monthlyExpenseId ?? null,
      name: input.name ?? null,
      category: input.category ?? null,
      expenseType: input.expenseType ?? null,
      periodMonth: input.periodMonth,
      amount: input.amount,
      paidAt: input.paidAt,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      updatedAt: sql`now()`,
    })
    .returning();

  return result[0];
}

export async function deleteMonthlyExpenseEntry(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(monthlyExpenseEntries)
    .where(eq(monthlyExpenseEntries.id, id))
    .returning({ id: monthlyExpenseEntries.id });
  return result.length > 0;
}

export async function getExpenseTrackingByPeriod(
  periodMonth: string
): Promise<ExpenseTrackingByPeriod> {
  const db = getDb();

  const [activeExpenses, periodEntries] = await Promise.all([
    db
      .select()
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.isActive, true))
      .orderBy(
        sql`case when ${monthlyExpenses.dueDay} is null then 1 else 0 end`,
        asc(monthlyExpenses.dueDay),
        asc(monthlyExpenses.name)
      ),
    listEntriesByPeriod(periodMonth),
  ]);

  const entriesByExpenseId = new Map<string, ExpenseTrackingEntryView[]>();
  const oneTimeEntries: ExpenseTrackingOneTimeEntryView[] = [];

  for (const entry of periodEntries) {
    const normalizedEntry = {
      id: entry.id,
      amount: entry.amount,
      paidAt: toDateString(entry.paidAt),
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
    };

    if (entry.monthlyExpenseId) {
      const list = entriesByExpenseId.get(entry.monthlyExpenseId) ?? [];
      list.push(normalizedEntry);
      entriesByExpenseId.set(entry.monthlyExpenseId, list);
      continue;
    }

    if (!entry.name || !entry.category || !entry.expenseType) {
      continue;
    }

    oneTimeEntries.push({
      ...normalizedEntry,
      name: entry.name,
      category: entry.category,
      expenseType: entry.expenseType,
    });
  }

  const items: ExpenseTrackingItemView[] = activeExpenses.map((expense) => {
    const entries = entriesByExpenseId.get(expense.id) ?? [];
    const actualAmount = sumEntryAmounts(entries);
    const plannedAmount = expense.amount;
    const remainingAmount = plannedAmount - actualAmount;
    const status = calcTrackingStatusByExpenseType(
      expense.expenseType,
      plannedAmount,
      actualAmount
    );
    const isOverdue = isFixedExpenseOverdue({
      expenseType: expense.expenseType,
      dueDay: expense.dueDay,
      actualAmount,
      periodMonth,
    });

    return {
      monthlyExpenseId: expense.id,
      name: expense.name,
      category: expense.category,
      expenseType: expense.expenseType,
      dueDay: expense.dueDay,
      plannedAmount,
      actualAmount,
      remainingAmount,
      status,
      displayStatus: getTrackingDisplayStatus(expense.expenseType, status),
      isOverdue,
      overdueReason: isOverdue ? getOverdueReason(expense.dueDay) : null,
      entries,
    };
  });

  const { fixedItems, variableItems } = splitItemsByExpenseType(items);
  const fixedOneTimeActual = sumEntryAmounts(
    oneTimeEntries.filter((entry) => entry.expenseType === "fixo")
  );
  const variableOneTimeActual = sumEntryAmounts(
    oneTimeEntries.filter((entry) => entry.expenseType === "variavel")
  );
  const oneTimeActual = fixedOneTimeActual + variableOneTimeActual;

  const baseSummary = buildTrackingSummary(items);
  const baseFixedSummary = buildTrackingSummary(fixedItems);
  const baseVariableSummary = buildTrackingSummary(variableItems);

  const summary: ExpenseTrackingSummary = {
    ...baseSummary,
    totalActual: baseSummary.totalActual + oneTimeActual,
    totalRemaining: baseSummary.totalRemaining - oneTimeActual,
  };
  const fixedSummary: ExpenseTrackingSummary = {
    ...baseFixedSummary,
    totalActual: baseFixedSummary.totalActual + fixedOneTimeActual,
    totalRemaining: baseFixedSummary.totalRemaining - fixedOneTimeActual,
  };
  const variableSummary: ExpenseTrackingSummary = {
    ...baseVariableSummary,
    totalActual: baseVariableSummary.totalActual + variableOneTimeActual,
    totalRemaining: baseVariableSummary.totalRemaining - variableOneTimeActual,
  };

  const summaryByCategoryMap = new Map<string, ExpenseTrackingCategorySummaryItem>(
    buildTrackingSummaryByCategory(items).map((row) => [row.category, { ...row }])
  );
  for (const oneTime of oneTimeEntries) {
    const row = summaryByCategoryMap.get(oneTime.category) ?? {
      category: oneTime.category,
      plannedAmount: 0,
      actualAmount: 0,
      remainingAmount: 0,
    };
    row.actualAmount += oneTime.amount;
    row.remainingAmount = row.plannedAmount - row.actualAmount;
    summaryByCategoryMap.set(oneTime.category, row);
  }
  const summaryByCategory = [...summaryByCategoryMap.values()].sort((a, b) => {
    const aWeight = a.plannedAmount + a.actualAmount;
    const bWeight = b.plannedAmount + b.actualAmount;
    return bWeight - aWeight;
  });

  return {
    periodMonth,
    summary,
    fixedSummary,
    variableSummary,
    items,
    fixedItems,
    variableItems,
    oneTimeEntries,
    summaryByCategory,
  };
}
