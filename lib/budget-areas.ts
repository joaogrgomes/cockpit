import { formatPeriodMonthShort, isMonthWithinPeriod } from "@/lib/recurrence-period";
import { getExpenseCategoryLabel } from "@/lib/expenses";

export type BudgetAreaKey =
  | "necessidades_basicas"
  | "dividas"
  | "reserva"
  | "compras_lazer"
  | "educacao"
  | "doacoes"
  | "nao_classificado";

export type BudgetAreaStatus = "dentro_do_ideal" | "acima_do_ideal" | "nao_alocado";

export type BudgetAreaAllocation = {
  areaKey: Exclude<BudgetAreaKey, "nao_classificado">;
  label: string;
  percentage: number;
  categories: string[];
};

export type BudgetAreaModel = {
  id: string;
  name: string;
  allocations: BudgetAreaAllocation[];
};

export type BudgetAreaExpenseItem = {
  id: string;
  name: string;
  category: string;
  expenseType: string;
  amount: number;
  startMonth: string;
  endMonth: string | null;
};

export type BudgetAreaIncomeItem = {
  id: string;
  name: string;
  category: string;
  amount: number;
  startMonth: string;
  endMonth: string | null;
};

export type BudgetAreaRowItem = BudgetAreaExpenseItem & {
  categoryLabel: string;
  periodLabel: string;
};

export type BudgetAreaRow = {
  areaKey: BudgetAreaKey;
  label: string;
  percentage: number;
  idealAmountCents: number;
  actualPlannedAmountCents: number;
  differenceCents: number;
  percentageOfIncome: number;
  status: BudgetAreaStatus;
  items: BudgetAreaRowItem[];
};

export type BudgetAreasAnalysis = {
  referenceMonth: string;
  baseIncomeCents: number;
  totalIdealDistributedCents: number;
  totalPlannedAmountCents: number;
  totalDifferenceCents: number;
  totalPlannedPct: number;
  rows: BudgetAreaRow[];
  model: BudgetAreaModel;
};

const DEFAULT_MODEL: BudgetAreaModel = {
  id: "reorganizacao",
  name: "Reorganização",
  allocations: [
    {
      areaKey: "necessidades_basicas",
      label: "Necessidades básicas",
      percentage: 50,
      categories: [
        "moradia",
        "alimentacao",
        "transporte",
        "saude",
        "servicos",
        "assinaturas",
        "impostos",
        "educacao",
        "familia",
      ],
    },
    {
      areaKey: "dividas",
      label: "Dívidas",
      percentage: 20,
      categories: ["dividas"],
    },
    {
      areaKey: "reserva",
      label: "Reserva",
      percentage: 10,
      categories: ["reserva"],
    },
    {
      areaKey: "compras_lazer",
      label: "Compras e lazer",
      percentage: 10,
      categories: ["compras", "lazer", "beleza_cuidados", "esportes", "outros"],
    },
    {
      areaKey: "educacao",
      label: "Educação",
      percentage: 5,
      categories: [],
    },
    {
      areaKey: "doacoes",
      label: "Doações",
      percentage: 5,
      categories: ["doacoes"],
    },
  ],
};

const AREA_LABELS: Record<BudgetAreaKey, string> = {
  necessidades_basicas: "Necessidades básicas",
  dividas: "Dívidas",
  reserva: "Reserva",
  compras_lazer: "Compras e lazer",
  educacao: "Educação",
  doacoes: "Doações",
  nao_classificado: "Não classificado",
};

const CATEGORY_TO_AREA_KEY: Record<string, BudgetAreaKey> = {
  moradia: "necessidades_basicas",
  alimentacao: "necessidades_basicas",
  transporte: "necessidades_basicas",
  saude: "necessidades_basicas",
  servicos: "necessidades_basicas",
  assinaturas: "necessidades_basicas",
  impostos: "necessidades_basicas",
  dividas: "dividas",
  reserva: "reserva",
  compras: "compras_lazer",
  lazer: "compras_lazer",
  beleza_cuidados: "compras_lazer",
  esportes: "compras_lazer",
  outros: "compras_lazer",
  educacao: "necessidades_basicas",
  familia: "necessidades_basicas",
  doacoes: "doacoes",
};

function formatAreaItemPeriodLabel(startMonth: string, endMonth: string | null) {
  if (!endMonth) {
    return `Desde ${formatPeriodMonthShort(startMonth)}`;
  }

  if (endMonth === startMonth) {
    return formatPeriodMonthShort(startMonth);
  }

  return `${formatPeriodMonthShort(startMonth)} até ${formatPeriodMonthShort(endMonth)}`;
}

function calculateIdealDistribution(
  baseIncomeCents: number,
  allocations: BudgetAreaAllocation[]
): Array<BudgetAreaAllocation & { idealAmountCents: number }> {
  const normalizedBaseIncome = Math.max(0, Math.round(baseIncomeCents));

  const rows = allocations.map((allocation, index) => {
    const exactAmount = (normalizedBaseIncome * allocation.percentage) / 100;
    const floorAmount = Math.floor(exactAmount);

    return {
      ...allocation,
      idealAmountCents: floorAmount,
      fractionalPart: exactAmount - floorAmount,
      originalIndex: index,
    };
  });

  let remainder =
    normalizedBaseIncome - rows.reduce((sum, row) => sum + row.idealAmountCents, 0);

  if (remainder > 0) {
    const byFraction = [...rows].sort(
      (a, b) => b.fractionalPart - a.fractionalPart || a.originalIndex - b.originalIndex
    );

    for (let index = 0; index < remainder; index += 1) {
      if (byFraction[index]) {
        byFraction[index].idealAmountCents += 1;
      }
    }
  }

  return rows
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(({ fractionalPart: _fractionalPart, originalIndex: _originalIndex, ...row }) => row);
}

export function getDefaultBudgetAreaModel(): BudgetAreaModel {
  return DEFAULT_MODEL;
}

export function getBudgetAreaLabel(areaKey: BudgetAreaKey): string {
  return AREA_LABELS[areaKey];
}

export function mapExpenseCategoryToBudgetArea(category: string): BudgetAreaKey {
  return CATEGORY_TO_AREA_KEY[category] ?? "nao_classificado";
}

export function sumBudgetAreaBaseIncome(
  incomeItems: BudgetAreaIncomeItem[],
  referenceMonth: string
): number {
  return incomeItems
    .filter((item) => isMonthWithinPeriod(referenceMonth, item.startMonth, item.endMonth))
    .reduce((sum, item) => sum + item.amount, 0);
}

export function calculateBudgetAreasAnalysis(params: {
  referenceMonth: string;
  baseIncomeCents: number;
  expenseItems: BudgetAreaExpenseItem[];
  model?: BudgetAreaModel;
}): BudgetAreasAnalysis {
  const model = params.model ?? getDefaultBudgetAreaModel();
  const eligibleExpenseItems = params.expenseItems.filter((item) =>
    isMonthWithinPeriod(params.referenceMonth, item.startMonth, item.endMonth)
  );

  const idealAllocations = calculateIdealDistribution(params.baseIncomeCents, model.allocations);
  const rows: BudgetAreaRow[] = idealAllocations.map((allocation) => {
    const items = eligibleExpenseItems
      .filter((item) => mapExpenseCategoryToBudgetArea(item.category) === allocation.areaKey)
      .map((item) => ({
        ...item,
        categoryLabel: getExpenseCategoryLabel(item.category),
        periodLabel: formatAreaItemPeriodLabel(item.startMonth, item.endMonth),
      }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));

    const actualPlannedAmountCents = items.reduce((sum, item) => sum + item.amount, 0);
    const differenceCents = actualPlannedAmountCents - allocation.idealAmountCents;
    const percentageOfIncome =
      params.baseIncomeCents > 0 ? (actualPlannedAmountCents / params.baseIncomeCents) * 100 : 0;

    let status: BudgetAreaStatus = "dentro_do_ideal";
    if (allocation.idealAmountCents > 0 && actualPlannedAmountCents === 0) {
      status = "nao_alocado";
    } else if (actualPlannedAmountCents > allocation.idealAmountCents) {
      status = "acima_do_ideal";
    }

    return {
      areaKey: allocation.areaKey,
      label: allocation.label,
      percentage: allocation.percentage,
      idealAmountCents: allocation.idealAmountCents,
      actualPlannedAmountCents,
      differenceCents,
      percentageOfIncome,
      status,
      items,
    };
  });

  const unclassifiedItems = eligibleExpenseItems
    .filter((item) => mapExpenseCategoryToBudgetArea(item.category) === "nao_classificado")
    .map((item) => ({
      ...item,
      categoryLabel: getExpenseCategoryLabel(item.category),
      periodLabel: formatAreaItemPeriodLabel(item.startMonth, item.endMonth),
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));

  if (unclassifiedItems.length > 0) {
    const actualPlannedAmountCents = unclassifiedItems.reduce((sum, item) => sum + item.amount, 0);
    const percentageOfIncome =
      params.baseIncomeCents > 0 ? (actualPlannedAmountCents / params.baseIncomeCents) * 100 : 0;

    rows.push({
      areaKey: "nao_classificado",
      label: AREA_LABELS.nao_classificado,
      percentage: 0,
      idealAmountCents: 0,
      actualPlannedAmountCents,
      differenceCents: actualPlannedAmountCents,
      percentageOfIncome,
      status: actualPlannedAmountCents === 0 ? "dentro_do_ideal" : "acima_do_ideal",
      items: unclassifiedItems,
    });
  }

  const totalIdealDistributedCents = rows.reduce((sum, row) => sum + row.idealAmountCents, 0);
  const totalPlannedAmountCents = rows.reduce((sum, row) => sum + row.actualPlannedAmountCents, 0);
  const totalDifferenceCents = totalPlannedAmountCents - params.baseIncomeCents;
  const totalPlannedPct =
    params.baseIncomeCents > 0 ? (totalPlannedAmountCents / params.baseIncomeCents) * 100 : 0;

  return {
    referenceMonth: params.referenceMonth,
    baseIncomeCents: Math.max(0, Math.round(params.baseIncomeCents)),
    totalIdealDistributedCents,
    totalPlannedAmountCents,
    totalDifferenceCents,
    totalPlannedPct,
    rows,
    model,
  };
}
