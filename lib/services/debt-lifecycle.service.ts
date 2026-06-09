import "server-only";

import { eq, sql } from "drizzle-orm";
import { normalizeDateOnly } from "@/lib/date-utils";
import { validateDebtAttachmentFile } from "@/lib/debt-attachment-validation";
import { getDb } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import {
  createDebtAttachment,
  type CreateDebtAttachmentInput,
} from "@/lib/services/debt-attachment.service";
import type { Debt } from "@/types";

export type DebtLifecycleAttachmentInput = Omit<CreateDebtAttachmentInput, "debtId">;

export type MarkDebtAsPaidInput = {
  debtId: string;
  paidAt: string;
  paidAmount?: number | null;
  paymentMethod?: string | null;
  clearanceDueDate?: string | null;
  paymentNotes?: string | null;
  attachment?: DebtLifecycleAttachmentInput | null;
};

export type ConfirmDebtClearanceInput = {
  debtId: string;
  clearedAt: string;
  paymentNotes?: string | null;
  attachment?: DebtLifecycleAttachmentInput | null;
};

export type ArchiveDebtInput = {
  debtId: string;
};

export type DebtLifecycleResult =
  | { ok: true; debt: Debt }
  | { ok: false; code: "DEBT_NOT_FOUND" | "UNKNOWN_ERROR"; message: string };

function addDaysToDateOnly(dateOnly: string, days: number): string | null {
  const normalized = normalizeDateOnly(dateOnly);
  if (!normalized) return null;

  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  if ([year, month, day].some(Number.isNaN)) return null;

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return normalizeDateOnly(date);
}

export async function markDebtAsPaid(input: MarkDebtAsPaidInput): Promise<DebtLifecycleResult> {
  const db = getDb();

  try {
    if (input.attachment) {
      const validationError = validateDebtAttachmentFile(input.attachment.file);
      if (validationError) {
        return {
          ok: false,
          code: "UNKNOWN_ERROR",
          message: validationError,
        };
      }
    }

    const updated = await db.transaction(async (tx) => {
      const debtRows = await tx
        .select({ id: debts.id, currentValue: debts.currentValue })
        .from(debts)
        .where(eq(debts.id, input.debtId))
        .limit(1);

      const debtRow = debtRows[0];
      if (!debtRow) {
        return null;
      }

      const paidAmount = input.paidAmount ?? debtRow.currentValue;
      const clearanceDueDate = input.clearanceDueDate ?? addDaysToDateOnly(input.paidAt, 7);

      const result = await tx
        .update(debts)
        .set({
          status: "aguardando_baixa",
          paidAt: input.paidAt,
          paidAmount,
          paymentMethod: input.paymentMethod ?? null,
          clearanceDueDate,
          clearedAt: null,
          archivedAt: null,
          paymentNotes: input.paymentNotes ?? null,
          lastUpdatedAt: sql`now()`,
        })
        .where(eq(debts.id, input.debtId))
        .returning();

      return result[0] ?? null;
    });

    if (!updated) {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    if (input.attachment) {
      await createDebtAttachment({
        debtId: input.debtId,
        type: input.attachment.type,
        file: input.attachment.file,
        notes: input.attachment.notes ?? null,
      });
    }

    return { ok: true, debt: updated };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23503") {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Não foi possível registrar a dívida como paga.",
    };
  }
}

export async function confirmDebtClearance(
  input: ConfirmDebtClearanceInput
): Promise<DebtLifecycleResult> {
  const db = getDb();

  try {
    if (input.attachment) {
      const validationError = validateDebtAttachmentFile(input.attachment.file);
      if (validationError) {
        return {
          ok: false,
          code: "UNKNOWN_ERROR",
          message: validationError,
        };
      }
    }

    const updated = await db.transaction(async (tx) => {
      const result = await tx
        .update(debts)
        .set({
          status: "baixada",
          clearedAt: input.clearedAt,
          paymentNotes: input.paymentNotes ?? null,
          lastUpdatedAt: sql`now()`,
        })
        .where(eq(debts.id, input.debtId))
        .returning();

      return result[0] ?? null;
    });

    if (!updated) {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    if (input.attachment) {
      await createDebtAttachment({
        debtId: input.debtId,
        type: input.attachment.type,
        file: input.attachment.file,
        notes: input.attachment.notes ?? null,
      });
    }

    return { ok: true, debt: updated };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23503") {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Não foi possível confirmar a baixa da dívida.",
    };
  }
}

export async function archiveDebt(input: ArchiveDebtInput): Promise<DebtLifecycleResult> {
  const db = getDb();

  try {
    const updated = await db.transaction(async (tx) => {
      const result = await tx
        .update(debts)
        .set({
          status: "arquivada",
          archivedAt: sql`now()`,
          lastUpdatedAt: sql`now()`,
        })
        .where(eq(debts.id, input.debtId))
        .returning();

      return result[0] ?? null;
    });

    if (!updated) {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    return { ok: true, debt: updated };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23503") {
      return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Não foi possível arquivar a dívida.",
    };
  }
}
