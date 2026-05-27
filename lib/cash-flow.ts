export type CashFlowSource = "realizado" | "planejado";

export type CashFlowMonth = {
  periodMonth: string;
  monthLabel: string;
  isBeforeStart: boolean;
  openingBalance: number;
  plannedIncome: number;
  actualIncome: number;
  incomeUsed: number;
  incomeSource: CashFlowSource;
  plannedFixedExpenses: number;
  actualFixedExpenses: number;
  fixedExpensesUsed: number;
  fixedExpenseSource: CashFlowSource;
  plannedVariableExpenses: number;
  variableExpensesUsed: number;
  totalExpenses: number;
  monthlyResult: number;
  closingBalance: number;
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
  actualIncomesByMonth: Record<string, number>;
  plannedFixedExpensesTotal: number;
  actualFixedExpensesByMonth: Record<string, number>;
  plannedVariableExpensesTotal: number;
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

export function calculateCashFlowProjection(
  input: CashFlowProjectionInput
): CashFlowProjection {
  const monthsOfYear = getYearMonths(input.year);
  const normalizedStartMonth = isValidPeriodMonth(input.startMonth)
    ? input.startMonth
    : getCurrentPeriodMonth();

  let hasStarted = false;
  let currentOpeningBalance = input.initialBalance;

  const months: CashFlowMonth[] = monthsOfYear.map((periodMonth) => {
    const isBeforeStart = isMonthBefore(periodMonth, normalizedStartMonth);

    if (isBeforeStart) {
      return {
        periodMonth,
        monthLabel: getMonthLabel(periodMonth),
        isBeforeStart: true,
        openingBalance: 0,
        plannedIncome: input.plannedIncomesTotal,
        actualIncome: input.actualIncomesByMonth[periodMonth] ?? 0,
        incomeUsed: 0,
        incomeSource: "planejado",
        plannedFixedExpenses: input.plannedFixedExpensesTotal,
        actualFixedExpenses: input.actualFixedExpensesByMonth[periodMonth] ?? 0,
        fixedExpensesUsed: 0,
        fixedExpenseSource: "planejado",
        plannedVariableExpenses: input.plannedVariableExpensesTotal,
        variableExpensesUsed: 0,
        totalExpenses: 0,
        monthlyResult: 0,
        closingBalance: 0,
      };
    }

    if (!hasStarted) {
      currentOpeningBalance = input.initialBalance;
      hasStarted = true;
    }

    const plannedIncome = input.plannedIncomesTotal;
    const actualIncome = input.actualIncomesByMonth[periodMonth] ?? 0;
    const incomeSource: CashFlowSource = actualIncome > 0 ? "realizado" : "planejado";
    const incomeUsed = incomeSource === "realizado" ? actualIncome : plannedIncome;

    const plannedFixedExpenses = input.plannedFixedExpensesTotal;
    const actualFixedExpenses = input.actualFixedExpensesByMonth[periodMonth] ?? 0;
    const fixedExpenseSource: CashFlowSource =
      actualFixedExpenses > 0 ? "realizado" : "planejado";
    const fixedExpensesUsed =
      fixedExpenseSource === "realizado" ? actualFixedExpenses : plannedFixedExpenses;

    const variableExpensesUsed = input.plannedVariableExpensesTotal;
    const totalExpenses = fixedExpensesUsed + variableExpensesUsed;
    const monthlyResult = incomeUsed - totalExpenses;
    const closingBalance = currentOpeningBalance + monthlyResult;

    const row: CashFlowMonth = {
      periodMonth,
      monthLabel: getMonthLabel(periodMonth),
      isBeforeStart: false,
      openingBalance: currentOpeningBalance,
      plannedIncome,
      actualIncome,
      incomeUsed,
      incomeSource,
      plannedFixedExpenses,
      actualFixedExpenses,
      fixedExpensesUsed,
      fixedExpenseSource,
      plannedVariableExpenses: input.plannedVariableExpensesTotal,
      variableExpensesUsed,
      totalExpenses,
      monthlyResult,
      closingBalance,
    };

    currentOpeningBalance = closingBalance;

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
