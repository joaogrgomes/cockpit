import { describe, expect, it } from "vitest";
import {
  canClosePeriodMonth,
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

  it("valida fechamento apenas para mês atual ou passado", () => {
    expect(canClosePeriodMonth("2026-05", "2026-05")).toBe(true);
    expect(canClosePeriodMonth("2026-04", "2026-05")).toBe(true);
    expect(canClosePeriodMonth("2026-06", "2026-05")).toBe(false);
  });
});

describe("calculateCashFlowProjection", () => {
  function baseInput(overrides: Partial<Parameters<typeof calculateCashFlowProjection>[0]> = {}) {
    return {
      year: 2026,
      startMonth: "2026-01",
      initialBalance: 100000,
      plannedIncomesTotal: 500000,
      actualLinkedIncomesByMonth: {},
      actualOneTimeIncomesByMonth: {},
      futureExpectedIncomesByMonth: {},
      incomePlanItemsByMonth: {},
      closedMonths: new Set<string>(),
      plannedFixedExpensesTotal: 200000,
      actualFixedExpensesByMonth: {},
      futureExpectedFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 100000,
      actualVariableExpensesByMonth: {},
      futureExpectedVariableExpensesByMonth: {},
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
    expect(jan.partialClosingBalance).toBe(100000);

    expect(feb.openingBalance).toBe(300000);
    expect(feb.partialOpeningBalance).toBe(100000);
    expect(feb.closingBalance).toBe(500000);
    expect(feb.partialClosingBalance).toBe(100000);
  });

  it("usa realizado de entrada quando existe", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualLinkedIncomesByMonth: { "2026-01": 650000 },
      })
    );

    expect(result.months[0].incomeSource).toBe("realizado");
    expect(result.months[0].incomeUsed).toBe(650000);
  });

  it("usa planejado de entrada quando não existe realizado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
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

  it("calcula entradas previstas por item planejado no mês aberto", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 1280000,
        actualLinkedIncomesByMonth: { "2026-06": 200000 },
        actualOneTimeIncomesByMonth: { "2026-06": 288900 },
        futureExpectedIncomesByMonth: { "2026-06": 1350000 },
        actualFixedExpensesByMonth: { "2026-06": 130768 },
        actualVariableExpensesByMonth: { "2026-06": 601384 },
        initialBalance: 1331609,
        startMonth: "2026-06",
        incomePlanItemsByMonth: {
          "2026-06": [
            {
              id: "salary",
              name: "Salário BB",
              plannedAmount: 980000,
              realizedAmount: 0,
            },
            {
              id: "freela",
              name: "De Praxe",
              plannedAmount: 300000,
              realizedAmount: 200000,
            },
          ],
        },
      })
    );

    const june = result.months[5];

    expect(june.expectedRecurringIncomes).toBe(1280000);
    expect(june.incomeUsed).toBe(2918900);
    expect(june.actualLinkedIncome).toBe(200000);
    expect(june.actualOneTimeIncome).toBe(288900);
    expect(june.futureExpectedIncomes).toBe(1350000);
    expect(june.partialMonthlyResult).toBe(-243252);
    expect(june.partialClosingBalance).toBe(1088357);
  });

  it("mantém planejado quando realizado é menor que o planejado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 300000,
        actualLinkedIncomesByMonth: { "2026-01": 200000 },
        incomePlanItemsByMonth: {
          "2026-01": [
            {
              id: "freela",
              name: "De Praxe",
              plannedAmount: 300000,
              realizedAmount: 200000,
            },
          ],
        },
      })
    );

    const jan = result.months[0];

    expect(jan.expectedRecurringIncomes).toBe(300000);
    expect(jan.incomeUsed).toBe(300000);
  });

  it("eleva a previsão quando realizado supera o planejado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 300000,
        actualLinkedIncomesByMonth: { "2026-01": 350000 },
        incomePlanItemsByMonth: {
          "2026-01": [
            {
              id: "freela",
              name: "De Praxe",
              plannedAmount: 300000,
              realizedAmount: 350000,
            },
          ],
        },
      })
    );

    const jan = result.months[0];

    expect(jan.expectedRecurringIncomes).toBe(350000);
    expect(jan.incomeUsed).toBe(350000);
  });

  it("parcial de mês aberto ignora entradas futuras previstas", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 0 },
        futureExpectedIncomesByMonth: { "2026-01": 70000 },
      })
    );

    const jan = result.months[0];

    expect(jan.futureExpectedIncomes).toBe(70000);
    expect(jan.incomeUsed).toBe(570000);
    expect(jan.partialMonthlyResult).toBe(0);
    expect(jan.partialClosingBalance).toBe(100000);
  });

  it("parcial de mês aberto ignora gastos futuros previstos", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualLinkedIncomesByMonth: { "2026-01": 200000 },
        actualFixedExpensesByMonth: { "2026-01": 50000 },
        actualVariableExpensesByMonth: { "2026-01": 30000 },
        futureExpectedFixedExpensesByMonth: { "2026-01": 20000 },
        futureExpectedVariableExpensesByMonth: { "2026-01": 40000 },
      })
    );

    const jan = result.months[0];

    expect(jan.futureExpectedFixedExpenses).toBe(20000);
    expect(jan.futureExpectedVariableExpenses).toBe(40000);
    expect(jan.monthlyResult).toBe(-10000);
    expect(jan.partialMonthlyResult).toBe(120000);
    expect(jan.partialClosingBalance).toBe(220000);
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

  it("calcula resultado parcial e saldo parcial com realizado-only", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 100000,
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 500000 },
        plannedFixedExpensesTotal: 200000,
        actualFixedExpensesByMonth: { "2026-01": 150000 },
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 20000 },
      })
    );

    const jan = result.months[0];

    // projetado: 500000 - (150000 + 100000) = 250000
    expect(jan.monthlyResult).toBe(250000);
    expect(jan.closingBalance).toBe(350000);

    // parcial: 500000 - (150000 + 20000) = 330000
    expect(jan.partialMonthlyResult).toBe(330000);
    expect(jan.partialClosingBalance).toBe(430000);
  });

  it("saldo parcial melhora quando variável realizado é menor que planejado", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualLinkedIncomesByMonth: { "2026-01": 500000 },
        actualFixedExpensesByMonth: { "2026-01": 150000 },
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
    expect(feb.partialTotalExpenses).toBe(0);
    expect(feb.partialMonthlyResult).toBe(0);
    expect(feb.partialOpeningBalance).toBe(result.months[0].partialClosingBalance);
    expect(feb.partialClosingBalance).toBe(result.months[0].partialClosingBalance);
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
      actualLinkedIncomesByMonth: {},
      actualOneTimeIncomesByMonth: {},
      futureExpectedIncomesByMonth: {},
      closedMonths: new Set<string>(),
      plannedFixedExpensesTotal: 400_000,
      actualFixedExpensesByMonth: {},
      futureExpectedFixedExpensesByMonth: {},
      plannedVariableExpensesTotal: 470_000,
      actualVariableExpensesByMonth: {
        "2026-05": 300_000,
      },
      futureExpectedVariableExpensesByMonth: {},
    });

    const may = result.months.find((month) => month.periodMonth === "2026-05");
    const june = result.months.find((month) => month.periodMonth === "2026-06");

    expect(may).toBeDefined();
    expect(june).toBeDefined();

    if (!may || !june) return;

    expect(may.monthlyResult).toBe(130_000);
    expect(may.partialMonthlyResult).toBe(-300_000);
    expect(may.closingBalance).toBe(130_000);
    expect(may.partialClosingBalance).toBe(-300_000);

    expect(june.openingBalance).toBe(130_000);
    expect(june.partialOpeningBalance).toBe(-300_000);
    expect(june.monthlyResult).toBe(130_000);
    expect(june.partialMonthlyResult).toBe(0);
    expect(june.closingBalance).toBe(260_000);
    expect(june.partialClosingBalance).toBe(-300_000);
  });

  it("helper não quebra meses sem realizado", () => {
    const result = calculateCashFlowProjection(baseInput({ actualVariableExpensesByMonth: {} }));

    expect(result.months[0].actualVariableExpenses).toBe(0);
    expect(result.months[0].hasActualVariableExpenses).toBe(false);
    expect(result.months[0].partialMonthlyResult).toBe(0);
    expect(result.months[0].partialClosingBalance).toBe(result.months[0].partialOpeningBalance);
  });

  it("entrada avulsa soma por fora sem substituir planejado quando não há vinculada", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 50000 },
      })
    );

    const jan = result.months[0];
    expect(jan.incomeSource).toBe("planejado_avulso");
    expect(jan.actualLinkedIncome).toBe(0);
    expect(jan.actualOneTimeIncome).toBe(50000);
    expect(jan.incomeUsed).toBe(550000);
  });

  it("entrada vinculada realizada e avulsa somam em incomeUsed", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualLinkedIncomesByMonth: { "2026-01": 400000 },
        actualOneTimeIncomesByMonth: { "2026-01": 100000 },
      })
    );

    const jan = result.months[0];
    expect(jan.incomeSource).toBe("realizado");
    expect(jan.actualIncome).toBe(500000);
    expect(jan.incomeUsed).toBe(500000);
  });

  it("sem entrada avulsa mantém comportamento anterior", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 0 },
      })
    );

    const jan = result.months[0];
    expect(jan.incomeSource).toBe("planejado");
    expect(jan.incomeUsed).toBe(500000);
  });

  it("entrada futura prevista entra no mês e soma por fora do recorrente", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 0 },
        futureExpectedIncomesByMonth: { "2026-01": 70000 },
      })
    );

    const jan = result.months[0];
    expect(jan.futureExpectedIncomes).toBe(70000);
    expect(jan.incomeSource).toBe("planejado_avulso");
    expect(jan.incomeUsed).toBe(570000);
    expect(jan.partialMonthlyResult).toBe(0);
  });

  it("entrada futura soma junto quando há entrada vinculada realizada", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 550000 },
        actualOneTimeIncomesByMonth: { "2026-01": 30000 },
        futureExpectedIncomesByMonth: { "2026-01": 20000 },
      })
    );

    const jan = result.months[0];
    expect(jan.incomeSource).toBe("realizado");
    expect(jan.incomeUsed).toBe(600000);
  });

  it("sem entradas futuras mantém comportamento anterior", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        futureExpectedIncomesByMonth: {},
      })
    );

    const jan = result.months[0];
    expect(jan.futureExpectedIncomes).toBe(0);
    expect(jan.incomeSource).toBe("planejado");
    expect(jan.incomeUsed).toBe(500000);
  });

  it("quando entrada futura já foi recebida, entra como avulsa e não como futura", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 90000 },
        futureExpectedIncomesByMonth: { "2026-01": 0 },
      })
    );

    const jan = result.months[0];
    expect(jan.actualOneTimeIncome).toBe(90000);
    expect(jan.futureExpectedIncomes).toBe(0);
    expect(jan.incomeUsed).toBe(590000);
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

  it("mês fechado usa apenas realizado nas entradas e saídas", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 300000 },
        actualOneTimeIncomesByMonth: { "2026-01": 20000 },
        futureExpectedIncomesByMonth: { "2026-01": 70000 },
        plannedFixedExpensesTotal: 200000,
        actualFixedExpensesByMonth: { "2026-01": 150000 },
        futureExpectedFixedExpensesByMonth: { "2026-01": 90000 },
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 50000 },
        futureExpectedVariableExpensesByMonth: { "2026-01": 40000 },
        closedMonths: new Set(["2026-01"]),
      })
    );

    const jan = result.months[0];
    expect(jan.isClosed).toBe(true);
    expect(jan.incomeUsed).toBe(320000);
    expect(jan.futureExpectedIncomes).toBe(70000);
    expect(jan.fixedExpensesUsed).toBe(150000);
    expect(jan.variableExpensesUsed).toBe(50000);
    expect(jan.totalExpenses).toBe(200000);
    expect(jan.monthlyResult).toBe(120000);
  });

  it("mês fechado converge projetado e parcial", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 100000,
        actualLinkedIncomesByMonth: { "2026-01": 200000 },
        actualOneTimeIncomesByMonth: { "2026-01": 0 },
        actualFixedExpensesByMonth: { "2026-01": 50000 },
        actualVariableExpensesByMonth: { "2026-01": 25000 },
        closedMonths: ["2026-01"],
      })
    );

    const jan = result.months[0];
    expect(jan.closingBalance).toBe(jan.partialClosingBalance);
    expect(jan.monthlyResult).toBe(jan.partialMonthlyResult);
  });

  it("mês reaberto volta para regra dinâmica", () => {
    const closed = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 10000 },
        plannedFixedExpensesTotal: 200000,
        actualFixedExpensesByMonth: { "2026-01": 50000 },
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 20000 },
        closedMonths: ["2026-01"],
      })
    );

    const reopened = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 10000 },
        plannedFixedExpensesTotal: 200000,
        actualFixedExpensesByMonth: { "2026-01": 50000 },
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 20000 },
        closedMonths: [],
      })
    );

    expect(closed.months[0].incomeUsed).toBe(10000);
    expect(reopened.months[0].incomeUsed).toBe(510000);
    expect(closed.months[0].variableExpensesUsed).toBe(20000);
    expect(reopened.months[0].variableExpensesUsed).toBe(100000);
  });

  it("mês fechado afeta encadeamento do mês seguinte", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        initialBalance: 0,
        plannedIncomesTotal: 500000,
        actualLinkedIncomesByMonth: { "2026-01": 300000, "2026-02": 0 },
        actualOneTimeIncomesByMonth: { "2026-01": 0, "2026-02": 0 },
        plannedFixedExpensesTotal: 200000,
        actualFixedExpensesByMonth: { "2026-01": 100000, "2026-02": 0 },
        futureExpectedFixedExpensesByMonth: {},
        plannedVariableExpensesTotal: 100000,
        actualVariableExpensesByMonth: { "2026-01": 50000, "2026-02": 0 },
        futureExpectedVariableExpensesByMonth: {},
        closedMonths: ["2026-01"],
      })
    );

    const jan = result.months[0];
    const feb = result.months[1];
    expect(jan.closingBalance).toBe(150000);
    expect(feb.openingBalance).toBe(150000);
  });

  it("gasto futuro previsto entra no mês correto e soma por fora", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        plannedFixedExpensesTotal: 200000,
        plannedVariableExpensesTotal: 100000,
        futureExpectedFixedExpensesByMonth: { "2026-01": 50000 },
        futureExpectedVariableExpensesByMonth: { "2026-01": 30000 },
      })
    );

    const jan = result.months[0];
    expect(jan.futureExpectedFixedExpenses).toBe(50000);
    expect(jan.futureExpectedVariableExpenses).toBe(30000);
    expect(jan.fixedExpensesUsed).toBe(250000);
    expect(jan.variableExpensesUsed).toBe(130000);
  });

  it("gasto futuro realizado não duplica no fluxo quando sai de previsto para realizado", () => {
    const projected = calculateCashFlowProjection(
      baseInput({
        futureExpectedVariableExpensesByMonth: { "2026-01": 70000 },
        actualVariableExpensesByMonth: { "2026-01": 0 },
      })
    );

    const realized = calculateCashFlowProjection(
      baseInput({
        futureExpectedVariableExpensesByMonth: { "2026-01": 0 },
        actualVariableExpensesByMonth: { "2026-01": 70000 },
      })
    );

    expect(projected.months[0].variableExpensesUsed).toBe(170000);
    expect(realized.months[0].variableExpensesUsed).toBe(100000);
    expect(realized.months[0].actualVariableExpenses).toBe(70000);
  });

  it("mês fechado ignora gastos futuros previstos", () => {
    const result = calculateCashFlowProjection(
      baseInput({
        actualFixedExpensesByMonth: { "2026-01": 100000 },
        actualVariableExpensesByMonth: { "2026-01": 20000 },
        futureExpectedFixedExpensesByMonth: { "2026-01": 50000 },
        futureExpectedVariableExpensesByMonth: { "2026-01": 30000 },
        closedMonths: ["2026-01"],
      })
    );

    const jan = result.months[0];
    expect(jan.fixedExpensesUsed).toBe(100000);
    expect(jan.variableExpensesUsed).toBe(20000);
    expect(jan.futureExpectedFixedExpenses).toBe(0);
    expect(jan.futureExpectedVariableExpenses).toBe(0);
  });
});
