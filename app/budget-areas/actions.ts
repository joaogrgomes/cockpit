"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import { upsertBudgetAreaSettings } from "@/lib/services/budget-areas.service";
import { BudgetAreaSettingsSchema } from "@/lib/validations";

export type BudgetAreasActionResult = {
  ok: boolean;
  error?: string;
};

function parseMoneyToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return parseBRL(trimmed);
}

function parsePercent(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function saveBudgetAreaSettingsAction(
  formData: FormData
): Promise<BudgetAreasActionResult> {
  const payload = {
    baseIncomeCents: parseMoneyToCents(formData.get("baseIncomeCents")) ?? 0,
    needsPercent: parsePercent(formData.get("needsPercent")) ?? 0,
    debtPaymentPercent: parsePercent(formData.get("debtPaymentPercent")) ?? 0,
    emergencyReservePercent: parsePercent(formData.get("emergencyReservePercent")) ?? 0,
    flexiblePercent: parsePercent(formData.get("flexiblePercent")) ?? 0,
  };

  const parsed = BudgetAreaSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    await upsertBudgetAreaSettings(parsed.data);
    revalidatePath("/budget-areas");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a configuração.";
    return { ok: false, error: message };
  }
}
