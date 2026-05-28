import "server-only";

import { asc, eq, like, sql } from "drizzle-orm";
import {
  canClosePeriodMonth,
  getCurrentPeriodMonth,
  isValidPeriodMonth,
} from "@/lib/cash-flow";
import { getDb } from "@/lib/db";
import { monthlyClosings } from "@/lib/db/schema";
import type { MonthlyClosing } from "@/types";

function assertValidPeriodMonth(periodMonth: string) {
  if (!isValidPeriodMonth(periodMonth)) {
    throw new Error("periodMonth inválido. Use YYYY-MM.");
  }
}

export async function listMonthlyClosings(year?: number): Promise<MonthlyClosing[]> {
  const db = getDb();

  if (typeof year === "number") {
    return db
      .select()
      .from(monthlyClosings)
      .where(like(monthlyClosings.periodMonth, `${year}-%`))
      .orderBy(asc(monthlyClosings.periodMonth));
  }

  return db.select().from(monthlyClosings).orderBy(asc(monthlyClosings.periodMonth));
}

export async function getMonthlyClosing(
  periodMonth: string
): Promise<MonthlyClosing | null> {
  assertValidPeriodMonth(periodMonth);
  const db = getDb();
  const result = await db
    .select()
    .from(monthlyClosings)
    .where(eq(monthlyClosings.periodMonth, periodMonth))
    .limit(1);

  return result[0] ?? null;
}

export async function isMonthClosed(periodMonth: string): Promise<boolean> {
  const closing = await getMonthlyClosing(periodMonth);
  return Boolean(closing);
}

export async function closeMonth(
  periodMonth: string,
  notes: string | null = null
): Promise<MonthlyClosing> {
  assertValidPeriodMonth(periodMonth);

  if (!canClosePeriodMonth(periodMonth)) {
    throw new Error("Não é possível fechar mês futuro.");
  }

  const db = getDb();
  const current = await getMonthlyClosing(periodMonth);
  if (current) {
    return current;
  }

  const inserted = await db
    .insert(monthlyClosings)
    .values({
      periodMonth,
      status: "closed",
      notes,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) {
    return inserted[0];
  }

  const existing = await getMonthlyClosing(periodMonth);
  if (!existing) {
    throw new Error("Não foi possível fechar o mês.");
  }

  if (notes !== null) {
    const updated = await db
      .update(monthlyClosings)
      .set({
        notes,
        updatedAt: sql`now()`,
      })
      .where(eq(monthlyClosings.periodMonth, periodMonth))
      .returning();
    return updated[0] ?? existing;
  }

  return existing;
}

export async function reopenMonth(periodMonth: string): Promise<boolean> {
  assertValidPeriodMonth(periodMonth);
  const db = getDb();

  const deleted = await db
    .delete(monthlyClosings)
    .where(eq(monthlyClosings.periodMonth, periodMonth))
    .returning({ id: monthlyClosings.id });

  return deleted.length > 0;
}
