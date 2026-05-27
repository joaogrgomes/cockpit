import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { monthlyIncomeEntries, monthlyIncomes } from "@/lib/db/schema";
import {
  buildIncomeTrackingSummary,
  buildIncomeTrackingSummaryByCategory,
  calcAbovePlannedAmount,
  calcIncomeTrackingStatus,
  getIncomeOverdueReason,
  isIncomeOverdue,
  sumIncomeEntryAmounts,
  type IncomeTrackingCategorySummaryItem,
  type IncomeTrackingStatus,
  type IncomeTrackingSummary,
} from "@/lib/income-tracking";
import type { MonthlyIncomeEntry, NewMonthlyIncomeEntry } from "@/types";

export type MonthlyIncomeEntryCreateInput = Pick<
  NewMonthlyIncomeEntry,
  "monthlyIncomeId" | "periodMonth" | "amount" | "receivedAt" | "paymentMethod" | "notes"
>;

export type IncomeTrackingEntryView = {
  id: string;
  amount: number;
  receivedAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

export type IncomeTrackingItemView = {
  monthlyIncomeId: string;
  name: string;
  category: string;
  expectedDay: number | null;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  abovePlannedAmount: number;
  status: IncomeTrackingStatus;
  isOverdue: boolean;
  overdueReason: string | null;
  entries: IncomeTrackingEntryView[];
};

export type IncomeTrackingByPeriod = {
  periodMonth: string;
  summary: IncomeTrackingSummary;
  items: IncomeTrackingItemView[];
  summaryByCategory: IncomeTrackingCategorySummaryItem[];
};

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

export async function listIncomeEntriesByPeriod(
  periodMonth: string
): Promise<MonthlyIncomeEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(monthlyIncomeEntries)
    .where(eq(monthlyIncomeEntries.periodMonth, periodMonth))
    .orderBy(asc(monthlyIncomeEntries.receivedAt), asc(monthlyIncomeEntries.createdAt));
}

export async function listIncomeEntriesByIncomeAndPeriod(
  monthlyIncomeId: string,
  periodMonth: string
): Promise<MonthlyIncomeEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(monthlyIncomeEntries)
    .where(
      and(
        eq(monthlyIncomeEntries.monthlyIncomeId, monthlyIncomeId),
        eq(monthlyIncomeEntries.periodMonth, periodMonth)
      )
    )
    .orderBy(asc(monthlyIncomeEntries.receivedAt), asc(monthlyIncomeEntries.createdAt));
}

export async function createMonthlyIncomeEntry(
  input: MonthlyIncomeEntryCreateInput
): Promise<MonthlyIncomeEntry> {
  const db = getDb();
  const result = await db
    .insert(monthlyIncomeEntries)
    .values({
      monthlyIncomeId: input.monthlyIncomeId,
      periodMonth: input.periodMonth,
      amount: input.amount,
      receivedAt: input.receivedAt,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      updatedAt: sql`now()`,
    })
    .returning();

  return result[0];
}

export async function deleteMonthlyIncomeEntry(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(monthlyIncomeEntries)
    .where(eq(monthlyIncomeEntries.id, id))
    .returning({ id: monthlyIncomeEntries.id });
  return result.length > 0;
}

export async function getIncomeTrackingByPeriod(
  periodMonth: string
): Promise<IncomeTrackingByPeriod> {
  const db = getDb();

  const [activeIncomes, periodEntries] = await Promise.all([
    db
      .select()
      .from(monthlyIncomes)
      .where(eq(monthlyIncomes.isActive, true))
      .orderBy(
        sql`case when ${monthlyIncomes.expectedDay} is null then 1 else 0 end`,
        asc(monthlyIncomes.expectedDay),
        asc(monthlyIncomes.name)
      ),
    listIncomeEntriesByPeriod(periodMonth),
  ]);

  const entriesByIncomeId = new Map<string, IncomeTrackingEntryView[]>();

  for (const entry of periodEntries) {
    const list = entriesByIncomeId.get(entry.monthlyIncomeId) ?? [];
    list.push({
      id: entry.id,
      amount: entry.amount,
      receivedAt: toDateString(entry.receivedAt),
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
    });
    entriesByIncomeId.set(entry.monthlyIncomeId, list);
  }

  const items: IncomeTrackingItemView[] = activeIncomes.map((income) => {
    const entries = entriesByIncomeId.get(income.id) ?? [];
    const actualAmount = sumIncomeEntryAmounts(entries);
    const plannedAmount = income.amount;
    const remainingAmount = plannedAmount - actualAmount;
    const abovePlannedAmount = calcAbovePlannedAmount(plannedAmount, actualAmount);
    const status = calcIncomeTrackingStatus(plannedAmount, actualAmount);
    const isOverdue = isIncomeOverdue({
      expectedDay: income.expectedDay,
      actualAmount,
      periodMonth,
    });

    return {
      monthlyIncomeId: income.id,
      name: income.name,
      category: income.category,
      expectedDay: income.expectedDay,
      plannedAmount,
      actualAmount,
      remainingAmount,
      abovePlannedAmount,
      status,
      isOverdue,
      overdueReason: isOverdue ? getIncomeOverdueReason(income.expectedDay) : null,
      entries,
    };
  });

  return {
    periodMonth,
    summary: buildIncomeTrackingSummary(items),
    items,
    summaryByCategory: buildIncomeTrackingSummaryByCategory(items),
  };
}
