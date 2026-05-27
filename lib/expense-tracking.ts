export type ExpenseTrackingStatus =
  | "pendente"
  | "parcial"
  | "concluido"
  | "estourado";

export type ExpenseTrackingEntryLike = {
  amount: number;
};

export type ExpenseTrackingItemLike = {
  category: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  status: ExpenseTrackingStatus;
};

export type ExpenseTrackingSummary = {
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
  totalOverBudget: number;
  pendingCount: number;
  partialCount: number;
  completedCount: number;
  overBudgetCount: number;
};

export type ExpenseTrackingCategorySummaryItem = {
  category: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
};

const PERIOD_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getCurrentPeriodMonth(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isValidPeriodMonth(value: string): boolean {
  return PERIOD_MONTH_REGEX.test(value);
}

export function normalizePeriodMonth(
  value: string | null | undefined,
  fallbackDate: Date = new Date()
): string {
  if (value && isValidPeriodMonth(value)) {
    return value;
  }

  return getCurrentPeriodMonth(fallbackDate);
}

export function sumEntryAmounts(entries: ExpenseTrackingEntryLike[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export function calcTrackingStatus(
  plannedAmount: number,
  actualAmount: number
): ExpenseTrackingStatus {
  if (actualAmount === 0) {
    return "pendente";
  }

  if (actualAmount < plannedAmount) {
    return "parcial";
  }

  if (actualAmount === plannedAmount) {
    return "concluido";
  }

  return "estourado";
}

export function buildTrackingSummary(items: ExpenseTrackingItemLike[]): ExpenseTrackingSummary {
  let totalPlanned = 0;
  let totalActual = 0;
  let totalRemaining = 0;
  let totalOverBudget = 0;
  let pendingCount = 0;
  let partialCount = 0;
  let completedCount = 0;
  let overBudgetCount = 0;

  for (const item of items) {
    totalPlanned += item.plannedAmount;
    totalActual += item.actualAmount;
    totalRemaining += item.remainingAmount;

    if (item.status === "pendente") {
      pendingCount += 1;
    } else if (item.status === "parcial") {
      partialCount += 1;
    } else if (item.status === "concluido") {
      completedCount += 1;
    } else if (item.status === "estourado") {
      overBudgetCount += 1;
      totalOverBudget += Math.abs(item.remainingAmount);
    }
  }

  return {
    totalPlanned,
    totalActual,
    totalRemaining,
    totalOverBudget,
    pendingCount,
    partialCount,
    completedCount,
    overBudgetCount,
  };
}

export function buildTrackingSummaryByCategory(
  items: Array<Pick<ExpenseTrackingItemLike, "category" | "plannedAmount" | "actualAmount">>
): ExpenseTrackingCategorySummaryItem[] {
  const grouped = new Map<string, ExpenseTrackingCategorySummaryItem>();

  for (const item of items) {
    const current = grouped.get(item.category) ?? {
      category: item.category,
      plannedAmount: 0,
      actualAmount: 0,
      remainingAmount: 0,
    };

    current.plannedAmount += item.plannedAmount;
    current.actualAmount += item.actualAmount;
    current.remainingAmount = current.plannedAmount - current.actualAmount;
    grouped.set(item.category, current);
  }

  return [...grouped.values()].sort((a, b) => b.plannedAmount - a.plannedAmount);
}
