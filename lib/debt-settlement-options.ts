import { normalizeDateOnly } from "@/lib/date-utils";
import type { DebtSettlementOptionKind, DebtSettlementOptionStatus } from "@/types";

export function isDebtSettlementOptionKind(value: string): value is DebtSettlementOptionKind {
  return value === "cash" || value === "installment";
}

export function parseDebtSettlementOptionKind(value: string): DebtSettlementOptionKind {
  if (isDebtSettlementOptionKind(value)) {
    return value;
  }

  throw new Error(`Tipo de liquidação inválido: ${value}`);
}

export function isDebtSettlementOptionStatus(value: string): value is DebtSettlementOptionStatus {
  return (
    value === "active" ||
    value === "expired" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "archived"
  );
}

export function parseDebtSettlementOptionStatus(value: string): DebtSettlementOptionStatus {
  if (isDebtSettlementOptionStatus(value)) {
    return value;
  }

  throw new Error(`Status de liquidação inválido: ${value}`);
}

export type DebtSettlementOptionUpsertInput = {
  kind: string;
  installments: number;
  totalAmountCents: number;
  upfrontAmountCents?: number | null;
  monthlyInstallmentCents?: number | null;
  firstDueDate?: string | Date | null;
  validUntil?: string | Date | null;
  notes?: string | null;
};

export type NormalizedDebtSettlementOptionInput = {
  kind: DebtSettlementOptionKind;
  installments: number;
  totalAmountCents: number;
  upfrontAmountCents: number;
  monthlyInstallmentCents: number | null;
  firstDueDate: string | null;
  validUntil: string | null;
  notes: string | null;
};

export function normalizeDebtSettlementOptionUpsertInput(
  input: DebtSettlementOptionUpsertInput
): { ok: true; value: NormalizedDebtSettlementOptionInput } | { ok: false; error: string } {
  let kind: DebtSettlementOptionKind;
  try {
    kind = parseDebtSettlementOptionKind(input.kind);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tipo de liquidação inválido.",
    };
  }

  if (!Number.isInteger(input.installments) || input.installments <= 0) {
    return { ok: false, error: "O número de parcelas deve ser um inteiro positivo." };
  }

  if (!Number.isInteger(input.totalAmountCents) || input.totalAmountCents <= 0) {
    return { ok: false, error: "O valor total deve ser maior que zero." };
  }

  const upfrontRaw = input.upfrontAmountCents ?? 0;
  if (
    input.upfrontAmountCents !== null &&
    input.upfrontAmountCents !== undefined &&
    (!Number.isInteger(input.upfrontAmountCents) || input.upfrontAmountCents < 0)
  ) {
    return { ok: false, error: "O valor de entrada deve ser maior ou igual a zero." };
  }

  const upfrontAmountCents = Number.isInteger(upfrontRaw) ? upfrontRaw : 0;

  const monthlyInstallmentCents = input.monthlyInstallmentCents ?? null;
  if (monthlyInstallmentCents !== null && (!Number.isInteger(monthlyInstallmentCents) || monthlyInstallmentCents <= 0)) {
    return { ok: false, error: "O valor da parcela deve ser maior que zero." };
  }

  const firstDueDate = normalizeDateOnly(input.firstDueDate);
  const validUntil = normalizeDateOnly(input.validUntil);
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;

  if (kind === "cash") {
    if (input.installments !== 1) {
      return { ok: false, error: "Opção à vista deve ter 1 parcela." };
    }

    return {
      ok: true,
      value: {
        kind,
        installments: 1,
        totalAmountCents: input.totalAmountCents,
        upfrontAmountCents: input.totalAmountCents,
        monthlyInstallmentCents: null,
        firstDueDate: null,
        validUntil,
        notes,
      },
    };
  }

  if (input.installments <= 1) {
    return { ok: false, error: "Opção parcelada deve ter mais de 1 parcela." };
  }

  if (monthlyInstallmentCents === null) {
    return { ok: false, error: "O valor da parcela é obrigatório para opção parcelada." };
  }

  if (!firstDueDate) {
    return { ok: false, error: "A primeira parcela é obrigatória para opção parcelada." };
  }

  if (validUntil && validUntil < firstDueDate) {
    return { ok: false, error: "A validade não pode ser anterior à primeira parcela." };
  }

  const expectedTotal = upfrontAmountCents + monthlyInstallmentCents * input.installments;
  const difference = Math.abs(expectedTotal - input.totalAmountCents);
  if (difference > 2) {
    return {
      ok: false,
      error: "O valor total deve bater com a entrada e as parcelas informadas.",
    };
  }

  return {
    ok: true,
    value: {
      kind,
      installments: input.installments,
      totalAmountCents: input.totalAmountCents,
      upfrontAmountCents,
      monthlyInstallmentCents,
      firstDueDate,
      validUntil,
      notes,
    },
  };
}
