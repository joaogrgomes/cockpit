"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createMonthlyExpenseEntry,
  deleteMonthlyExpenseEntry,
} from "@/lib/services/monthly-expense-entry.service";
import { MonthlyExpenseEntrySchema } from "@/lib/validations";

type ExpenseEntryActionResult = {
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
    monthlyExpenseId: parseOptionalText(formData.get("monthlyExpenseId")) ?? null,
    name: parseOptionalTextOrNull(formData.get("name")),
    category: parseOptionalTextOrNull(formData.get("category")),
    expenseType: parseOptionalTextOrNull(formData.get("expenseType")),
    occurrenceType: parseOptionalTextOrNull(formData.get("occurrenceType")),
    periodMonth: parseOptionalText(formData.get("periodMonth")) ?? "",
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    paidAt: parseOptionalText(formData.get("paidAt")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return MonthlyExpenseEntrySchema.safeParse(payload);
}

function revalidateExpensePages() {
  revalidatePath("/expenses");
  revalidatePath("/expenses/tracking");
  revalidatePath("/cash-flow");
  revalidatePath("/expenses/future");
  revalidatePath("/statement");
}

export async function createMonthlyExpenseEntryAction(
  formData: FormData
): Promise<ExpenseEntryActionResult> {
  const parsed = parseEntryFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyExpenseEntry(parsed.data);
  revalidateExpensePages();

  return { ok: true };
}

export async function createOneTimeExpenseEntryAction(
  formData: FormData
): Promise<ExpenseEntryActionResult> {
  const mutableFormData = new FormData();
  for (const [key, value] of formData.entries()) {
    mutableFormData.set(key, value);
  }
  mutableFormData.set("monthlyExpenseId", "");

  const parsed = parseEntryFormData(mutableFormData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyExpenseEntry({
    ...parsed.data,
    monthlyExpenseId: null,
  });
  revalidateExpensePages();

  return { ok: true };
}

export async function deleteMonthlyExpenseEntryAction(
  formData: FormData
): Promise<ExpenseEntryActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do lançamento é obrigatório" };
  }

  const deleted = await deleteMonthlyExpenseEntry(idValue);
  if (!deleted) {
    return { ok: false, error: "Lançamento não encontrado" };
  }

  revalidateExpensePages();
  return { ok: true };
}
