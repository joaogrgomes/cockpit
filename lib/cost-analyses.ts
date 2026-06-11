import type { CostAnalysisItem, CostAnalysisKind } from "@/types";

function normalizeCostAnalysisKind(kind: CostAnalysisKind | string | null | undefined): CostAnalysisKind {
  if (kind === "economic" || kind === "provision") {
    return kind;
  }

  return "cash";
}

export const COST_ANALYSIS_KIND_LABELS: Record<CostAnalysisKind, string> = {
  cash: "Saída de caixa",
  economic: "Custo econômico",
  provision: "Provisão",
};

export const COST_ANALYSIS_KIND_DESCRIPTIONS: Record<CostAnalysisKind, string> = {
  cash: "Dinheiro que costuma sair do bolso diretamente no mês.",
  economic: "Custo real que nem sempre aparece como boleto mensal.",
  provision: "Valor mensalizado para custos que acontecem em período maior.",
};

export const COST_ANALYSIS_KIND_VARIANTS: Record<CostAnalysisKind, "default" | "secondary" | "outline"> = {
  cash: "default",
  economic: "secondary",
  provision: "outline",
};

export type CostAnalysisItemView = CostAnalysisItem & {
  annualAmountCents: number;
};

export type CostAnalysisTotals = {
  items: CostAnalysisItemView[];
  totalMonthlyCents: number;
  totalAnnualCents: number;
  totalCashMonthlyCents: number;
  totalEconomicMonthlyCents: number;
  totalProvisionMonthlyCents: number;
  netIncomePercentage: number | null;
  grossIncomePercentage: number | null;
};

export function calculateAnnualAmount(monthlyAmountCents: number): number {
  return Math.max(0, Math.round(monthlyAmountCents)) * 12;
}

export function calculateIncomePercentage(
  amountCents: number,
  incomeCents: number
): number | null {
  const safeIncome = Math.max(0, Math.round(incomeCents));
  if (safeIncome <= 0) return null;

  return Number((((Math.max(0, Math.round(amountCents)) / safeIncome) * 100)).toFixed(2));
}

export function calculateCostAnalysisTotals(
  items: CostAnalysisItem[],
  baseNetIncomeCents: number,
  baseGrossIncomeCents: number
): CostAnalysisTotals {
  const normalizedItems = items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((item) => ({
      ...item,
      annualAmountCents: calculateAnnualAmount(item.monthlyAmountCents),
    }));

  const totalMonthlyCents = normalizedItems.reduce((sum, item) => sum + item.monthlyAmountCents, 0);
  const totalAnnualCents = calculateAnnualAmount(totalMonthlyCents);

  const totalCashMonthlyCents = normalizedItems
    .filter((item) => item.costKind === "cash")
    .reduce((sum, item) => sum + item.monthlyAmountCents, 0);

  const totalEconomicMonthlyCents = normalizedItems
    .filter((item) => item.costKind === "economic")
    .reduce((sum, item) => sum + item.monthlyAmountCents, 0);

  const totalProvisionMonthlyCents = normalizedItems
    .filter((item) => item.costKind === "provision")
    .reduce((sum, item) => sum + item.monthlyAmountCents, 0);

  return {
    items: normalizedItems,
    totalMonthlyCents,
    totalAnnualCents,
    totalCashMonthlyCents,
    totalEconomicMonthlyCents,
    totalProvisionMonthlyCents,
    netIncomePercentage: calculateIncomePercentage(totalMonthlyCents, baseNetIncomeCents),
    grossIncomePercentage: calculateIncomePercentage(totalMonthlyCents, baseGrossIncomeCents),
  };
}

export function getCostAnalysisKindLabel(kind: CostAnalysisKind | string | null | undefined): string {
  return COST_ANALYSIS_KIND_LABELS[normalizeCostAnalysisKind(kind)];
}

export function getCostAnalysisKindDescription(
  kind: CostAnalysisKind | string | null | undefined
): string {
  return COST_ANALYSIS_KIND_DESCRIPTIONS[normalizeCostAnalysisKind(kind)];
}

export function getCostAnalysisKindBadgeVariant(
  kind: CostAnalysisKind | string | null | undefined
): "default" | "secondary" | "outline" {
  return COST_ANALYSIS_KIND_VARIANTS[normalizeCostAnalysisKind(kind)];
}
