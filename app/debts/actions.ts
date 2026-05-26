"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { createDebt, deleteDebt, updateDebt } from "@/lib/services/debt.service";
import { DebtSchema } from "@/lib/validations";

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

function parseOptionalInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

function parseOptionalDate(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value;
}

function parseOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseMoneyToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const digitsOnly = /^\d+$/.test(trimmed);
  if (digitsOnly) {
    return Number.parseInt(trimmed, 10);
  }

  return parseBRL(trimmed);
}

function parseTags(value: FormDataEntryValue | null): string[] | undefined {
  if (typeof value !== "string") return undefined;

  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function parseDebtFormData(formData: FormData) {
  const status = parseOptionalText(formData.get("status"));

  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    creditor: parseOptionalText(formData.get("creditor")) ?? "",
    type: parseOptionalText(formData.get("type")) ?? "",
    status: status && DEBT_STATUS_VALUES.includes(status as (typeof DEBT_STATUS_VALUES)[number])
      ? status
      : "em_aberto",
    currentValue: parseMoneyToCents(formData.get("currentValue")) ?? 0,
    originalValue: parseMoneyToCents(formData.get("originalValue")),
    monthlyPayment: parseMoneyToCents(formData.get("monthlyPayment")),
    dueDay: parseOptionalInteger(formData.get("dueDay")),
    dueDate: parseOptionalDate(formData.get("dueDate")),
    totalInstallments: parseOptionalInteger(formData.get("totalInstallments")),
    paidInstallments: parseOptionalInteger(formData.get("paidInstallments")),
    overdueSince: parseOptionalDate(formData.get("overdueSince")),
    priority: parseOptionalText(formData.get("priority")),
    perceivedRisk: parseOptionalText(formData.get("perceivedRisk")),
    notes: parseOptionalText(formData.get("notes")),
    tags: parseTags(formData.get("tags")),
  };

  return DebtSchema.safeParse(payload);
}

export async function createDebtAction(formData: FormData): Promise<DebtActionResult> {
  const parsed = parseDebtFormData(formData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createDebt(parsed.data);
  revalidatePath("/debts");

  return { ok: true };
}

export async function updateDebtAction(formData: FormData): Promise<DebtActionResult> {
  const idValue = formData.get("id");

  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da dívida é obrigatório" };
  }

  const parsed = parseDebtFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await updateDebt(idValue, parsed.data);

  if (!updated) {
    return { ok: false, error: "Dívida não encontrada" };
  }

  revalidatePath("/debts");
  revalidatePath(`/debts/${idValue}`);

  return { ok: true };
}

export async function deleteDebtAction(formData: FormData): Promise<DebtActionResult> {
  const idValue = formData.get("id");

  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da dívida é obrigatório" };
  }

  const removed = await deleteDebt(idValue);

  if (!removed) {
    return { ok: false, error: "Dívida não encontrada" };
  }

  revalidatePath("/debts");

  return { ok: true };
}
