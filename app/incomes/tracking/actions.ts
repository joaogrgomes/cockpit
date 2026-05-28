"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createMonthlyIncomeEntry,
  deleteMonthlyIncomeEntry,
} from "@/lib/services/monthly-income-entry.service";
import { MonthlyIncomeEntrySchema } from "@/lib/validations";

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

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

function parseEntryFormData(formData: FormData) {
  const payload = {
    monthlyIncomeId: parseOptionalText(formData.get("monthlyIncomeId")) ?? null,
    name: parseOptionalTextOrNull(formData.get("name")),
    category: parseOptionalTextOrNull(formData.get("category")),
    periodMonth: parseOptionalText(formData.get("periodMonth")) ?? "",
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    receivedAt: parseOptionalText(formData.get("receivedAt")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return MonthlyIncomeEntrySchema.safeParse(payload);
}

function revalidateIncomePages() {
  revalidatePath("/incomes");
  revalidatePath("/incomes/tracking");
  revalidatePath("/cash-flow");
}

export async function createMonthlyIncomeEntryAction(
  formData: FormData
): Promise<IncomeEntryActionResult> {
  const parsed = parseEntryFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyIncomeEntry(parsed.data);
  revalidateIncomePages();

  return { ok: true };
}

export async function createOneTimeIncomeEntryAction(
  formData: FormData
): Promise<IncomeEntryActionResult> {
  const parsed = parseEntryFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyIncomeEntry({
    ...parsed.data,
    monthlyIncomeId: null,
  });
  revalidateIncomePages();

  return { ok: true };
}

export async function deleteMonthlyIncomeEntryAction(
  formData: FormData
): Promise<IncomeEntryActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do lançamento é obrigatório" };
  }

  const deleted = await deleteMonthlyIncomeEntry(idValue);
  if (!deleted) {
    return { ok: false, error: "Lançamento não encontrado" };
  }

  revalidateIncomePages();
  return { ok: true };
}
