export type CashFlowSource = "realizado" | "planejado" | "planejado_avulso";

export type CashFlowMonth = {
  periodMonth: string;
  monthLabel: string;
  isBeforeStart: boolean;
  isClosed: boolean;
  openingBalance: number;
  partialOpeningBalance: number;
  plannedIncome: number;
  actualLinkedIncome: number;
  actualOneTimeIncome: number;
  futureExpectedIncomes: number;
  actualIncome: number;
  incomeUsed: number;
  incomeSource: CashFlowSource;
  plannedFixedExpenses: number;
  actualFixedExpenses: number;
  fixedExpensesUsed: number;
  fixedExpenseSource: CashFlowSource;
  plannedVariableExpenses: number;
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
  actualLinkedIncomesByMonth: Record<string, number>;
  actualOneTimeIncomesByMonth: Record<string, number>;
  futureExpectedIncomesByMonth: Record<string, number>;
  closedMonths: Set<string> | string[];
  plannedFixedExpensesTotal: number;
  actualFixedExpensesByMonth: Record<string, number>;
  plannedVariableExpensesTotal: number;
  actualVariableExpensesByMonth: Record<string, number>;
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
  const monthsOfYear = getYearMonths(input.year);
  const closedMonthsSet = Array.isArray(input.closedMonths)
    ? new Set(input.closedMonths)
    : input.closedMonths;
  const normalizedStartMonth = isValidPeriodMonth(input.startMonth)
    ? input.startMonth
    : getCurrentPeriodMonth();

  let hasStarted = false;
  let currentOpeningBalance = input.initialBalance;
  let currentPartialOpeningBalance = input.initialBalance;

  const months: CashFlowMonth[] = monthsOfYear.map((periodMonth) => {
    const isBeforeStart = isMonthBefore(periodMonth, normalizedStartMonth);

    if (isBeforeStart) {
      return {
        periodMonth,
        monthLabel: getMonthLabel(periodMonth),
        isBeforeStart: true,
        isClosed: false,
        openingBalance: 0,
        partialOpeningBalance: 0,
        plannedIncome: input.plannedIncomesTotal,
        actualLinkedIncome: input.actualLinkedIncomesByMonth[periodMonth] ?? 0,
        actualOneTimeIncome: input.actualOneTimeIncomesByMonth[periodMonth] ?? 0,
        futureExpectedIncomes: input.futureExpectedIncomesByMonth[periodMonth] ?? 0,
        actualIncome:
          (input.actualLinkedIncomesByMonth[periodMonth] ?? 0) +
          (input.actualOneTimeIncomesByMonth[periodMonth] ?? 0),
        incomeUsed: 0,
        incomeSource: "planejado",
        plannedFixedExpenses: input.plannedFixedExpensesTotal,
        actualFixedExpenses: input.actualFixedExpensesByMonth[periodMonth] ?? 0,
        fixedExpensesUsed: 0,
        fixedExpenseSource: "planejado",
        plannedVariableExpenses: input.plannedVariableExpensesTotal,
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

    if (!hasStarted) {
      currentOpeningBalance = input.initialBalance;
      currentPartialOpeningBalance = input.initialBalance;
      hasStarted = true;
    }

    const plannedIncome = input.plannedIncomesTotal;
    const isClosed = closedMonthsSet.has(periodMonth);
    const actualLinkedIncome = input.actualLinkedIncomesByMonth[periodMonth] ?? 0;
    const actualOneTimeIncome = input.actualOneTimeIncomesByMonth[periodMonth] ?? 0;
    const futureExpectedIncomes = input.futureExpectedIncomesByMonth[periodMonth] ?? 0;
    const actualIncome = actualLinkedIncome + actualOneTimeIncome;
    const hasLinkedIncome = actualLinkedIncome > 0;
    const hasOneTimeIncome = actualOneTimeIncome > 0;
    const hasFutureExpectedIncome = futureExpectedIncomes > 0;
    const incomeSource: CashFlowSource = isClosed
      ? "realizado"
      : hasLinkedIncome
      ? "realizado"
      : hasOneTimeIncome || hasFutureExpectedIncome
      ? "planejado_avulso"
      : "planejado";
    const incomeUsed = isClosed
      ? actualIncome
      : hasLinkedIncome
      ? actualIncome + futureExpectedIncomes
      : plannedIncome + actualOneTimeIncome + futureExpectedIncomes;

    const plannedFixedExpenses = input.plannedFixedExpensesTotal;
    const actualFixedExpenses = input.actualFixedExpensesByMonth[periodMonth] ?? 0;
    const fixedExpenseSource: CashFlowSource = isClosed
      ? "realizado"
      : actualFixedExpenses > 0
      ? "realizado"
      : "planejado";
    const fixedExpensesUsed = isClosed
      ? actualFixedExpenses
      : fixedExpenseSource === "realizado"
      ? actualFixedExpenses
      : plannedFixedExpenses;

    const variableExpensesUsed = isClosed
      ? input.actualVariableExpensesByMonth[periodMonth] ?? 0
      : input.plannedVariableExpensesTotal;
    const actualVariableExpenses = input.actualVariableExpensesByMonth[periodMonth] ?? 0;
    const remainingVariableBudget =
      input.plannedVariableExpensesTotal - actualVariableExpenses;
    const hasActualVariableExpenses = actualVariableExpenses > 0;
    const variableBudgetStatus =
      actualVariableExpenses > input.plannedVariableExpensesTotal ? "estourado" : "dentro";

    const totalExpenses = fixedExpensesUsed + variableExpensesUsed;
    const monthlyResult = incomeUsed - totalExpenses;
    const closingBalance = currentOpeningBalance + monthlyResult;

    const partialTotalExpenses = isClosed
      ? totalExpenses
      : hasActualVariableExpenses
      ? fixedExpensesUsed + actualVariableExpenses
      : totalExpenses;
    const partialMonthlyResult = isClosed
      ? monthlyResult
      : hasActualVariableExpenses
      ? incomeUsed - partialTotalExpenses
      : monthlyResult;
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
      actualLinkedIncome,
      actualOneTimeIncome,
      futureExpectedIncomes,
      actualIncome,
      incomeUsed,
      incomeSource,
      plannedFixedExpenses,
      actualFixedExpenses,
      fixedExpensesUsed,
      fixedExpenseSource,
      plannedVariableExpenses: input.plannedVariableExpensesTotal,
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

    return row;
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
