"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import { upsertCashFlowSettings } from "@/lib/services/cash-flow.service";
import { closeMonth, reopenMonth } from "@/lib/services/monthly-closing.service";
import { CashFlowSettingsSchema, MonthlyClosingSchema } from "@/lib/validations";

type CashFlowActionResult = {
  ok: boolean;
  error?: string;
};

function parseOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseMoneyToCentsAllowNegative(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return parseBRL(trimmed);
}

export async function upsertCashFlowSettingsAction(
  formData: FormData
): Promise<CashFlowActionResult> {
  const payload = {
    startMonth: parseOptionalText(formData.get("startMonth")) ?? "",
    initialBalance: parseMoneyToCentsAllowNegative(formData.get("initialBalance")) ?? 0,
  };

  const parsed = CashFlowSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await upsertCashFlowSettings(parsed.data);
  revalidatePath("/cash-flow");

  return { ok: true };
}

function revalidateClosingPaths() {
  revalidatePath("/cash-flow");
  revalidatePath("/expenses/tracking");
  revalidatePath("/incomes/tracking");
}

export async function closeMonthAction(
  formData: FormData
): Promise<CashFlowActionResult> {
  const payload = {
    periodMonth: parseOptionalText(formData.get("periodMonth")) ?? "",
  };

  const parsed = MonthlyClosingSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Período inválido" };
  }

  try {
    await closeMonth(parsed.data.periodMonth);
    revalidateClosingPaths();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível fechar o mês.";
    return { ok: false, error: message };
  }
}

export async function reopenMonthAction(
  formData: FormData
): Promise<CashFlowActionResult> {
  const payload = {
    periodMonth: parseOptionalText(formData.get("periodMonth")) ?? "",
  };

  const parsed = MonthlyClosingSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Período inválido" };
  }

  await reopenMonth(parsed.data.periodMonth);
  revalidateClosingPaths();
  return { ok: true };
}
