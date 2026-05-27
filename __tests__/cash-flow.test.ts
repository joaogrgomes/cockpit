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
  function baseInput(overrides: Partial<Parameters<typeof calculateCashFlowProjection>[0]> = {}) {
    return {
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 100000,
      plannedIncomesTotal: 500000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
      actualVariableExpensesByMonth: {},
      ...overrides,
    };
  }

  it("acumula saldo mês a mês corretamente", () => {
    const result = calculateCashFlowProjection(baseInput());

    const jan = result.months[0];
    const feb = result.months[1];

    expect(jan.openingBalance).toBe(100000);
    expect(jan.partialOpeningBalance).toBe(100000);
    expect(jan.monthlyResult).toBe(200000);
    expect(jan.closingBalance).toBe(300000);
    expect(jan.partialClosingBalance).toBe(300000);

    expect(feb.openingBalance).toBe(300000);
    expect(feb.partialOpeningBalance).toBe(300000);
    expect(feb.closingBalance).toBe(500000);
    expect(feb.partialClosingBalance).toBe(500000);
  });

  it("usa realizado de entrada quando existe", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualIncomesByMonth: { "2026-01": 650000 },
      })
    );

    expect(result.months[0].incomeSource).toBe("realizado");
    expect(result.months[0].incomeUsed).toBe(650000);
  });

  it("usa planejado de entrada quando não existe realizado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualIncomesByMonth: { "2026-01": 0 },
      })
    );

    expect(result.months[0].incomeSource).toBe("planejado");
    expect(result.months[0].incomeUsed).toBe(500000);
  });

  it("usa realizado de gasto fixo quando existe", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualFixedExpensesByMonth: { "2026-01": 230000 },
      })
    );

    expect(result.months[0].fixedExpenseSource).toBe("realizado");
    expect(result.months[0].fixedExpensesUsed).toBe(230000);
  });

  it("usa planejado de gasto fixo quando não existe realizado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualFixedExpensesByMonth: { "2026-01": 0 },
      })
    );

    expect(result.months[0].fixedExpenseSource).toBe("planejado");
    expect(result.months[0].fixedExpensesUsed).toBe(200000);
  });

  it("mantém variável planejado como variável usada na projeção", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedVariableExpensesTotal: 90000,
        actualVariableExpensesByMonth: { "2026-01": 50000 },
      })
    );

    expect(result.months[0].plannedVariableExpenses).toBe(90000);
    expect(result.months[0].variableExpensesUsed).toBe(90000);
  });

  it("calcula actualVariableExpenses e remainingVariableBudget", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 30000 },
      })
    );

    expect(result.months[0].actualVariableExpenses).toBe(30000);
    expect(result.months[0].remainingVariableBudget).toBe(70000);
    expect(result.months[0].variableBudgetStatus).toBe("dentro");
  });

  it("quando variável realizada > planejada, restante fica negativo e status estourado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 120000 },
      })
    );

    expect(result.months[0].remainingVariableBudget).toBe(-20000);
    expect(result.months[0].variableBudgetStatus).toBe("estourado");
  });

  it("calcula resultado parcial e saldo parcial quando há variável realizado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 100000,
        plannedIncomesTotal: 500000,
        plannedFixedExpensesTotal: 200000,
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 30000 },
      })
    );

    const jan = result.months[0];

    // projetado: 500000 - (200000 + 100000) = 200000
    expect(jan.monthlyResult).toBe(200000);
    expect(jan.closingBalance).toBe(300000);

    // parcial: 500000 - (200000 + 30000) = 270000
    expect(jan.partialMonthlyResult).toBe(270000);
    expect(jan.partialClosingBalance).toBe(370000);
  });

  it("saldo parcial melhora quando variável realizado é menor que planejado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 20000 },
      })
    );

    const jan = result.months[0];
    expect(jan.partialMonthlyResult).toBeGreaterThan(jan.monthlyResult);
    expect(jan.partialClosingBalance).toBeGreaterThan(jan.closingBalance);
  });

  it("meses futuros sem variável realizado não geram falsa sobra", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualVariableExpensesByMonth: { "2026-01": 30000 },
      })
    );

    const feb = result.months[1];

    expect(feb.hasActualVariableExpenses).toBe(false);
    expect(feb.partialTotalExpenses).toBe(feb.totalExpenses);
    expect(feb.partialMonthlyResult).toBe(feb.monthlyResult);
    expect(feb.partialMonthlyResult).toBe(200000);
    expect(feb.partialOpeningBalance).toBe(result.months[0].partialClosingBalance);
    expect(feb.partialClosingBalance).toBe(result.months[0].partialClosingBalance + 200000);
  });

  it("closingBalance projetado continua sendo base do mês seguinte", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 10000, "2026-02": 10000 },
      })
    );

    const jan = result.months[0];
    const feb = result.months[1];

    expect(feb.openingBalance).toBe(jan.closingBalance);
    expect(feb.partialOpeningBalance).toBe(jan.partialClosingBalance);
    expect(feb.openingBalance).not.toBe(feb.partialOpeningBalance);
  });

  it("reproduz cenário real de maio/junho com encadeamento parcial correto", () => {
    const result = calculateCashFlowProjection({
      year: 2026,
      startMonth: "2026-05",
      initialBalance: 0,
      plannedIncomesTotal: 1_000_000,
      actualIncomesByMonth: {},
      plannedFixedExpensesTotal: 400_000,
      actualFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 470_000,
      actualVariableExpensesByMonth: {
        "2026-05": 300_000,
      },
    });

    const may = result.months.find((month) => month.periodMonth === "2026-05");
    const june = result.months.find((month) => month.periodMonth === "2026-06");

    expect(may).toBeDefined();
    expect(june).toBeDefined();

    if (!may || !june) return;

    expect(may.monthlyResult).toBe(130_000);
    expect(may.partialMonthlyResult).toBe(300_000);
    expect(may.closingBalance).toBe(130_000);
    expect(may.partialClosingBalance).toBe(300_000);

    expect(june.openingBalance).toBe(130_000);
    expect(june.partialOpeningBalance).toBe(300_000);
    expect(june.monthlyResult).toBe(130_000);
    expect(june.partialMonthlyResult).toBe(130_000);
    expect(june.closingBalance).toBe(260_000);
    expect(june.partialClosingBalance).toBe(430_000);
  });

  it("helper não quebra meses sem realizado", () => {
    const result = calculateCashFlowProjection(baseInput({ actualVariableExpensesByMonth: {} }));

    expect(result.months[0].actualVariableExpenses).toBe(0);
    expect(result.months[0].hasActualVariableExpenses).toBe(false);
    expect(result.months[0].partialMonthlyResult).toBe(result.months[0].monthlyResult);
  });

  it("calcula meses negativos", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedIncomesTotal: 100000,
      })
    );

    expect(result.summary.negativeMonthsCount).toBeGreaterThan(0);
    expect(result.summary.lowestBalance).toBeLessThan(0);
  });

  it("respeita start_month", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        startMonth: "2026-05",
        initialBalance: 50000,
      })
    );

    expect(result.months[0].isBeforeStart).toBe(true);
    expect(result.months[3].isBeforeStart).toBe(true);
    expect(result.months[4].isBeforeStart).toBe(false);
    expect(result.months[4].openingBalance).toBe(50000);
  });

  it("calcula saldo final anual", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 100000,
        plannedIncomesTotal: 400000,
        plannedFixedExpensesTotal: 150000,
        plannedVariableExpensesTotal: 50000,
      })
    );

    expect(result.summary.totalResult).toBe(2400000);
    expect(result.summary.finalBalance).toBe(2500000);
  });
});
