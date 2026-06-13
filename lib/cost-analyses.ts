import type { CostAnalysisItem, CostAnalysisKind, NewCostAnalysis, NewCostAnalysisItem } from "@/types";

export const DEFAULT_COST_ANALYSIS_SLUG = "carro";
export const DEFAULT_COST_ANALYSIS_MORADIA_SLUG = "moradia";

export type DefaultCostAnalysisDefinition = {
  analysis: NewCostAnalysis;
  items: Array<Omit<NewCostAnalysisItem, "costAnalysisId">>;
};

export const DEFAULT_COST_ANALYSIS_DEFINITIONS: DefaultCostAnalysisDefinition[] = [
  {
    analysis: {
      name: "Custo total do carro",
      slug: DEFAULT_COST_ANALYSIS_SLUG,
      description: "Análise do custo mensal e anual de manter o carro.",
      baseNetIncomeCents: 0,
      baseGrossIncomeCents: 0,
    },
    items: [
      { name: "Financiamento", monthlyAmountCents: 60_500, costKind: "cash", notes: null, sortOrder: 0 },
      { name: "Depreciação", monthlyAmountCents: 13_000, costKind: "economic", notes: null, sortOrder: 1 },
      { name: "Combustível", monthlyAmountCents: 65_000, costKind: "cash", notes: null, sortOrder: 2 },
      { name: "Estacionamento", monthlyAmountCents: 2_500, costKind: "cash", notes: null, sortOrder: 3 },
      { name: "IPVA", monthlyAmountCents: 18_000, costKind: "provision", notes: null, sortOrder: 4 },
      { name: "Custo de oportunidade", monthlyAmountCents: 0, costKind: "economic", notes: null, sortOrder: 5 },
      { name: "Seguro", monthlyAmountCents: 20_300, costKind: "provision", notes: null, sortOrder: 6 },
      { name: "Pedágio", monthlyAmountCents: 500, costKind: "cash", notes: null, sortOrder: 7 },
      { name: "Manutenção", monthlyAmountCents: 18_000, costKind: "provision", notes: null, sortOrder: 8 },
      { name: "Lavagem", monthlyAmountCents: 6_000, costKind: "cash", notes: null, sortOrder: 9 },
    ],
  },
  {
    analysis: {
      name: "Moradia",
      slug: DEFAULT_COST_ANALYSIS_MORADIA_SLUG,
      description: "Custos mensais e provisionamentos relacionados à casa.",
      baseNetIncomeCents: 1_130_000,
      baseGrossIncomeCents: 1_600_000,
    },
    items: [
      {
        name: "Aluguel",
        monthlyAmountCents: 139_000,
        costKind: "cash",
        notes: null,
        sortOrder: 0,
      },
      {
        name: "Condomínio",
        monthlyAmountCents: 66_000,
        costKind: "cash",
        notes: null,
        sortOrder: 1,
      },
      {
        name: "Manutenção",
        monthlyAmountCents: 8_000,
        costKind: "provision",
        notes: "Reserva mensal para pequenos reparos e manutenção da casa.",
        sortOrder: 2,
      },
      {
        name: "Seguro",
        monthlyAmountCents: 4_000,
        costKind: "provision",
        notes: "Provisionamento mensal para seguro residencial.",
        sortOrder: 3,
      },
      {
        name: "IPTU",
        monthlyAmountCents: 9_000,
        costKind: "provision",
        notes: "Provisionamento mensal para pagamento anual ou parcelado do IPTU.",
        sortOrder: 4,
      },
      {
        name: "Luz",
        monthlyAmountCents: 45_000,
        costKind: "cash",
        notes: null,
        sortOrder: 5,
      },
    ],
  },
];

export function getDefaultCostAnalysisDefinitions(): DefaultCostAnalysisDefinition[] {
  return DEFAULT_COST_ANALYSIS_DEFINITIONS;
}

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

export function canScheduleFutureExpenseFromCostKind(
  kind: CostAnalysisKind | string | null | undefined
): boolean {
  return normalizeCostAnalysisKind(kind) === "provision";
}
