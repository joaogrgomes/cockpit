const PERIOD_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_SHORT_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export function isValidPeriodMonth(value: string): boolean {
  return PERIOD_MONTH_REGEX.test(value);
}

export function getCurrentPeriodMonth(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function parsePeriodMonth(value: string): { year: number; month: number } | null {
  if (!isValidPeriodMonth(value)) return null;

  const [yearText, monthText] = value.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  if (Number.isNaN(year) || Number.isNaN(month)) return null;

  return { year, month };
}

export function getPeriodMonthDateRange(
  periodMonth: string
): { startDate: string; endDateExclusive: string } | null {
  const parsed = parsePeriodMonth(periodMonth);
  if (!parsed) return null;

  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;

  return {
    startDate: `${periodMonth}-01`,
    endDateExclusive: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

export function isDateWithinPeriodMonth(date: string, periodMonth: string): boolean {
  const dateRange = getPeriodMonthDateRange(periodMonth);
  if (!dateRange || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  return date >= dateRange.startDate && date < dateRange.endDateExclusive;
}

export function isMonthWithinPeriod(
  month: string,
  startMonth: string,
  endMonth?: string | null
): boolean {
  if (!isValidPeriodMonth(month) || !isValidPeriodMonth(startMonth)) {
    return false;
  }

  if (month < startMonth) {
    return false;
  }

  if (endMonth && isValidPeriodMonth(endMonth) && month > endMonth) {
    return false;
  }

  return true;
}

export function validatePeriod(startMonth: string, endMonth?: string | null): boolean {
  if (!isValidPeriodMonth(startMonth)) {
    return false;
  }

  if (!endMonth) {
    return true;
  }

  if (!isValidPeriodMonth(endMonth)) {
    return false;
  }

  return endMonth >= startMonth;
}

export function formatPeriodMonthShort(periodMonth: string): string {
  const parsed = parsePeriodMonth(periodMonth);
  if (!parsed) return periodMonth;

  const monthLabel = MONTH_SHORT_LABELS[parsed.month - 1];
  return `${monthLabel}/${parsed.year}`;
}

export function formatRecurrencePeriodLabel(startMonth: string, endMonth?: string | null): string {
  if (!isValidPeriodMonth(startMonth)) {
    return "-";
  }

  const startLabel = formatPeriodMonthShort(startMonth);

  if (!endMonth) {
    return `Desde ${startLabel}`;
  }

  if (!isValidPeriodMonth(endMonth)) {
    return `Desde ${startLabel}`;
  }

  if (endMonth === startMonth) {
    return startLabel;
  }

  return `${startLabel} até ${formatPeriodMonthShort(endMonth)}`;
}
