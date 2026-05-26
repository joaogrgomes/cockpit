"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createMonthlyExpense,
  deleteMonthlyExpense,
  toggleMonthlyExpenseActive,
  updateMonthlyExpense,
} from "@/lib/services/monthly-expense.service";
import { MonthlyExpenseSchema } from "@/lib/validations";

type ExpenseActionResult = {
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

function parseExpenseFormData(formData: FormData) {
  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    category: parseOptionalText(formData.get("category")) ?? "",
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    expenseType: parseOptionalText(formData.get("expenseType")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    dueDay: parseOptionalIntegerOrNull(formData.get("dueDay")),
    dueLabel: parseOptionalTextOrNull(formData.get("dueLabel")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
    isActive: parseOptionalBoolean(formData.get("isActive")) ?? true,
  };

  return MonthlyExpenseSchema.safeParse(payload);
}

export async function createMonthlyExpenseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const parsed = parseExpenseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyExpense(parsed.data);
  revalidatePath("/expenses");

  return { ok: true };
}

export async function updateMonthlyExpenseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do gasto é obrigatório" };
  }

  const parsed = parseExpenseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await updateMonthlyExpense(idValue, parsed.data);
  if (!updated) {
    return { ok: false, error: "Gasto não encontrado" };
  }

  revalidatePath("/expenses");
  return { ok: true };
}

export async function deleteMonthlyExpenseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do gasto é obrigatório" };
  }

  const deleted = await deleteMonthlyExpense(idValue);
  if (!deleted) {
    return { ok: false, error: "Gasto não encontrado" };
  }

  revalidatePath("/expenses");
  return { ok: true };
}

export async function toggleMonthlyExpenseActiveAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do gasto é obrigatório" };
  }

  const updated = await toggleMonthlyExpenseActive(idValue);
  if (!updated) {
    return { ok: false, error: "Gasto não encontrado" };
  }

  revalidatePath("/expenses");
  return { ok: true };
}
