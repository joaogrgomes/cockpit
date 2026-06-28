"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createMonthlyIncome,
  deleteMonthlyIncome,
  toggleMonthlyIncomeActive,
  updateMonthlyIncome,
} from "@/lib/services/monthly-income.service";
import { MonthlyIncomeSchema } from "@/lib/validations";

type IncomeActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateIncomePages() {
  revalidatePath("/incomes");
  revalidatePath("/incomes/tracking");
  revalidatePath("/budget-areas");
}

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

function parseOptionalIntegerOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== "string") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
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

function parseIncomeFormData(formData: FormData) {
  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    category: parseOptionalText(formData.get("category")) ?? "",
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    expectedDay: parseOptionalIntegerOrNull(formData.get("expectedDay")),
    startMonth: parseOptionalText(formData.get("startMonth")) ?? "",
    endMonth: parseOptionalTextOrNull(formData.get("endMonth")),
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
    isActive: parseOptionalBoolean(formData.get("isActive")) ?? true,
  };

  return MonthlyIncomeSchema.safeParse(payload);
}

export async function createMonthlyIncomeAction(
  formData: FormData
): Promise<IncomeActionResult> {
  const parsed = parseIncomeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyIncome(parsed.data);
  revalidateIncomePages();

  return { ok: true };
}

export async function updateMonthlyIncomeAction(
  formData: FormData
): Promise<IncomeActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da entrada é obrigatório" };
  }

  const parsed = parseIncomeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await updateMonthlyIncome(idValue, parsed.data);
  if (!updated) {
    return { ok: false, error: "Entrada não encontrada" };
  }

  revalidateIncomePages();
  return { ok: true };
}

export async function deleteMonthlyIncomeAction(
  formData: FormData
): Promise<IncomeActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da entrada é obrigatório" };
  }

  const deleted = await deleteMonthlyIncome(idValue);
  if (!deleted) {
    return { ok: false, error: "Entrada não encontrada" };
  }

  revalidateIncomePages();
  return { ok: true };
}

export async function toggleMonthlyIncomeActiveAction(
  formData: FormData
): Promise<IncomeActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da entrada é obrigatório" };
  }

  const updated = await toggleMonthlyIncomeActive(idValue);
  if (!updated) {
    return { ok: false, error: "Entrada não encontrada" };
  }

  revalidateIncomePages();
  return { ok: true };
}
