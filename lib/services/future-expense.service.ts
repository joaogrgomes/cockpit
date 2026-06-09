import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  futureExpensePayables,
  monthlyExpenseEntries,
} from "@/lib/db/schema";
import type {
  FutureExpensePayable,
  NewFutureExpensePayable,
} from "@/types";

export type FutureExpensePayableFilters = {
  status?: "previsto" | "realizado" | "cancelado" | "todos";
  sort?: "expected_date_asc" | "expected_date_desc";
};

export type FutureExpensePayableCreateInput = Pick<
  NewFutureExpensePayable,
  | "name"
  | "category"
  | "expenseType"
  | "occurrenceType"
  | "expectedAmount"
  | "expectedDate"
  | "notes"
>;

export type FutureExpensePayableUpdateInput = Partial<
  FutureExpensePayableCreateInput
>;

export type MarkFutureExpenseAsRealizedInput = {
  futureExpenseId: string;
  realizedAmount: number;
  paidAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

export async function listFutureExpensePayables(
  filters: FutureExpensePayableFilters = {}
): Promise<FutureExpensePayable[]> {
  const db = getDb();
  const whereConditions = [];

  if (filters.status && filters.status !== "todos") {
    whereConditions.push(eq(futureExpensePayables.status, filters.status));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const sortDirection = filters.sort ?? "expected_date_asc";

  const query = db.select().from(futureExpensePayables);

  if (!whereClause) {
    return sortDirection === "expected_date_desc"
      ? query.orderBy(desc(futureExpensePayables.expectedDate), desc(futureExpensePayables.createdAt))
      : query.orderBy(asc(futureExpensePayables.expectedDate), asc(futureExpensePayables.createdAt));
  }

  return sortDirection === "expected_date_desc"
    ? db
        .select()
        .from(futureExpensePayables)
        .where(whereClause)
        .orderBy(desc(futureExpensePayables.expectedDate), desc(futureExpensePayables.createdAt))
    : db
        .select()
        .from(futureExpensePayables)
        .where(whereClause)
        .orderBy(asc(futureExpensePayables.expectedDate), asc(futureExpensePayables.createdAt));
}

export async function getFutureExpensePayableById(
  id: string
): Promise<FutureExpensePayable | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(futureExpensePayables)
    .where(eq(futureExpensePayables.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createFutureExpensePayable(
  input: FutureExpensePayableCreateInput
): Promise<FutureExpensePayable> {
  const db = getDb();
  const result = await db
    .insert(futureExpensePayables)
    .values({
      name: input.name,
      category: input.category,
      expenseType: input.expenseType,
      occurrenceType: input.occurrenceType ?? "planned_one_off",
      expectedAmount: input.expectedAmount,
      expectedDate: input.expectedDate,
      notes: input.notes ?? null,
      status: "previsto",
    })
    .returning();

  return result[0];
}

export async function updateFutureExpensePayable(
  id: string,
  input: FutureExpensePayableUpdateInput
): Promise<FutureExpensePayable | null> {
  const db = getDb();
  const current = await getFutureExpensePayableById(id);
  if (!current || current.status !== "previsto") {
    return null;
  }

  const result = await db
    .update(futureExpensePayables)
    .set({
      ...input,
      notes: input.notes ?? null,
      occurrenceType: input.occurrenceType ?? current.occurrenceType,
      updatedAt: sql`now()`,
    })
    .where(eq(futureExpensePayables.id, id))
    .returning();

  return result[0] ?? null;
}

export async function cancelFutureExpensePayable(
  id: string
): Promise<FutureExpensePayable | null> {
  const db = getDb();
  const current = await getFutureExpensePayableById(id);
  if (!current || current.status !== "previsto") {
    return null;
  }

  const result = await db
    .update(futureExpensePayables)
    .set({
      status: "cancelado",
      updatedAt: sql`now()`,
    })
    .where(eq(futureExpensePayables.id, id))
    .returning();

  return result[0] ?? null;
}

export async function markFutureExpenseAsRealized(
  input: MarkFutureExpenseAsRealizedInput
): Promise<FutureExpensePayable | null> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(futureExpensePayables)
      .where(eq(futureExpensePayables.id, input.futureExpenseId))
      .limit(1);

    const futureExpense = current[0];
    if (!futureExpense || futureExpense.status !== "previsto") {
      return null;
    }

    const realizedEntry = await tx
      .insert(monthlyExpenseEntries)
      .values({
        monthlyExpenseId: null,
        name: futureExpense.name,
        category: futureExpense.category,
        expenseType: futureExpense.expenseType,
        occurrenceType: futureExpense.occurrenceType,
        periodMonth: input.paidAt.slice(0, 7),
        amount: input.realizedAmount,
        paidAt: input.paidAt,
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? futureExpense.notes ?? null,
        updatedAt: sql`now()`,
      })
      .returning({ id: monthlyExpenseEntries.id });

    const updated = await tx
      .update(futureExpensePayables)
      .set({
        status: "realizado",
        realizedEntryId: realizedEntry[0].id,
        updatedAt: sql`now()`,
      })
      .where(eq(futureExpensePayables.id, input.futureExpenseId))
      .returning();

    return updated[0] ?? null;
  });
}
