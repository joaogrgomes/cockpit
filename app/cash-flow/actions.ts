"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import { upsertCashFlowSettings } from "@/lib/services/cash-flow.service";
import { CashFlowSettingsSchema } from "@/lib/validations";

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
