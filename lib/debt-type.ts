import { DEBT_TYPE_VALUES } from "@/lib/db/schema";
import type { DebtType } from "@/types";

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  payoff: "Quitação",
  structural: "Estruturante",
};

export const DEBT_TYPE_DESCRIPTIONS: Record<DebtType, string> = {
  payoff:
    "Dívida cujo objetivo principal é eliminar completamente, normalmente por proposta à vista ou acordo curto.",
  structural:
    "Dívida de alto impacto, cujo objetivo principal é reorganizar parcela, prazo ou estratégia de renegociação.",
};

export const DEBT_TYPE_OPTIONS = DEBT_TYPE_VALUES.map((value) => ({
  value,
  label: DEBT_TYPE_LABELS[value],
  description: DEBT_TYPE_DESCRIPTIONS[value],
}));

export function getDebtTypeLabel(value: string | null | undefined): string {
  if (value === "structural") {
    return DEBT_TYPE_LABELS.structural;
  }

  return DEBT_TYPE_LABELS.payoff;
}

export function getDebtTypeDescription(value: string | null | undefined): string {
  if (value === "structural") {
    return DEBT_TYPE_DESCRIPTIONS.structural;
  }

  return DEBT_TYPE_DESCRIPTIONS.payoff;
}

export function getDebtTypeBadgeVariant(value: string | null | undefined): "default" | "secondary" {
  return value === "structural" ? "secondary" : "default";
}

export function isDebtType(value: string): value is DebtType {
  return DEBT_TYPE_VALUES.includes(value as DebtType);
}
