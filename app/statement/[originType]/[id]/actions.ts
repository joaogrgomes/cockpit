"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseBRL } from "@/lib/calculations";
import { isStatementOriginType } from "@/lib/statement";
import {
  deleteStatementEntry,
  getStatementEntryDetail,
  updateStatementEntry,
} from "@/lib/services/statement-entry.service";

export type StatementEntryActionResult = {
  ok: boolean;
  error?: string;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseOptionalTextOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseMoneyToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return parseBRL(trimmed);
}

function parseDateOnly(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || !DATE_ONLY_REGEX.test(trimmed)) return undefined;
  return trimmed;
}

function revalidateStatementPaths(periodMonth: string) {
  revalidatePath("/statement");
  revalidatePath(`/statement?month=${periodMonth}`);
  revalidatePath("/expenses/tracking");
  revalidatePath("/incomes/tracking");
  revalidatePath("/cash-flow");
  revalidatePath("/dashboard");
}

function getOriginTypeValue(formData: FormData): string {
  return parseOptionalText(formData.get("originType")) ?? "";
}

function getIdValue(formData: FormData): string {
  return parseOptionalText(formData.get("id")) ?? "";
}

function getPeriodMonthValue(formData: FormData): string {
  return parseOptionalText(formData.get("periodMonth")) ?? "";
}

function buildUpdatePayload(formData: FormData) {
  return {
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    date: parseDateOnly(formData.get("date")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
    description: parseOptionalTextOrNull(formData.get("description")),
    category: parseOptionalTextOrNull(formData.get("category")),
    expenseType: parseOptionalTextOrNull(formData.get("expenseType")),
  };
}

export async function updateStatementEntryAction(
  formData: FormData
): Promise<StatementEntryActionResult> {
  const originType = getOriginTypeValue(formData);
  const id = getIdValue(formData);

  if (!isStatementOriginType(originType) || !id) {
    return { ok: false, error: "Lançamento inválido" };
  }

  const existing = await getStatementEntryDetail(originType, id);
  if (!existing) {
    return { ok: false, error: "Lançamento não encontrado" };
  }

  const payload = buildUpdatePayload(formData);
  if (!payload.date) {
    return { ok: false, error: "Data inválida" };
  }

  if (payload.amount <= 0) {
    return { ok: false, error: "Valor deve ser maior que zero" };
  }

  if (existing.source === "one_time") {
    if (!payload.description) {
      return { ok: false, error: "Descrição é obrigatória para lançamento avulso" };
    }

    if (!payload.category) {
      return { ok: false, error: "Categoria é obrigatória para lançamento avulso" };
    }

    if (existing.kind === "expense" && !payload.expenseType) {
      return { ok: false, error: "Tipo é obrigatório para gasto avulso" };
    }
  }

  const updated = await updateStatementEntry(originType, id, payload);
  if (!updated) {
    return { ok: false, error: "Não foi possível atualizar o lançamento" };
  }

  revalidateStatementPaths(updated.periodMonth);
  return { ok: true };
}

export async function deleteStatementEntryAction(
  formData: FormData
): Promise<StatementEntryActionResult> {
  const originType = getOriginTypeValue(formData);
  const id = getIdValue(formData);
  const periodMonth = getPeriodMonthValue(formData);

  if (!isStatementOriginType(originType) || !id) {
    return { ok: false, error: "Lançamento inválido" };
  }

  const deleted = await deleteStatementEntry(originType, id);
  if (!deleted) {
    return { ok: false, error: "Lançamento não encontrado" };
  }

  const redirectPeriodMonth = periodMonth || deleted.periodMonth;
  revalidateStatementPaths(redirectPeriodMonth);
  redirect(`/statement?month=${redirectPeriodMonth}`);
}
