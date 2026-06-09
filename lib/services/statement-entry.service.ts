import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
} from "@/lib/db/schema";
import {
  buildStatementEntryUpdateValues,
  isStatementOriginType,
  mapExpenseEntryRowToDetail,
  mapIncomeEntryRowToDetail,
  type StatementEntryDetail,
  type StatementOriginType,
  type StatementEntryUpdateValues,
} from "@/lib/statement";

export type StatementEntryUpdateInput = {
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
  description?: string | null;
  category?: string | null;
  expenseType?: string | null;
};

type StatementIncomeEntryRow = {
  id: string;
  monthlyIncomeId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  monthlyIncomeName: string | null;
  monthlyIncomeCategory: string | null;
  periodMonth: string;
  amount: number;
  receivedAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
};

type StatementExpenseEntryRow = {
  id: string;
  monthlyExpenseId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  entryExpenseType: string | null;
  monthlyExpenseName: string | null;
  monthlyExpenseCategory: string | null;
  monthlyExpenseType: string | null;
  periodMonth: string;
  amount: number;
  paidAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
};

function isValidOriginType(value: string): value is StatementOriginType {
  return isStatementOriginType(value);
}

export async function getStatementEntryDetail(
  originType: string,
  id: string
): Promise<StatementEntryDetail | null> {
  if (!isValidOriginType(originType)) {
    return null;
  }

  const db = getDb();

  if (originType === "monthly_income_entry") {
    const rows = await db
      .select({
        id: monthlyIncomeEntries.id,
        monthlyIncomeId: monthlyIncomeEntries.monthlyIncomeId,
        entryName: monthlyIncomeEntries.name,
        entryCategory: monthlyIncomeEntries.category,
        monthlyIncomeName: monthlyIncomes.name,
        monthlyIncomeCategory: monthlyIncomes.category,
        periodMonth: monthlyIncomeEntries.periodMonth,
        amount: monthlyIncomeEntries.amount,
        receivedAt: monthlyIncomeEntries.receivedAt,
        paymentMethod: monthlyIncomeEntries.paymentMethod,
        notes: monthlyIncomeEntries.notes,
      })
      .from(monthlyIncomeEntries)
      .leftJoin(monthlyIncomes, eq(monthlyIncomeEntries.monthlyIncomeId, monthlyIncomes.id))
      .where(eq(monthlyIncomeEntries.id, id))
      .limit(1);

    const row = rows[0];
    return row ? mapIncomeEntryRowToDetail(row) : null;
  }

  const rows = await db
    .select({
      id: monthlyExpenseEntries.id,
      monthlyExpenseId: monthlyExpenseEntries.monthlyExpenseId,
      entryName: monthlyExpenseEntries.name,
      entryCategory: monthlyExpenseEntries.category,
      entryExpenseType: monthlyExpenseEntries.expenseType,
      monthlyExpenseName: monthlyExpenses.name,
      monthlyExpenseCategory: monthlyExpenses.category,
      monthlyExpenseType: monthlyExpenses.expenseType,
      periodMonth: monthlyExpenseEntries.periodMonth,
      amount: monthlyExpenseEntries.amount,
      paidAt: monthlyExpenseEntries.paidAt,
      paymentMethod: monthlyExpenseEntries.paymentMethod,
      notes: monthlyExpenseEntries.notes,
    })
    .from(monthlyExpenseEntries)
    .leftJoin(monthlyExpenses, eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id))
    .where(eq(monthlyExpenseEntries.id, id))
    .limit(1);

  const row = rows[0];
  return row ? mapExpenseEntryRowToDetail(row) : null;
}

export async function updateStatementEntry(
  originType: string,
  id: string,
  input: StatementEntryUpdateInput
): Promise<StatementEntryDetail | null> {
  if (!isValidOriginType(originType)) {
    return null;
  }

  const db = getDb();

  if (originType === "monthly_income_entry") {
    const existing = await getStatementEntryDetail(originType, id);
    if (!existing) return null;

    const values = buildStatementEntryUpdateValues(existing, input as StatementEntryUpdateValues);
    const patch: Record<string, unknown> = {
      amount: values.amount,
      receivedAt: values.date,
      periodMonth: values.periodMonth,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      updatedAt: sql`now()`,
    };

    if (existing.canEditDescription) {
      patch.name = values.description ?? null;
    }

    if (existing.canEditCategory) {
      patch.category = values.category ?? null;
    }

    await db
      .update(monthlyIncomeEntries)
      .set(patch)
      .where(eq(monthlyIncomeEntries.id, id));

    return getStatementEntryDetail(originType, id);
  }

  const existing = await getStatementEntryDetail(originType, id);
  if (!existing) return null;

  const values = buildStatementEntryUpdateValues(existing, input as StatementEntryUpdateValues);
  const patch: Record<string, unknown> = {
    amount: values.amount,
    paidAt: values.date,
    periodMonth: values.periodMonth,
    paymentMethod: values.paymentMethod,
    notes: values.notes,
    updatedAt: sql`now()`,
  };

  if (existing.canEditDescription) {
    patch.name = values.description ?? null;
  }

  if (existing.canEditCategory) {
    patch.category = values.category ?? null;
  }

  if (existing.canEditExpenseType) {
    patch.expenseType = values.expenseType ?? null;
  }

  await db
    .update(monthlyExpenseEntries)
    .set(patch)
    .where(eq(monthlyExpenseEntries.id, id));

  return getStatementEntryDetail(originType, id);
}

export async function deleteStatementEntry(
  originType: string,
  id: string
): Promise<StatementEntryDetail | null> {
  if (!isValidOriginType(originType)) {
    return null;
  }

  const existing = await getStatementEntryDetail(originType, id);
  if (!existing) return null;

  const db = getDb();

  if (originType === "monthly_income_entry") {
    await db.delete(monthlyIncomeEntries).where(eq(monthlyIncomeEntries.id, id));
    return existing;
  }

  await db.delete(monthlyExpenseEntries).where(eq(monthlyExpenseEntries.id, id));
  return existing;
}
