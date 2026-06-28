import "server-only";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { monthlyExpensePauses, monthlyExpenses } from "@/lib/db/schema";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";
import { type MonthlyExpense, type MonthlyExpensePause } from "@/types";

type DbClient = ReturnType<typeof getDb>;

export type MonthlyExpensePauseUpsertInput = {
  monthlyExpenseId: string;
  startMonth: string;
  endMonth?: string | null;
  reason?: string | null;
};

export type MonthlyExpensePauseMutationResult =
  | { ok: true; pause: MonthlyExpensePause }
  | {
      ok: false;
      code: "MONTHLY_EXPENSE_NOT_FOUND" | "PAUSE_NOT_FOUND" | "INVALID_INPUT" | "OVERLAP" | "UNKNOWN_ERROR";
      error: string;
    };

type MonthlyExpensePauseDbRow = MonthlyExpensePause;

function normalizePauseInput(input: MonthlyExpensePauseUpsertInput) {
  return {
    monthlyExpenseId: input.monthlyExpenseId,
    startMonth: input.startMonth,
    endMonth: input.endMonth ?? null,
    reason: input.reason?.trim() || null,
  };
}

function pauseRangesOverlap(
  left: { startMonth: string; endMonth: string | null },
  right: { startMonth: string; endMonth: string | null }
): boolean {
  const leftEndsAfterRightStarts = !left.endMonth || left.endMonth >= right.startMonth;
  const rightEndsAfterLeftStarts = !right.endMonth || right.endMonth >= left.startMonth;

  return leftEndsAfterRightStarts && rightEndsAfterLeftStarts;
}

function normalizePauseRow(row: MonthlyExpensePauseDbRow): MonthlyExpensePause {
  return {
    ...row,
    startMonth: row.startMonth,
    endMonth: row.endMonth ?? null,
  };
}

async function getMonthlyExpensePauseById(
  db: Pick<DbClient, "select">,
  id: string
): Promise<MonthlyExpensePause | null> {
  const rows = await db
    .select()
    .from(monthlyExpensePauses)
    .where(eq(monthlyExpensePauses.id, id))
    .limit(1);

  const row = rows[0] as MonthlyExpensePauseDbRow | undefined;
  return row ? normalizePauseRow(row) : null;
}

async function getMonthlyExpenseById(
  db: Pick<DbClient, "select">,
  id: string
): Promise<MonthlyExpense | null> {
  const rows = await db.select().from(monthlyExpenses).where(eq(monthlyExpenses.id, id)).limit(1);
  return (rows[0] as MonthlyExpense | undefined) ?? null;
}

async function getMonthlyExpensePausesForExpenseId(
  db: Pick<DbClient, "select">,
  monthlyExpenseId: string
): Promise<MonthlyExpensePause[]> {
  const rows = await db
    .select()
    .from(monthlyExpensePauses)
    .where(eq(monthlyExpensePauses.monthlyExpenseId, monthlyExpenseId))
    .orderBy(desc(monthlyExpensePauses.startMonth), desc(monthlyExpensePauses.createdAt));

  return rows.map((row) => normalizePauseRow(row as MonthlyExpensePauseDbRow));
}

async function getMonthlyExpensePausesForExpenseIdsInternal(
  db: Pick<DbClient, "select">,
  monthlyExpenseIds: string[]
): Promise<MonthlyExpensePause[]> {
  if (monthlyExpenseIds.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(monthlyExpensePauses)
    .where(inArray(monthlyExpensePauses.monthlyExpenseId, monthlyExpenseIds))
    .orderBy(desc(monthlyExpensePauses.startMonth), desc(monthlyExpensePauses.createdAt));

  return rows.map((row) => normalizePauseRow(row as MonthlyExpensePauseDbRow));
}

function hasOverlap(
  existingPauses: MonthlyExpensePause[],
  input: { startMonth: string; endMonth: string | null },
  excludePauseId?: string
): boolean {
  return existingPauses.some((pause) => {
    if (excludePauseId && pause.id === excludePauseId) {
      return false;
    }

    return pauseRangesOverlap(
      {
        startMonth: pause.startMonth,
        endMonth: pause.endMonth,
      },
      input
    );
  });
}

export async function listMonthlyExpensePauses(monthlyExpenseId: string): Promise<MonthlyExpensePause[]> {
  const db = getDb();
  return getMonthlyExpensePausesForExpenseId(db, monthlyExpenseId);
}

export async function listMonthlyExpensePausesByExpenseIds(
  monthlyExpenseIds: string[]
): Promise<MonthlyExpensePause[]> {
  const db = getDb();
  return getMonthlyExpensePausesForExpenseIdsInternal(db, monthlyExpenseIds);
}

export async function isMonthlyExpensePausedInMonth(
  monthlyExpenseId: string,
  periodMonth: string
): Promise<boolean> {
  const pauses = await listMonthlyExpensePauses(monthlyExpenseId);
  return pauses.some((pause) => isMonthWithinPeriod(periodMonth, pause.startMonth, pause.endMonth));
}

export async function createMonthlyExpensePause(
  input: MonthlyExpensePauseUpsertInput
): Promise<MonthlyExpensePauseMutationResult> {
  const db = getDb();
  const normalizedInput = normalizePauseInput(input);

  try {
    const monthlyExpense = await getMonthlyExpenseById(db, normalizedInput.monthlyExpenseId);
    if (!monthlyExpense) {
      return {
        ok: false,
        code: "MONTHLY_EXPENSE_NOT_FOUND",
        error: "Gasto mensal não encontrado.",
      };
    }

    const existingPauses = await getMonthlyExpensePausesForExpenseId(db, normalizedInput.monthlyExpenseId);
    if (hasOverlap(existingPauses, normalizedInput)) {
      return {
        ok: false,
        code: "OVERLAP",
        error: "Já existe uma pausa sobreposta para este gasto mensal.",
      };
    }

    const inserted = await db
      .insert(monthlyExpensePauses)
      .values({
        monthlyExpenseId: normalizedInput.monthlyExpenseId,
        startMonth: normalizedInput.startMonth,
        endMonth: normalizedInput.endMonth,
        reason: normalizedInput.reason,
        updatedAt: sql`now()`,
      })
      .returning();

    const pause = inserted[0] as MonthlyExpensePauseDbRow | undefined;
    return pause
      ? { ok: true, pause: normalizePauseRow(pause) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível criar a pausa." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível criar a pausa.",
    };
  }
}

export async function updateMonthlyExpensePause(
  id: string,
  input: Omit<MonthlyExpensePauseUpsertInput, "monthlyExpenseId">
): Promise<MonthlyExpensePauseMutationResult> {
  const db = getDb();

  try {
    const existing = await getMonthlyExpensePauseById(db, id);
    if (!existing) {
      return { ok: false, code: "PAUSE_NOT_FOUND", error: "Pausa não encontrada." };
    }

    const existingPauses = await getMonthlyExpensePausesForExpenseId(db, existing.monthlyExpenseId ?? "");
    const normalizedInput = {
      startMonth: input.startMonth,
      endMonth: input.endMonth ?? null,
      reason: input.reason?.trim() || null,
    };
    if (hasOverlap(existingPauses, normalizedInput, id)) {
      return {
        ok: false,
        code: "OVERLAP",
        error: "Já existe uma pausa sobreposta para este gasto mensal.",
      };
    }

    const updated = await db
      .update(monthlyExpensePauses)
      .set({
        startMonth: normalizedInput.startMonth,
        endMonth: normalizedInput.endMonth,
        reason: normalizedInput.reason,
        updatedAt: sql`now()`,
      })
      .where(eq(monthlyExpensePauses.id, id))
      .returning();

    const pause = updated[0] as MonthlyExpensePauseDbRow | undefined;
    return pause
      ? { ok: true, pause: normalizePauseRow(pause) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível atualizar a pausa." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível atualizar a pausa.",
    };
  }
}

export async function deleteMonthlyExpensePause(id: string): Promise<MonthlyExpensePauseMutationResult> {
  const db = getDb();

  try {
    const existing = await getMonthlyExpensePauseById(db, id);
    if (!existing) {
      return { ok: false, code: "PAUSE_NOT_FOUND", error: "Pausa não encontrada." };
    }

    const deleted = await db
      .delete(monthlyExpensePauses)
      .where(eq(monthlyExpensePauses.id, id))
      .returning();

    const pause = deleted[0] as MonthlyExpensePauseDbRow | undefined;
    return pause
      ? { ok: true, pause: normalizePauseRow(pause) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível excluir a pausa." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível excluir a pausa.",
    };
  }
}
