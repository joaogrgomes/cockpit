"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createMonthlyExpense,
  deleteMonthlyExpense,
  toggleMonthlyExpenseActive,
  updateMonthlyExpense,
} from "@/lib/services/monthly-expense.service";
import {
  createMonthlyExpensePause,
  deleteMonthlyExpensePause,
  updateMonthlyExpensePause,
} from "@/lib/services/monthly-expense-pause.service";
import { MonthlyExpensePauseSchema, MonthlyExpenseSchema } from "@/lib/validations";

type ExpenseActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateExpensePages() {
  revalidatePath("/expenses");
  revalidatePath("/expenses/tracking");
  revalidatePath("/budget-areas");
  revalidatePath("/statement");
  revalidatePath("/cash-flow");
  revalidatePath("/payment-agenda");
  revalidatePath("/statement/import");
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

function parseExpenseFormData(formData: FormData) {
  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    category: parseOptionalText(formData.get("category")) ?? "",
    amount: parseMoneyToCents(formData.get("amount")) ?? 0,
    expenseType: parseOptionalText(formData.get("expenseType")) ?? "",
    startMonth: parseOptionalText(formData.get("startMonth")) ?? "",
    endMonth: parseOptionalTextOrNull(formData.get("endMonth")),
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    dueDay: parseOptionalIntegerOrNull(formData.get("dueDay")),
    dueLabel: parseOptionalTextOrNull(formData.get("dueLabel")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
    isActive: parseOptionalBoolean(formData.get("isActive")) ?? true,
  };

  return MonthlyExpenseSchema.safeParse(payload);
}

function parseMonthlyExpensePauseFormData(formData: FormData) {
  const payload = {
    pauseId: parseOptionalTextOrNull(formData.get("pauseId")),
    monthlyExpenseId: parseOptionalText(formData.get("monthlyExpenseId")) ?? "",
    startMonth: parseOptionalText(formData.get("startMonth")) ?? "",
    endMonth: parseOptionalTextOrNull(formData.get("endMonth")),
    reason: parseOptionalTextOrNull(formData.get("reason")),
  };

  return MonthlyExpensePauseSchema.safeParse(payload);
}

export async function createMonthlyExpenseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const parsed = parseExpenseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createMonthlyExpense(parsed.data);
  revalidateExpensePages();

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

  revalidateExpensePages();
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

  revalidateExpensePages();
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

  revalidateExpensePages();
  return { ok: true };
}

export async function createMonthlyExpensePauseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const parsed = parseMonthlyExpensePauseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await createMonthlyExpensePause(parsed.data);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateExpensePages();
  return { ok: true };
}

export async function updateMonthlyExpensePauseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const pauseIdValue = formData.get("pauseId");
  if (typeof pauseIdValue !== "string" || !pauseIdValue) {
    return { ok: false, error: "ID da pausa é obrigatório" };
  }

  const parsed = parseMonthlyExpensePauseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await updateMonthlyExpensePause(pauseIdValue, {
    startMonth: parsed.data.startMonth,
    endMonth: parsed.data.endMonth,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateExpensePages();
  return { ok: true };
}

export async function deleteMonthlyExpensePauseAction(
  formData: FormData
): Promise<ExpenseActionResult> {
  const pauseIdValue = formData.get("pauseId");
  if (typeof pauseIdValue !== "string" || !pauseIdValue) {
    return { ok: false, error: "ID da pausa é obrigatório" };
  }

  const result = await deleteMonthlyExpensePause(pauseIdValue);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateExpensePages();
  return { ok: true };
}
