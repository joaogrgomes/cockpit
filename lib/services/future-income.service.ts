import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  futureIncomeReceivables,
  monthlyIncomeEntries,
} from "@/lib/db/schema";
import type {
  FutureIncomeReceivable,
  NewFutureIncomeReceivable,
} from "@/types";

export type FutureIncomeReceivableFilters = {
  status?: "prevista" | "recebida" | "cancelada" | "todas";
  sort?: "expected_date_asc" | "expected_date_desc";
};

export type FutureIncomeReceivableCreateInput = Pick<
  NewFutureIncomeReceivable,
  "name" | "category" | "expectedAmount" | "expectedDate" | "notes"
>;

export type FutureIncomeReceivableUpdateInput = Partial<
  FutureIncomeReceivableCreateInput
>;

export type MarkFutureIncomeAsReceivedInput = {
  futureIncomeId: string;
  receivedAmount: number;
  receivedAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

export async function listFutureIncomeReceivables(
  filters: FutureIncomeReceivableFilters = {}
): Promise<FutureIncomeReceivable[]> {
  const db = getDb();
  const whereConditions = [];

  if (filters.status && filters.status !== "todas") {
    whereConditions.push(eq(futureIncomeReceivables.status, filters.status));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const sortDirection = filters.sort ?? "expected_date_asc";

  const query = db.select().from(futureIncomeReceivables);

  if (!whereClause) {
    return sortDirection === "expected_date_desc"
      ? query.orderBy(desc(futureIncomeReceivables.expectedDate), desc(futureIncomeReceivables.createdAt))
      : query.orderBy(asc(futureIncomeReceivables.expectedDate), asc(futureIncomeReceivables.createdAt));
  }

  return sortDirection === "expected_date_desc"
    ? db
        .select()
        .from(futureIncomeReceivables)
        .where(whereClause)
        .orderBy(desc(futureIncomeReceivables.expectedDate), desc(futureIncomeReceivables.createdAt))
    : db
        .select()
        .from(futureIncomeReceivables)
        .where(whereClause)
        .orderBy(asc(futureIncomeReceivables.expectedDate), asc(futureIncomeReceivables.createdAt));
}

export async function getFutureIncomeReceivableById(
  id: string
): Promise<FutureIncomeReceivable | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(futureIncomeReceivables)
    .where(eq(futureIncomeReceivables.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createFutureIncomeReceivable(
  input: FutureIncomeReceivableCreateInput
): Promise<FutureIncomeReceivable> {
  const db = getDb();
  const result = await db
    .insert(futureIncomeReceivables)
    .values({
      name: input.name,
      category: input.category,
      expectedAmount: input.expectedAmount,
      expectedDate: input.expectedDate,
      notes: input.notes ?? null,
      status: "prevista",
    })
    .returning();

  return result[0];
}

export async function updateFutureIncomeReceivable(
  id: string,
  input: FutureIncomeReceivableUpdateInput
): Promise<FutureIncomeReceivable | null> {
  const db = getDb();
  const current = await getFutureIncomeReceivableById(id);
  if (!current || current.status !== "prevista") {
    return null;
  }

  const result = await db
    .update(futureIncomeReceivables)
    .set({
      ...input,
      notes: input.notes ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(futureIncomeReceivables.id, id))
    .returning();

  return result[0] ?? null;
}

export async function cancelFutureIncomeReceivable(
  id: string
): Promise<FutureIncomeReceivable | null> {
  const db = getDb();
  const current = await getFutureIncomeReceivableById(id);
  if (!current || current.status !== "prevista") {
    return null;
  }

  const result = await db
    .update(futureIncomeReceivables)
    .set({
      status: "cancelada",
      updatedAt: sql`now()`,
    })
    .where(eq(futureIncomeReceivables.id, id))
    .returning();

  return result[0] ?? null;
}

export async function markFutureIncomeAsReceived(
  input: MarkFutureIncomeAsReceivedInput
): Promise<FutureIncomeReceivable | null> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(futureIncomeReceivables)
      .where(eq(futureIncomeReceivables.id, input.futureIncomeId))
      .limit(1);

    const futureIncome = current[0];
    if (!futureIncome || futureIncome.status !== "prevista") {
      return null;
    }

    const receivedEntry = await tx
      .insert(monthlyIncomeEntries)
      .values({
        monthlyIncomeId: null,
        name: futureIncome.name,
        category: futureIncome.category,
        periodMonth: input.receivedAt.slice(0, 7),
        amount: input.receivedAmount,
        receivedAt: input.receivedAt,
        paymentMethod: input.paymentMethod ?? null,
        notes: input.notes ?? futureIncome.notes ?? null,
        updatedAt: sql`now()`,
      })
      .returning({ id: monthlyIncomeEntries.id });

    const updated = await tx
      .update(futureIncomeReceivables)
      .set({
        status: "recebida",
        receivedEntryId: receivedEntry[0].id,
        updatedAt: sql`now()`,
      })
      .where(eq(futureIncomeReceivables.id, input.futureIncomeId))
      .returning();

    return updated[0] ?? null;
  });
}
