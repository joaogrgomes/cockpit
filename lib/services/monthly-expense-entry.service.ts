import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { normalizeDateOnly } from "@/lib/date-utils";
import { monthlyExpenseEntries, monthlyExpenses } from "@/lib/db/schema";
import {
  groupMonthlyExpensePausesByExpenseId,
  isMonthlyExpensePausedInMonth,
} from "@/lib/monthly-expense-pauses";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";
import { listMonthlyExpensePausesByExpenseIds } from "@/lib/services/monthly-expense-pause.service";
import {
  buildTrackingSummary,
  buildTrackingSummaryByCategory,
  calcTrackingStatusByExpenseType,
  findCompatibleMonthlyExpense,
  getOverdueReason,
  getTrackingDisplayStatus,
  isFixedExpenseOverdue,
  splitItemsByExpenseType,
  sumEntryAmounts,
  type ExpenseTrackingByPeriod,
  type ExpenseTrackingCategorySummaryItem,
  type ExpenseTrackingDisplayStatus,
  type ExpenseTrackingEntryView,
  type ExpenseTrackingItemView,
  type ExpenseTrackingOneTimeEntryView,
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
  | "occurrenceType"
  | "periodMonth"
  | "amount"
  | "paidAt"
  | "paymentMethod"
  | "notes"
>;

export type SmartExpenseEntrySource = "linked" | "one_time";

export type SmartExpenseEntryResult = {
  entry: MonthlyExpenseEntry;
  source: SmartExpenseEntrySource;
};

function toDateString(value: string | Date): string {
  return normalizeDateOnly(value) ?? String(value);
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
      occurrenceType: input.occurrenceType ?? null,
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

export async function createSmartMonthlyExpenseEntry(
  input: MonthlyExpenseEntryCreateInput
): Promise<SmartExpenseEntryResult> {
  const db = getDb();

  if (input.monthlyExpenseId) {
    const entry = await createMonthlyExpenseEntry(input);
    return { entry, source: "linked" };
  }

  const compatibleExpenses = await db
    .select({
      id: monthlyExpenses.id,
      category: monthlyExpenses.category,
      expenseType: monthlyExpenses.expenseType,
      isActive: monthlyExpenses.isActive,
      startMonth: monthlyExpenses.startMonth,
      endMonth: monthlyExpenses.endMonth,
    })
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.isActive, true))
    .orderBy(asc(monthlyExpenses.dueDay), asc(monthlyExpenses.name));

  const pauses = await listMonthlyExpensePausesByExpenseIds(
    compatibleExpenses.map((expense) => expense.id)
  );
  const pausesByExpenseId = groupMonthlyExpensePausesByExpenseId(pauses);
  const eligibleExpenses = compatibleExpenses.filter(
    (expense) =>
      !isMonthlyExpensePausedInMonth(pausesByExpenseId[expense.id], input.periodMonth)
  );

  const compatibleExpense = findCompatibleMonthlyExpense(eligibleExpenses, {
    periodMonth: input.periodMonth,
    category: input.category,
    expenseType: input.expenseType,
  });

  const entry = await createMonthlyExpenseEntry({
    ...input,
    monthlyExpenseId: compatibleExpense?.id ?? null,
  });

  return {
    entry,
    source: compatibleExpense ? "linked" : "one_time",
  };
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
      .select({
        id: monthlyExpenses.id,
        name: monthlyExpenses.name,
        category: monthlyExpenses.category,
        expenseType: monthlyExpenses.expenseType,
        dueDay: monthlyExpenses.dueDay,
        amount: monthlyExpenses.amount,
        startMonth: monthlyExpenses.startMonth,
        endMonth: monthlyExpenses.endMonth,
      })
      .from(monthlyExpenses)
      .where(eq(monthlyExpenses.isActive, true))
      .orderBy(
        sql`case when ${monthlyExpenses.dueDay} is null then 1 else 0 end`,
        asc(monthlyExpenses.dueDay),
        asc(monthlyExpenses.name)
      ),
    listEntriesByPeriod(periodMonth),
  ]);

  const pauses = await listMonthlyExpensePausesByExpenseIds(
    activeExpenses.map((expense) => expense.id)
  );
  const pausesByExpenseId = groupMonthlyExpensePausesByExpenseId(pauses);
  const activeExpensesInPeriod = activeExpenses.filter(
    (expense) =>
      isMonthWithinPeriod(periodMonth, expense.startMonth, expense.endMonth) &&
      !isMonthlyExpensePausedInMonth(pausesByExpenseId[expense.id], periodMonth)
  );

  const entriesByExpenseId = new Map<string, ExpenseTrackingEntryView[]>();
  const oneTimeEntries: ExpenseTrackingOneTimeEntryView[] = [];

  for (const entry of periodEntries) {
    const normalizedEntry = {
      id: entry.id,
      name: entry.name ?? null,
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
      occurrenceType: entry.occurrenceType ?? "unexpected",
    });
  }

  const items: ExpenseTrackingItemView[] = activeExpensesInPeriod.map((expense) => {
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
