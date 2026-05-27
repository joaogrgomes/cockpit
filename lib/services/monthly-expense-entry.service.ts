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
  "monthlyExpenseId" | "periodMonth" | "amount" | "paidAt" | "paymentMethod" | "notes"
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

export type ExpenseTrackingByPeriod = {
  periodMonth: string;
  summary: ExpenseTrackingSummary;
  fixedSummary: ExpenseTrackingSummary;
  variableSummary: ExpenseTrackingSummary;
  items: ExpenseTrackingItemView[];
  fixedItems: ExpenseTrackingItemView[];
  variableItems: ExpenseTrackingItemView[];
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
      monthlyExpenseId: input.monthlyExpenseId,
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

  for (const entry of periodEntries) {
    const list = entriesByExpenseId.get(entry.monthlyExpenseId) ?? [];
    list.push({
      id: entry.id,
      amount: entry.amount,
      paidAt: toDateString(entry.paidAt),
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
    });
    entriesByExpenseId.set(entry.monthlyExpenseId, list);
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

  const summary = buildTrackingSummary(items);
  const fixedSummary = buildTrackingSummary(fixedItems);
  const variableSummary = buildTrackingSummary(variableItems);
  const summaryByCategory = buildTrackingSummaryByCategory(items);

  return {
    periodMonth,
    summary,
    fixedSummary,
    variableSummary,
    items,
    fixedItems,
    variableItems,
    summaryByCategory,
  };
}
