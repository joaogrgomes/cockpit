import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { debtValueUpdates, debts } from "@/lib/db/schema";
import {
  calcDifferenceFromPrevious,
  mapValueUpdatesToHistory,
  type ValueUpdateHistoryItem,
} from "@/lib/value-update-history";
import type { DebtValueUpdate, NewDebtValueUpdate } from "@/types";

export type ValueUpdateCreateInput = Pick<
  NewDebtValueUpdate,
  "debtId" | "recordedValue" | "recordedAt" | "source" | "notes"
>;

export type ValueUpdateCreateResult =
  | { ok: true; valueUpdate: DebtValueUpdate }
  | {
      ok: false;
      code: "DEBT_NOT_FOUND" | "UNKNOWN_ERROR";
      message: string;
    };

export { calcDifferenceFromPrevious, mapValueUpdatesToHistory };
export type { ValueUpdateHistoryItem };

export async function listValueUpdatesByDebtId(
  debtId: string
): Promise<DebtValueUpdate[]> {
  const db = getDb();

  return db
    .select()
    .from(debtValueUpdates)
    .where(eq(debtValueUpdates.debtId, debtId))
    .orderBy(asc(debtValueUpdates.recordedAt), asc(debtValueUpdates.createdAt));
}

export async function createDebtValueUpdate(
  input: ValueUpdateCreateInput
): Promise<ValueUpdateCreateResult> {
  const db = getDb();

  try {
    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(debtValueUpdates)
        .values({
          debtId: input.debtId,
          recordedValue: input.recordedValue,
          recordedAt: input.recordedAt,
          source: input.source ?? null,
          notes: input.notes ?? null,
        })
        .returning();

      await tx
        .update(debts)
        .set({
          currentValue: input.recordedValue,
          lastUpdatedAt: sql`now()`,
        })
        .where(eq(debts.id, input.debtId));

      return inserted[0];
    });

    return { ok: true, valueUpdate: created };
  } catch (error) {
    const code = (error as { code?: string })?.code;

    if (code === "23503") {
      return {
        ok: false,
        code: "DEBT_NOT_FOUND",
        message: "Dívida não encontrada.",
      };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Não foi possível registrar a atualização de valor.",
    };
  }
}
