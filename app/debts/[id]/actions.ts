"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  archiveDebtSettlementOption,
  createDebtSettlementOption,
  markDebtSettlementOptionAsAccepted,
  markDebtSettlementOptionAsRejected,
  updateDebtSettlementOption,
} from "@/lib/services/debt-settlement-option.service";

type DebtSettlementOptionActionResult = {
  ok: boolean;
  error?: string;
};

function parseOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalTextOrNull(value: FormDataEntryValue | null): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  return Number.parseInt(trimmed, 10);
}

function parseMoneyToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const digitsOnly = /^\d+$/.test(trimmed);
  if (digitsOnly) {
    return Number.parseInt(trimmed, 10);
  }

  const parsed = parseBRL(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalDateOrNull(value: FormDataEntryValue | null): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseKind(value: FormDataEntryValue | null): string | undefined {
  return parseOptionalText(value);
}

function revalidateDebtSettlementOptionPaths(debtId: string) {
  revalidatePath(`/debts/${debtId}`);
  revalidatePath("/debts");
}

export async function saveDebtSettlementOptionAction(
  formData: FormData
): Promise<DebtSettlementOptionActionResult> {
  const debtId = parseOptionalText(formData.get("debtId"));
  const optionId = parseOptionalText(formData.get("optionId"));
  const kind = parseKind(formData.get("kind"));
  const installments = parseOptionalInteger(formData.get("installments"));
  const totalAmountCents = parseMoneyToCents(formData.get("totalAmount"));
  const upfrontAmountCents = parseMoneyToCents(formData.get("upfrontAmount"));
  const monthlyInstallmentCents = parseMoneyToCents(formData.get("monthlyInstallment"));
  const firstDueDate = parseOptionalDateOrNull(formData.get("firstDueDate"));
  const validUntil = parseOptionalDateOrNull(formData.get("validUntil"));
  const notes = parseOptionalTextOrNull(formData.get("notes"));

  if (!debtId) {
    return { ok: false, error: "ID da dívida é obrigatório." };
  }

  if (!kind) {
    return { ok: false, error: "Tipo de liquidação é obrigatório." };
  }

  const normalizedInstallments = kind === "cash" ? installments ?? 1 : installments;

  if (typeof normalizedInstallments !== "number" || typeof totalAmountCents !== "number") {
    return { ok: false, error: "Preencha parcelas e valor total." };
  }

  const payload = {
    kind,
    installments: normalizedInstallments,
    totalAmountCents,
    upfrontAmountCents,
    monthlyInstallmentCents,
    firstDueDate,
    validUntil,
    notes,
  };

  const result = optionId
    ? await updateDebtSettlementOption(optionId, payload)
    : await createDebtSettlementOption({ debtId, ...payload });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDebtSettlementOptionPaths(debtId);
  return { ok: true };
}

export async function archiveDebtSettlementOptionAction(
  formData: FormData
): Promise<DebtSettlementOptionActionResult> {
  const debtId = parseOptionalText(formData.get("debtId"));
  const optionId = parseOptionalText(formData.get("optionId"));

  if (!debtId || !optionId) {
    return { ok: false, error: "Opção de liquidação inválida." };
  }

  const result = await archiveDebtSettlementOption(optionId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDebtSettlementOptionPaths(debtId);
  return { ok: true };
}

export async function acceptDebtSettlementOptionAction(
  formData: FormData
): Promise<DebtSettlementOptionActionResult> {
  const debtId = parseOptionalText(formData.get("debtId"));
  const optionId = parseOptionalText(formData.get("optionId"));

  if (!debtId || !optionId) {
    return { ok: false, error: "Opção de liquidação inválida." };
  }

  const result = await markDebtSettlementOptionAsAccepted(optionId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDebtSettlementOptionPaths(debtId);
  return { ok: true };
}

export async function rejectDebtSettlementOptionAction(
  formData: FormData
): Promise<DebtSettlementOptionActionResult> {
  const debtId = parseOptionalText(formData.get("debtId"));
  const optionId = parseOptionalText(formData.get("optionId"));

  if (!debtId || !optionId) {
    return { ok: false, error: "Opção de liquidação inválida." };
  }

  const result = await markDebtSettlementOptionAsRejected(optionId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateDebtSettlementOptionPaths(debtId);
  return { ok: true };
}
