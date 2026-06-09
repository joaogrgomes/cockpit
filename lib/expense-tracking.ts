export type ExpenseTrackingStatus =
  | "pendente"
  | "parcial"
  | "concluido"
  | "estourado";

export type ExpenseTrackingDisplayStatus =
  | "pendente"
  | "parcial"
  | "concluido"
  | "estourado"
  | "pago";

export type ExpenseTrackingEntryLike = {
  amount: number;
};

export type CompatibleExpensePlanCandidate = {
  id: string;
  category: string;
  expenseType: string;
  isActive: boolean;
};

export type ExpenseTrackingItemLike = {
  expenseType: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  status: ExpenseTrackingStatus;
  isOverdue?: boolean;
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
  overdueCount: number;
};

export type ExpenseTrackingCategorySummaryItem = {
  category: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
};

const PERIOD_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getLastDayOfMonth(year: number, monthIndexZeroBased: number): number {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

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

export function calcTrackingStatusByExpenseType(
  expenseType: string,
  plannedAmount: number,
  actualAmount: number
): ExpenseTrackingStatus {
  if (expenseType === "fixo") {
    if (actualAmount === 0) {
      return "pendente";
    }

    if (actualAmount > plannedAmount) {
      return "estourado";
    }

    return "concluido";
  }

  return calcTrackingStatus(plannedAmount, actualAmount);
}

export function getTrackingDisplayStatus(
  expenseType: string,
  status: ExpenseTrackingStatus
): ExpenseTrackingDisplayStatus {
  if (expenseType === "fixo") {
    if (status === "concluido") return "pago";
    if (status === "estourado") return "estourado";
    return "pendente";
  }

  return status;
}

export function getDueDateFromPeriodMonth(
  periodMonth: string,
  dueDay: number
): Date | null {
  if (!isValidPeriodMonth(periodMonth)) return null;
  if (!Number.isInteger(dueDay) || dueDay < 1) return null;

  const [yearText, monthText] = periodMonth.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  if (Number.isNaN(year) || Number.isNaN(month)) return null;

  const monthIndex = month - 1;
  const maxDay = getLastDayOfMonth(year, monthIndex);
  const clampedDay = Math.min(dueDay, maxDay);
  return new Date(year, monthIndex, clampedDay);
}

export function isFixedExpenseOverdue(params: {
  expenseType: string;
  dueDay: number | null;
  actualAmount: number;
  periodMonth: string;
  referenceDate?: Date;
}): boolean {
  const { expenseType, dueDay, actualAmount, periodMonth, referenceDate = new Date() } = params;

  if (expenseType !== "fixo") return false;
  if (typeof dueDay !== "number") return false;
  if (actualAmount > 0) return false;

  const dueDate = getDueDateFromPeriodMonth(periodMonth, dueDay);
  if (!dueDate) return false;

  return startOfDay(referenceDate).getTime() > startOfDay(dueDate).getTime();
}

export function getOverdueReason(dueDay: number | null): string | null {
  if (typeof dueDay !== "number") return null;
  return `Venceu no dia ${dueDay}`;
}

export function splitItemsByExpenseType<T extends { expenseType: string }>(items: T[]) {
  const fixedItems: T[] = [];
  const variableItems: T[] = [];

  for (const item of items) {
    if (item.expenseType === "fixo") {
      fixedItems.push(item);
      continue;
    }

    if (item.expenseType === "variavel") {
      variableItems.push(item);
    }
  }

  return { fixedItems, variableItems };
}

export function findCompatibleMonthlyExpense(
  expenses: CompatibleExpensePlanCandidate[],
  input: { category: string | null | undefined; expenseType: string | null | undefined }
): CompatibleExpensePlanCandidate | null {
  if (!input.category || !input.expenseType) {
    return null;
  }

  return (
    expenses.find(
      (expense) =>
        expense.isActive &&
        expense.category === input.category &&
        expense.expenseType === input.expenseType
    ) ?? null
  );
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
  let overdueCount = 0;

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

    if (item.isOverdue) {
      overdueCount += 1;
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
    overdueCount,
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
