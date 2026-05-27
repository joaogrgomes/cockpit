import { describe, expect, it } from "vitest";
import {
  calculateCashFlowProjection,
  getYearMonths,
  isMonthBefore,
} from "@/lib/cash-flow";

describe("cash flow helpers", () => {
  it("gera meses de janeiro a dezembro", () => {
    expect(getYearMonths(2026)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("compara YYYY-MM corretamente", () => {
    expect(isMonthBefore("2026-04", "2026-05")).toBe(true);
    expect(isMonthBefore("2026-05", "2026-05")).toBe(false);
    expect(isMonthBefore("2026-06", "2026-05")).toBe(false);
  });
});

describe("calculateCashFlowProjection", () => {
  it("acumula saldo mês a mês corretamente", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 100000,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
    });

    const jan = result.months[0];
    const feb = result.months[1];

    expect(jan.openingBalance).toBe(100000);
    expect(jan.monthlyResult).toBe(200000);
    expect(jan.closingBalance).toBe(300000);

    expect(feb.openingBalance).toBe(300000);
    expect(feb.closingBalance).toBe(500000);
  });

  it("usa realizado de entrada quando existe", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: { "2026-01": 650000 },
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.months[0].incomeSource).toBe("realizado");
    expect(result.months[0].incomeUsed).toBe(650000);
  });

  it("usa planejado de entrada quando não existe realizado", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: { "2026-01": 0 },
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.months[0].incomeSource).toBe("planejado");
    expect(result.months[0].incomeUsed).toBe(500000);
  });

  it("usa realizado de gasto fixo quando existe", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: { "2026-01": 230000 },
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.months[0].fixedExpenseSource).toBe("realizado");
    expect(result.months[0].fixedExpensesUsed).toBe(230000);
  });

  it("usa planejado de gasto fixo quando não existe realizado", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: { "2026-01": 0 },
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.months[0].fixedExpenseSource).toBe("planejado");
    expect(result.months[0].fixedExpensesUsed).toBe(200000);
  });

  it("usa variável sempre planejado", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 90000,
    });

    expect(result.months[0].plannedVariableExpenses).toBe(90000);
    expect(result.months[0].variableExpensesUsed).toBe(90000);
  });

  it("calcula meses negativos", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 0,
      plannedIncomesTotal: 100000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.summary.negativeMonthsCount).toBeGreaterThan(0);
    expect(result.summary.lowestBalance).toBeLessThan(0);
  });

  it("respeita start_month", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-05",
      initialBalance: 50000,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
    });

    expect(result.months[0].isBeforeStart).toBe(true);
    expect(result.months[3].isBeforeStart).toBe(true);
    expect(result.months[4].isBeforeStart).toBe(false);
    expect(result.months[4].openingBalance).toBe(50000);
  });

  it("calcula saldo final anual", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 100000,
      plannedIncomesTotal: 400000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 150000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 50000,
    });

    // resultado mensal = 400000 - (150000 + 50000) = 200000
    // 12 meses -> +2400000, saldo final = 2500000
    expect(result.summary.totalResult).toBe(2400000);
    expect(result.summary.finalBalance).toBe(2500000);
  });
});
