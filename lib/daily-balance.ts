import { normalizeDateOnly } from "@/lib/date-utils";
import { getCurrentPeriodMonth } from "@/lib/cash-flow";
import { sortStatementItems, type StatementItem } from "@/lib/statement";

export type DailyBalance = {
  date: string;
  incomeCents: number;
  expenseCents: number;
  dailyResultCents: number;
  openingBalanceCents: number;
  closingBalanceCents: number;
  items: StatementItem[];
};

export type DailyBalanceInput = {
  openingBalanceCents: number;
  items: StatementItem[];
  startDate: string;
  endDate: string;
};

export type StatementDailyBalanceRange = {
  startDate: string;
  endDate: string | null;
  isFutureMonth: boolean;
};

export function getMonthDateRange(periodMonth: string): { startDate: string; endDate: string } {
  const normalized = /^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)
    ? periodMonth
    : getCurrentPeriodMonth();
  const [yearText, monthText] = normalized.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const endDay = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");

  return {
    startDate: `${normalized}-01`,
    endDate: `${normalized}-${endDay}`,
  };
}

export function getStatementMonthDateRange(
  periodMonth: string,
  referenceDate: Date = new Date()
): StatementDailyBalanceRange {
  const normalizedPeriodMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)
    ? periodMonth
    : getCurrentPeriodMonth(referenceDate);
  const currentPeriodMonth = getCurrentPeriodMonth(referenceDate);
  const today = normalizeDateOnly(referenceDate) ?? `${currentPeriodMonth}-01`;

  if (normalizedPeriodMonth > currentPeriodMonth) {
    return {
      startDate: `${normalizedPeriodMonth}-01`,
      endDate: null,
      isFutureMonth: true,
    };
  }

  if (normalizedPeriodMonth === currentPeriodMonth) {
    return {
      startDate: `${normalizedPeriodMonth}-01`,
      endDate: today,
      isFutureMonth: false,
    };
  }

  const { startDate, endDate } = getMonthDateRange(normalizedPeriodMonth);
  return {
    startDate,
    endDate,
    isFutureMonth: false,
  };
}

function parseDateOnlyToUtcDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateOnly(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextDateOnly(value: string): string {
  const current = parseDateOnlyToUtcDate(value);
  if (!current) {
    return value;
  }

  current.setUTCDate(current.getUTCDate() + 1);
  return formatUtcDateOnly(current);
}

function getDateOnlyRange(startDate: string, endDate: string): string[] {
  const normalizedStart = normalizeDateOnly(startDate) ?? startDate;
  const normalizedEnd = normalizeDateOnly(endDate) ?? endDate;
  const current = parseDateOnlyToUtcDate(normalizedStart);
  const end = parseDateOnlyToUtcDate(normalizedEnd);

  if (!current || !end || normalizedStart > normalizedEnd) {
    return [];
  }

  const dates: string[] = [];
  let cursor = formatUtcDateOnly(current);
  const endText = formatUtcDateOnly(end);

  while (cursor <= endText) {
    dates.push(cursor);
    cursor = getNextDateOnly(cursor);
  }

  return dates;
}

function sumSignedIncome(items: StatementItem[]): number {
  return items.reduce((sum, item) => sum + (item.kind === "income" ? item.amount : 0), 0);
}

function sumSignedExpense(items: StatementItem[]): number {
  return items.reduce((sum, item) => sum + (item.kind === "expense" ? item.amount : 0), 0);
}

export function calculateDailyRunningBalances(
  input: DailyBalanceInput
): DailyBalance[] {
  const groupedItems = new Map<string, StatementItem[]>();
  for (const item of sortStatementItems(input.items)) {
    const normalizedDate = normalizeDateOnly(item.date);
    if (!normalizedDate) {
      continue;
    }

    if (normalizedDate < input.startDate || normalizedDate > input.endDate) {
      continue;
    }

    const current = groupedItems.get(normalizedDate) ?? [];
    current.push(item);
    groupedItems.set(normalizedDate, current);
  }

  const balances: DailyBalance[] = [];
  let openingBalanceCents = input.openingBalanceCents;

  for (const date of getDateOnlyRange(input.startDate, input.endDate)) {
    const dayItems = groupedItems.get(date) ?? [];
    const incomeCents = sumSignedIncome(dayItems);
    const expenseCents = sumSignedExpense(dayItems);
    const dailyResultCents = incomeCents - expenseCents;
    const closingBalanceCents = openingBalanceCents + dailyResultCents;

    balances.push({
      date,
      incomeCents,
      expenseCents,
      dailyResultCents,
      openingBalanceCents,
      closingBalanceCents,
      items: dayItems,
    });

    openingBalanceCents = closingBalanceCents;
  }

  return balances;
}

export function getStatementDailyRunningBalances(
  input: DailyBalanceInput & {
    periodMonth: string;
    referenceDate?: Date;
  }
): { balances: DailyBalance[]; isFutureMonth: boolean; startDate: string; endDate: string | null } {
  const { periodMonth, referenceDate, openingBalanceCents, items } = input;
  const range = getStatementMonthDateRange(periodMonth, referenceDate);

  if (range.isFutureMonth || range.endDate === null) {
    return {
      balances: [],
      isFutureMonth: true,
      startDate: range.startDate,
      endDate: range.endDate,
    };
  }

  const balances = calculateDailyRunningBalances({
    openingBalanceCents,
    items,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  return {
    balances: [...balances].reverse(),
    isFutureMonth: false,
    startDate: range.startDate,
    endDate: range.endDate,
  };
}
