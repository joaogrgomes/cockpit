"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { createDebt, deleteDebt, updateDebt } from "@/lib/services/debt.service";
import { createActiveProposal } from "@/lib/services/proposal.service";
import { createDebtValueUpdate } from "@/lib/services/value-update.service";
import {
  DebtProposalSchema,
  DebtSchema,
  DebtValueUpdateSchema,
} from "@/lib/validations";

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

function parseOptionalTextOrNullForUpdate(
  value: FormDataEntryValue | null
): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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

function parseDebtFormData(formData: FormData, mode: "create" | "update") {
  const status = parseOptionalText(formData.get("status"));
  const perceivedRisk =
    mode === "update"
      ? parseOptionalTextOrNullForUpdate(formData.get("perceivedRisk"))
      : parseOptionalText(formData.get("perceivedRisk"));

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
    perceivedRisk,
    notes: parseOptionalText(formData.get("notes")),
    tags: parseTags(formData.get("tags")),
  };

  return DebtSchema.safeParse(payload);
}

export async function createDebtAction(formData: FormData): Promise<DebtActionResult> {
  const parsed = parseDebtFormData(formData, "create");

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

  const parsed = parseDebtFormData(formData, "update");
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

function parseProposalFormData(formData: FormData) {
  const debtId = parseOptionalText(formData.get("debtId")) ?? "";
  const proposedAt = parseOptionalDate(formData.get("proposedAt")) ?? "";

  const payload = {
    debtId,
    proposedValue: parseMoneyToCents(formData.get("proposedValue")) ?? 0,
    proposedAt,
    expiresAt: parseOptionalDate(formData.get("expiresAt")),
    origin: parseOptionalText(formData.get("origin")),
    status: "ativa" as const,
    notes: parseOptionalText(formData.get("notes")),
  };

  return DebtProposalSchema.safeParse(payload);
}

export async function createProposalAction(formData: FormData): Promise<DebtActionResult> {
  const parsed = parseProposalFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await createActiveProposal(parsed.data);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidatePath("/debts");
  revalidatePath(`/debts/${parsed.data.debtId}`);
  revalidatePath("/dashboard");

  return { ok: true };
}

function parseValueUpdateFormData(formData: FormData) {
  const debtId = parseOptionalText(formData.get("debtId")) ?? "";
  const recordedAt = parseOptionalDate(formData.get("recordedAt")) ?? "";

  const payload = {
    debtId,
    recordedValue: parseMoneyToCents(formData.get("recordedValue")) ?? 0,
    recordedAt,
    source: parseOptionalText(formData.get("source")),
    notes: parseOptionalText(formData.get("notes")),
  };

  return DebtValueUpdateSchema.safeParse(payload);
}

export async function createValueUpdateAction(
  formData: FormData
): Promise<DebtActionResult> {
  const parsed = parseValueUpdateFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await createDebtValueUpdate(parsed.data);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidatePath("/debts");
  revalidatePath(`/debts/${parsed.data.debtId}`);
  revalidatePath("/dashboard");

  return { ok: true };
}
