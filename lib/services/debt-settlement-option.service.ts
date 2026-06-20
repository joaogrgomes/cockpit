import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { normalizeDateOnly } from "@/lib/date-utils";
import { getDb } from "@/lib/db";
import { debtSettlementOptions, debts } from "@/lib/db/schema";
import {
  normalizeDebtSettlementOptionUpsertInput,
  parseDebtSettlementOptionKind,
  parseDebtSettlementOptionStatus,
  type DebtSettlementOptionUpsertInput,
} from "@/lib/debt-settlement-options";
import type { DebtSettlementOption } from "@/types";

type DbClient = ReturnType<typeof getDb>;

export type DebtSettlementOptionMutationResult =
  | { ok: true; option: DebtSettlementOption }
  | { ok: false; code: "DEBT_NOT_FOUND" | "OPTION_NOT_FOUND" | "INVALID_INPUT" | "UNKNOWN_ERROR"; error: string };

function mapDebtSettlementOptionRow(row: {
  id: string;
  debtId: string;
  kind: string;
  installments: number;
  totalAmountCents: number;
  upfrontAmountCents: number;
  monthlyInstallmentCents: number | null;
  firstDueDate: string | Date | null;
  validUntil: string | Date | null;
  status: string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}): DebtSettlementOption {
  return {
    ...row,
    kind: parseDebtSettlementOptionKind(row.kind),
    status: parseDebtSettlementOptionStatus(row.status),
    firstDueDate: normalizeDateOnly(row.firstDueDate),
    validUntil: normalizeDateOnly(row.validUntil),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

async function getDebtSettlementOptionById(
  db: Pick<DbClient, "select">,
  id: string
): Promise<DebtSettlementOption | null> {
  const rows = await db.select().from(debtSettlementOptions).where(eq(debtSettlementOptions.id, id)).limit(1);
  const row = rows[0];
  return row ? mapDebtSettlementOptionRow(row) : null;
}

function buildOptionOrderByClause() {
  return [
    sql<number>`case ${debtSettlementOptions.status}
      when 'accepted' then 0
      when 'active' then 1
      when 'expired' then 2
      when 'rejected' then 3
      else 4
    end`,
    desc(debtSettlementOptions.createdAt),
    asc(debtSettlementOptions.id),
  ];
}

function getDebtStatusForAcceptedOptionKind(kind: DebtSettlementOption["kind"]) {
  return kind === "cash" ? "aguardando_baixa" : "parcelada";
}

export async function listDebtSettlementOptions(debtId: string): Promise<DebtSettlementOption[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(debtSettlementOptions)
    .where(eq(debtSettlementOptions.debtId, debtId))
    .orderBy(...buildOptionOrderByClause());

  return rows
    .map((row) => mapDebtSettlementOptionRow(row))
    .filter((option) => option.status !== "archived");
}

export async function createDebtSettlementOption(
  input: DebtSettlementOptionUpsertInput & { debtId: string }
): Promise<DebtSettlementOptionMutationResult> {
  const normalized = normalizeDebtSettlementOptionUpsertInput(input);
  if (!normalized.ok) {
    return { ok: false, code: "INVALID_INPUT", error: normalized.error };
  }

  const db = getDb();
  const [debt] = await db.select({ id: debts.id }).from(debts).where(eq(debts.id, input.debtId)).limit(1);
  if (!debt) {
    return { ok: false, code: "DEBT_NOT_FOUND", error: "Dívida não encontrada." };
  }

  try {
    const inserted = await db
      .insert(debtSettlementOptions)
      .values({
        debtId: input.debtId,
        kind: normalized.value.kind,
        installments: normalized.value.installments,
        totalAmountCents: normalized.value.totalAmountCents,
        upfrontAmountCents: normalized.value.upfrontAmountCents,
        monthlyInstallmentCents: normalized.value.monthlyInstallmentCents,
        firstDueDate: normalized.value.firstDueDate,
        validUntil: normalized.value.validUntil,
        status: "active",
        notes: normalized.value.notes,
        updatedAt: sql`now()`,
      })
      .returning();

    const option = inserted[0];
    return option
      ? { ok: true, option: mapDebtSettlementOptionRow(option) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível criar a opção de liquidação." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível criar a opção de liquidação.",
    };
  }
}

export async function updateDebtSettlementOption(
  id: string,
  input: DebtSettlementOptionUpsertInput
): Promise<DebtSettlementOptionMutationResult> {
  const normalized = normalizeDebtSettlementOptionUpsertInput(input);
  if (!normalized.ok) {
    return { ok: false, code: "INVALID_INPUT", error: normalized.error };
  }

  const db = getDb();
  const existing = await getDebtSettlementOptionById(db, id);
  if (!existing) {
    return { ok: false, code: "OPTION_NOT_FOUND", error: "Opção de liquidação não encontrada." };
  }

  if (existing.status === "archived") {
    return { ok: false, code: "INVALID_INPUT", error: "Opção arquivada não pode ser editada." };
  }

  try {
    const updated = await db
      .update(debtSettlementOptions)
      .set({
        kind: normalized.value.kind,
        installments: normalized.value.installments,
        totalAmountCents: normalized.value.totalAmountCents,
        upfrontAmountCents: normalized.value.upfrontAmountCents,
        monthlyInstallmentCents: normalized.value.monthlyInstallmentCents,
        firstDueDate: normalized.value.firstDueDate,
        validUntil: normalized.value.validUntil,
        notes: normalized.value.notes,
        updatedAt: sql`now()`,
      })
      .where(eq(debtSettlementOptions.id, id))
      .returning();

    const option = updated[0];
    return option
      ? { ok: true, option: mapDebtSettlementOptionRow(option) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível atualizar a opção de liquidação." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível atualizar a opção de liquidação.",
    };
  }
}

export async function archiveDebtSettlementOption(id: string): Promise<DebtSettlementOptionMutationResult> {
  const db = getDb();
  const existing = await getDebtSettlementOptionById(db, id);
  if (!existing) {
    return { ok: false, code: "OPTION_NOT_FOUND", error: "Opção de liquidação não encontrada." };
  }

  try {
    const updated = await db
      .update(debtSettlementOptions)
      .set({
        status: "archived",
        updatedAt: sql`now()`,
      })
      .where(eq(debtSettlementOptions.id, id))
      .returning();

    const option = updated[0];
    return option
      ? { ok: true, option: mapDebtSettlementOptionRow(option) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível arquivar a opção de liquidação." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível arquivar a opção de liquidação.",
    };
  }
}

export async function markDebtSettlementOptionAsAccepted(
  id: string
): Promise<DebtSettlementOptionMutationResult> {
  const db = getDb();

  try {
    const result = await db.transaction(async (tx) => {
      const existing = await getDebtSettlementOptionById(tx, id);
      if (!existing) {
        return { ok: false as const, code: "OPTION_NOT_FOUND" as const, error: "Opção de liquidação não encontrada." };
      }

      if (existing.status === "archived") {
        return { ok: false as const, code: "INVALID_INPUT" as const, error: "Opção arquivada não pode ser aceita." };
      }

      await tx
        .update(debtSettlementOptions)
        .set({
          status: "active",
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(debtSettlementOptions.debtId, existing.debtId),
            eq(debtSettlementOptions.status, "accepted"),
            ne(debtSettlementOptions.id, existing.id)
          )
        );

      const updated = await tx
        .update(debtSettlementOptions)
        .set({
          status: "accepted",
          updatedAt: sql`now()`,
        })
        .where(eq(debtSettlementOptions.id, id))
        .returning();

      const option = updated[0];
      if (!option) {
        return { ok: false as const, code: "UNKNOWN_ERROR" as const, error: "Não foi possível aceitar a opção." };
      }

      const debtUpdate = await tx
        .update(debts)
        .set({
          status: getDebtStatusForAcceptedOptionKind(option.kind),
          lastUpdatedAt: sql`now()`,
        })
        .where(eq(debts.id, option.debtId))
        .returning();

      if (!debtUpdate[0]) {
        throw new Error("Não foi possível atualizar a dívida.");
      }

      return { ok: true as const, option: mapDebtSettlementOptionRow(option) };
    });

    return result;
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível aceitar a opção.",
    };
  }
}

export async function markDebtSettlementOptionAsRejected(
  id: string
): Promise<DebtSettlementOptionMutationResult> {
  const db = getDb();
  const existing = await getDebtSettlementOptionById(db, id);
  if (!existing) {
    return { ok: false, code: "OPTION_NOT_FOUND", error: "Opção de liquidação não encontrada." };
  }

  if (existing.status === "archived") {
    return { ok: false, code: "INVALID_INPUT", error: "Opção arquivada não pode ser recusada." };
  }

  try {
    const updated = await db
      .update(debtSettlementOptions)
      .set({
        status: "rejected",
        updatedAt: sql`now()`,
      })
      .where(eq(debtSettlementOptions.id, id))
      .returning();

    const option = updated[0];
    return option
      ? { ok: true, option: mapDebtSettlementOptionRow(option) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível recusar a opção." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível recusar a opção.",
    };
  }
}
