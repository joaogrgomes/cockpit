export type IncomeTrackingStatus = "pendente" | "parcial" | "recebido";

export type IncomeTrackingEntryLike = {
  amount: number;
};

export type IncomeTrackingItemLike = {
  category: string;
  expectedDay: number | null;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  abovePlannedAmount: number;
  status: IncomeTrackingStatus;
  isOverdue?: boolean;
};

export type IncomeTrackingSummary = {
  totalPlanned: number;
  totalReceived: number;
  totalOneTimeReceived: number;
  totalRemaining: number;
  totalAbovePlanned: number;
  pendingCount: number;
  partialCount: number;
  receivedCount: number;
  overdueCount: number;
};

export type IncomeTrackingCategorySummaryItem = {
  category: string;
  plannedAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  abovePlannedAmount: number;
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

export function sumIncomeEntryAmounts(entries: IncomeTrackingEntryLike[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export function calcIncomeTrackingStatus(
  plannedAmount: number,
  actualAmount: number
): IncomeTrackingStatus {
  if (actualAmount === 0) {
    return "pendente";
  }

  if (actualAmount < plannedAmount) {
    return "parcial";
  }

  return "recebido";
}

export function calcAbovePlannedAmount(
  plannedAmount: number,
  actualAmount: number
): number {
  if (actualAmount <= plannedAmount) {
    return 0;
  }

  return actualAmount - plannedAmount;
}

export function getExpectedDateFromPeriodMonth(
  periodMonth: string,
  expectedDay: number
): Date | null {
  if (!isValidPeriodMonth(periodMonth)) return null;
  if (!Number.isInteger(expectedDay) || expectedDay < 1) return null;

  const [yearText, monthText] = periodMonth.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  if (Number.isNaN(year) || Number.isNaN(month)) return null;

  const monthIndex = month - 1;
  const maxDay = getLastDayOfMonth(year, monthIndex);
  const clampedDay = Math.min(expectedDay, maxDay);
  return new Date(year, monthIndex, clampedDay);
}

export function isIncomeOverdue(params: {
  expectedDay: number | null;
  actualAmount: number;
  periodMonth: string;
  referenceDate?: Date;
}): boolean {
  const { expectedDay, actualAmount, periodMonth, referenceDate = new Date() } = params;

  if (typeof expectedDay !== "number") return false;
  if (actualAmount > 0) return false;

  const expectedDate = getExpectedDateFromPeriodMonth(periodMonth, expectedDay);
  if (!expectedDate) return false;

  return startOfDay(referenceDate).getTime() > startOfDay(expectedDate).getTime();
}

export function getIncomeOverdueReason(expectedDay: number | null): string | null {
  if (typeof expectedDay !== "number") return null;
  return `Prevista para o dia ${expectedDay}`;
}

export function buildIncomeTrackingSummary(
  items: IncomeTrackingItemLike[],
  oneTimeReceived: number = 0
): IncomeTrackingSummary {
  let totalPlanned = 0;
  let totalReceivedFromPlanned = 0;
  let totalRemaining = 0;
  let totalAbovePlanned = 0;
  let pendingCount = 0;
  let partialCount = 0;
  let receivedCount = 0;
  let overdueCount = 0;

  for (const item of items) {
    totalPlanned += item.plannedAmount;
    totalReceivedFromPlanned += item.actualAmount;
    totalRemaining += item.remainingAmount;
    totalAbovePlanned += item.abovePlannedAmount;

    if (item.status === "pendente") {
      pendingCount += 1;
    } else if (item.status === "parcial") {
      partialCount += 1;
    } else if (item.status === "recebido") {
      receivedCount += 1;
    }

    if (item.isOverdue) {
      overdueCount += 1;
    }
  }

  return {
    totalPlanned,
    totalReceived: totalReceivedFromPlanned + oneTimeReceived,
    totalOneTimeReceived: oneTimeReceived,
    totalRemaining,
    totalAbovePlanned,
    pendingCount,
    partialCount,
    receivedCount,
    overdueCount,
  };
}

export function buildIncomeTrackingSummaryByCategory(
  items: Array<Pick<IncomeTrackingItemLike, "category" | "plannedAmount" | "actualAmount">>
): IncomeTrackingCategorySummaryItem[] {
  const grouped = new Map<string, IncomeTrackingCategorySummaryItem>();

  for (const item of items) {
    const current = grouped.get(item.category) ?? {
      category: item.category,
      plannedAmount: 0,
      receivedAmount: 0,
      remainingAmount: 0,
      abovePlannedAmount: 0,
    };

    current.plannedAmount += item.plannedAmount;
    current.receivedAmount += item.actualAmount;
    current.remainingAmount = current.plannedAmount - current.receivedAmount;
    current.abovePlannedAmount = Math.max(0, current.receivedAmount - current.plannedAmount);
    grouped.set(item.category, current);
  }

  return [...grouped.values()].sort((a, b) => b.plannedAmount - a.plannedAmount);
}
