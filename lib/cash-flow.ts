export type CashFlowSource = "realizado" | "planejado" | "planejado_avulso";

export type CashFlowIncomePlanItem = {
  id: string;
  name: string;
  plannedAmount: number;
  realizedAmount: number;
};

export type CashFlowMonth = {
  periodMonth: string;
  monthLabel: string;
  isBeforeStart: boolean;
  isClosed: boolean;
  openingBalance: number;
  partialOpeningBalance: number;
  plannedIncome: number;
  expectedRecurringIncomes: number;
  actualLinkedIncome: number;
  actualOneTimeIncome: number;
  futureExpectedIncomes: number;
  actualIncome: number;
  incomeUsed: number;
  incomeSource: CashFlowSource;
  plannedFixedExpenses: number;
  actualFixedExpenses: number;
  futureExpectedFixedExpenses: number;
  fixedExpensesUsed: number;
  fixedExpenseSource: CashFlowSource;
  plannedVariableExpenses: number;
  futureExpectedVariableExpenses: number;
  variableExpensesUsed: number;
  actualVariableExpenses: number;
  remainingVariableBudget: number;
  hasActualVariableExpenses: boolean;
  variableBudgetStatus: "dentro" | "estourado";
  totalExpenses: number;
  partialTotalExpenses: number;
  monthlyResult: number;
  partialMonthlyResult: number;
  closingBalance: number;
  partialClosingBalance: number;
};

export type CashFlowSummary = {
  totalIncomeUsed: number;
  totalExpensesUsed: number;
  totalResult: number;
  finalBalance: number;
  lowestBalance: number;
  negativeMonthsCount: number;
};

export type CashFlowProjectionInput = {
  year: number;
  startMonth: string;
  initialBalance: number;
  plannedIncomesTotal: number;
  plannedRecurringIncomesByMonth?: Record<string, number>;
  actualLinkedIncomesByMonth: Record<string, number>;
  actualOneTimeIncomesByMonth: Record<string, number>;
  futureExpectedIncomesByMonth: Record<string, number>;
  incomePlanItemsByMonth?: Record<string, CashFlowIncomePlanItem[]>;
  closedMonths: Set<string> | string[];
  plannedFixedExpensesTotal: number;
  plannedFixedExpensesByMonth?: Record<string, number>;
  actualFixedExpensesByMonth: Record<string, number>;
  futureExpectedFixedExpensesByMonth: Record<string, number>;
  plannedVariableExpensesTotal: number;
  plannedVariableExpensesByMonth?: Record<string, number>;
  actualVariableExpensesByMonth: Record<string, number>;
  futureExpectedVariableExpensesByMonth: Record<string, number>;
};

export type CashFlowProjection = {
  months: CashFlowMonth[];
  summary: CashFlowSummary;
};

const PERIOD_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function getMonthLabel(periodMonth: string): string {
  const [yearText, monthText] = periodMonth.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  if (Number.isNaN(year) || Number.isNaN(month)) return periodMonth;

  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function isValidPeriodMonth(value: string): boolean {
  return PERIOD_MONTH_REGEX.test(value);
}

export function getCurrentPeriodMonth(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getNextPeriodMonth(periodMonth: string): string {
  const [yearText, monthText] = periodMonth.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  if (Number.isNaN(year) || Number.isNaN(month)) {
    return periodMonth;
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function getPeriodMonthRange(startMonth: string, endMonth: string): string[] {
  if (!isValidPeriodMonth(startMonth) || !isValidPeriodMonth(endMonth) || startMonth > endMonth) {
    return [];
  }

  const months: string[] = [];
  let current = startMonth;

  while (current <= endMonth) {
    months.push(current);
    current = getNextPeriodMonth(current);
  }

  return months;
}

export function getCashFlowProjectionYearBounds(
  referenceDate: Date = new Date()
): { minYear: number; maxYear: number } {
  const currentYear = referenceDate.getFullYear();
  return {
    minYear: currentYear,
    maxYear: currentYear + 4,
  };
}

export function clampCashFlowProjectionYear(
  value: number,
  referenceDate: Date = new Date()
): number {
  const { minYear, maxYear } = getCashFlowProjectionYearBounds(referenceDate);
  return Math.min(maxYear, Math.max(minYear, value));
}

export function getYearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
}

export function isMonthBefore(monthA: string, monthB: string): boolean {
  if (!isValidPeriodMonth(monthA) || !isValidPeriodMonth(monthB)) {
    return false;
  }

  return monthA < monthB;
}

export function canClosePeriodMonth(
  periodMonth: string,
  referenceMonth: string = getCurrentPeriodMonth()
): boolean {
  if (!isValidPeriodMonth(periodMonth) || !isValidPeriodMonth(referenceMonth)) {
    return false;
  }

  return periodMonth <= referenceMonth;
}

export function calculateCashFlowProjection(
  input: CashFlowProjectionInput
): CashFlowProjection {
  const closedMonthsSet = Array.isArray(input.closedMonths)
    ? new Set(input.closedMonths)
    : input.closedMonths;
  const normalizedStartMonth = isValidPeriodMonth(input.startMonth)
    ? input.startMonth
    : getCurrentPeriodMonth();
  const endMonth = `${input.year}-12`;
  const computedMonths = getPeriodMonthRange(normalizedStartMonth, endMonth);
  const computedMonthMap = new Map<string, CashFlowMonth>();

  let currentOpeningBalance = input.initialBalance;
  let currentPartialOpeningBalance = input.initialBalance;
  let hasStarted = false;

  for (const periodMonth of computedMonths) {
    if (!hasStarted) {
      currentOpeningBalance = input.initialBalance;
      currentPartialOpeningBalance = input.initialBalance;
      hasStarted = true;
    }

    const plannedIncome =
      input.plannedRecurringIncomesByMonth?.[periodMonth] ?? input.plannedIncomesTotal;
    const isClosed = closedMonthsSet.has(periodMonth);
    const actualLinkedIncome = input.actualLinkedIncomesByMonth[periodMonth] ?? 0;
    const actualOneTimeIncome = input.actualOneTimeIncomesByMonth[periodMonth] ?? 0;
    const futureExpectedIncomes = input.futureExpectedIncomesByMonth[periodMonth] ?? 0;
    const actualIncome = actualLinkedIncome + actualOneTimeIncome;
    const hasLinkedIncome = actualLinkedIncome > 0;
    const hasOneTimeIncome = actualOneTimeIncome > 0;
    const hasFutureExpectedIncome = futureExpectedIncomes > 0;
    const incomePlanItems = input.incomePlanItemsByMonth?.[periodMonth] ?? [];
    const hasIncomePlanItems = incomePlanItems.length > 0;
    const expectedRecurringIncomes = isClosed
      ? actualLinkedIncome
      : hasIncomePlanItems
      ? incomePlanItems.reduce(
          (acc, item) => acc + Math.max(item.plannedAmount, item.realizedAmount),
          0
        )
      : hasLinkedIncome
      ? actualLinkedIncome
      : plannedIncome;
    const incomeSource: CashFlowSource = isClosed
      ? "realizado"
      : hasLinkedIncome
      ? "realizado"
      : hasOneTimeIncome || hasFutureExpectedIncome
      ? "planejado_avulso"
      : "planejado";
    const incomeUsed = isClosed
      ? actualIncome
      : expectedRecurringIncomes + actualOneTimeIncome + futureExpectedIncomes;

    const plannedFixedExpenses = input.plannedFixedExpensesTotal;
    const plannedFixedExpensesForMonth =
      input.plannedFixedExpensesByMonth?.[periodMonth] ?? plannedFixedExpenses;
    const actualFixedExpenses = input.actualFixedExpensesByMonth[periodMonth] ?? 0;
    const futureExpectedFixedExpenses = isClosed
      ? 0
      : input.futureExpectedFixedExpensesByMonth[periodMonth] ?? 0;
    const fixedExpenseSource: CashFlowSource = isClosed
      ? "realizado"
      : actualFixedExpenses > 0
      ? "realizado"
      : "planejado";
    const projectedFixedExpenses = isClosed
      ? actualFixedExpenses
      : Math.max(plannedFixedExpensesForMonth, actualFixedExpenses);
    const fixedExpensesUsed = projectedFixedExpenses + futureExpectedFixedExpenses;

    const actualVariableExpenses = input.actualVariableExpensesByMonth[periodMonth] ?? 0;
    const plannedVariableExpenses =
      input.plannedVariableExpensesByMonth?.[periodMonth] ?? input.plannedVariableExpensesTotal;
    const futureExpectedVariableExpenses = isClosed
      ? 0
      : input.futureExpectedVariableExpensesByMonth[periodMonth] ?? 0;
    const projectedVariableExpenses = isClosed
      ? actualVariableExpenses
      : Math.max(plannedVariableExpenses, actualVariableExpenses);
    const variableExpensesUsed = projectedVariableExpenses + futureExpectedVariableExpenses;
    const remainingVariableBudget = plannedVariableExpenses - actualVariableExpenses;
    const hasActualVariableExpenses = actualVariableExpenses > 0;
    const variableBudgetStatus =
      actualVariableExpenses > plannedVariableExpenses ? "estourado" : "dentro";

    const totalExpenses = fixedExpensesUsed + variableExpensesUsed;
    const monthlyResult = incomeUsed - totalExpenses;
    const closingBalance = currentOpeningBalance + monthlyResult;

    const partialTotalExpenses = actualFixedExpenses + actualVariableExpenses;
    const partialMonthlyResult = actualIncome - partialTotalExpenses;
    const partialOpeningBalance = isClosed
      ? currentOpeningBalance
      : currentPartialOpeningBalance;
    const partialClosingBalance = partialOpeningBalance + partialMonthlyResult;

    const row: CashFlowMonth = {
      periodMonth,
      monthLabel: getMonthLabel(periodMonth),
      isBeforeStart: false,
      isClosed,
      openingBalance: currentOpeningBalance,
      partialOpeningBalance,
      plannedIncome,
      expectedRecurringIncomes,
      actualLinkedIncome,
      actualOneTimeIncome,
      futureExpectedIncomes,
      actualIncome,
      incomeUsed,
      incomeSource,
      plannedFixedExpenses: plannedFixedExpensesForMonth,
      actualFixedExpenses,
      futureExpectedFixedExpenses,
      fixedExpensesUsed,
      fixedExpenseSource,
      plannedVariableExpenses,
      futureExpectedVariableExpenses,
      variableExpensesUsed,
      actualVariableExpenses,
      remainingVariableBudget,
      hasActualVariableExpenses,
      variableBudgetStatus,
      totalExpenses,
      partialTotalExpenses,
      monthlyResult,
      partialMonthlyResult,
      closingBalance,
      partialClosingBalance,
    };

    currentOpeningBalance = closingBalance;
    currentPartialOpeningBalance = partialClosingBalance;

    computedMonthMap.set(periodMonth, row);
  }

  const monthsOfYear = getYearMonths(input.year);
  const months: CashFlowMonth[] = monthsOfYear.map((periodMonth) => {
    if (isMonthBefore(periodMonth, normalizedStartMonth)) {
      return {
        periodMonth,
        monthLabel: getMonthLabel(periodMonth),
      isBeforeStart: true,
      isClosed: false,
      openingBalance: 0,
      partialOpeningBalance: 0,
        plannedIncome: input.plannedRecurringIncomesByMonth?.[periodMonth] ?? input.plannedIncomesTotal,
        expectedRecurringIncomes: 0,
        actualLinkedIncome: input.actualLinkedIncomesByMonth[periodMonth] ?? 0,
        actualOneTimeIncome: input.actualOneTimeIncomesByMonth[periodMonth] ?? 0,
        futureExpectedIncomes: input.futureExpectedIncomesByMonth[periodMonth] ?? 0,
        actualIncome:
          (input.actualLinkedIncomesByMonth[periodMonth] ?? 0) +
          (input.actualOneTimeIncomesByMonth[periodMonth] ?? 0),
        incomeUsed: 0,
        incomeSource: "planejado",
        plannedFixedExpenses:
          input.plannedFixedExpensesByMonth?.[periodMonth] ?? input.plannedFixedExpensesTotal,
        actualFixedExpenses: input.actualFixedExpensesByMonth[periodMonth] ?? 0,
        futureExpectedFixedExpenses:
          input.futureExpectedFixedExpensesByMonth[periodMonth] ?? 0,
        fixedExpensesUsed: 0,
        fixedExpenseSource: "planejado",
        plannedVariableExpenses:
          input.plannedVariableExpensesByMonth?.[periodMonth] ?? input.plannedVariableExpensesTotal,
        futureExpectedVariableExpenses:
          input.futureExpectedVariableExpensesByMonth[periodMonth] ?? 0,
        variableExpensesUsed: 0,
        actualVariableExpenses: 0,
        remainingVariableBudget: 0,
        hasActualVariableExpenses: false,
        variableBudgetStatus: "dentro",
        totalExpenses: 0,
        partialTotalExpenses: 0,
        monthlyResult: 0,
        partialMonthlyResult: 0,
        closingBalance: 0,
        partialClosingBalance: 0,
      };
    }

    const computedMonth = computedMonthMap.get(periodMonth);
    if (computedMonth) {
      return computedMonth;
    }

    return {
      periodMonth,
      monthLabel: getMonthLabel(periodMonth),
      isBeforeStart: false,
      isClosed: false,
      openingBalance: currentOpeningBalance,
      partialOpeningBalance: currentPartialOpeningBalance,
      plannedIncome: input.plannedRecurringIncomesByMonth?.[periodMonth] ?? input.plannedIncomesTotal,
      expectedRecurringIncomes: 0,
      actualLinkedIncome: input.actualLinkedIncomesByMonth[periodMonth] ?? 0,
      actualOneTimeIncome: input.actualOneTimeIncomesByMonth[periodMonth] ?? 0,
      futureExpectedIncomes: input.futureExpectedIncomesByMonth[periodMonth] ?? 0,
      actualIncome:
        (input.actualLinkedIncomesByMonth[periodMonth] ?? 0) +
        (input.actualOneTimeIncomesByMonth[periodMonth] ?? 0),
      incomeUsed: 0,
      incomeSource: "planejado",
      plannedFixedExpenses:
        input.plannedFixedExpensesByMonth?.[periodMonth] ?? input.plannedFixedExpensesTotal,
      actualFixedExpenses: input.actualFixedExpensesByMonth[periodMonth] ?? 0,
      futureExpectedFixedExpenses: input.futureExpectedFixedExpensesByMonth[periodMonth] ?? 0,
      fixedExpensesUsed: 0,
      fixedExpenseSource: "planejado",
      plannedVariableExpenses:
        input.plannedVariableExpensesByMonth?.[periodMonth] ?? input.plannedVariableExpensesTotal,
      futureExpectedVariableExpenses: input.futureExpectedVariableExpensesByMonth[periodMonth] ?? 0,
      variableExpensesUsed: 0,
      actualVariableExpenses: 0,
      remainingVariableBudget: 0,
      hasActualVariableExpenses: false,
      variableBudgetStatus: "dentro",
      totalExpenses: 0,
      partialTotalExpenses: 0,
      monthlyResult: 0,
      partialMonthlyResult: 0,
      closingBalance: 0,
      partialClosingBalance: 0,
    };
  });

  const activeMonths = months.filter((month) => !month.isBeforeStart);

  if (activeMonths.length === 0) {
    return {
      months,
      summary: {
        totalIncomeUsed: 0,
        totalExpensesUsed: 0,
        totalResult: 0,
        finalBalance: 0,
        lowestBalance: 0,
        negativeMonthsCount: 0,
      },
    };
  }

  let totalIncomeUsed = 0;
  let totalExpensesUsed = 0;
  let totalResult = 0;
  let lowestBalance = activeMonths[0].closingBalance;
  let negativeMonthsCount = 0;

  for (const month of activeMonths) {
    totalIncomeUsed += month.incomeUsed;
    totalExpensesUsed += month.totalExpenses;
    totalResult += month.monthlyResult;
    lowestBalance = Math.min(lowestBalance, month.closingBalance);

    if (month.closingBalance < 0) {
      negativeMonthsCount += 1;
    }
  }

  return {
    months,
    summary: {
      totalIncomeUsed,
      totalExpensesUsed,
      totalResult,
      finalBalance: activeMonths[activeMonths.length - 1].closingBalance,
      lowestBalance,
      negativeMonthsCount,
    },
  };
}
