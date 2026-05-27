import { describe, expect, it } from "vitest";
import {
  buildTrackingSummary,
  buildTrackingSummaryByCategory,
  calcTrackingStatusByExpenseType,
  getTrackingDisplayStatus,
  getCurrentPeriodMonth,
  isFixedExpenseOverdue,
  isValidPeriodMonth,
  normalizePeriodMonth,
  splitItemsByExpenseType,
  sumEntryAmounts,
} from "@/lib/expense-tracking";

describe("period month helpers", () => {
  it("normaliza e valida YYYY-MM", () => {
    expect(isValidPeriodMonth("2026-05")).toBe(true);
    expect(isValidPeriodMonth("2026-13")).toBe(false);
    expect(normalizePeriodMonth("2026-05")).toBe("2026-05");
  });

  it("usa mês atual como fallback", () => {
    const fallbackDate = new Date("2026-07-10T10:00:00.000Z");
    expect(normalizePeriodMonth("2026/07", fallbackDate)).toBe("2026-07");
    expect(getCurrentPeriodMonth(fallbackDate)).toBe("2026-07");
  });
});

describe("tracking aggregations", () => {
  it("soma lançamentos corretamente", () => {
    expect(sumEntryAmounts([{ amount: 1000 }, { amount: 2500 }, { amount: 500 }])).toBe(4000);
  });

  it("separa fixos e variáveis", () => {
    const { fixedItems, variableItems } = splitItemsByExpenseType([
      { expenseType: "fixo", id: "a" },
      { expenseType: "variavel", id: "b" },
      { expenseType: "fixo", id: "c" },
    ]);

    expect(fixedItems.map((item) => item.id)).toEqual(["a", "c"]);
    expect(variableItems.map((item) => item.id)).toEqual(["b"]);
  });

  it("summary geral soma tudo", () => {
    const summary = buildTrackingSummary([
      {
        expenseType: "fixo",
        category: "moradia",
        plannedAmount: 300000,
        actualAmount: 300000,
        remainingAmount: 0,
        status: "concluido",
      },
      {
        expenseType: "variavel",
        category: "alimentacao",
        plannedAmount: 150000,
        actualAmount: 50000,
        remainingAmount: 100000,
        status: "parcial",
      },
      {
        expenseType: "variavel",
        category: "lazer",
        plannedAmount: 50000,
        actualAmount: 80000,
        remainingAmount: -30000,
        status: "estourado",
      },
      {
        expenseType: "fixo",
        category: "educacao",
        plannedAmount: 70000,
        actualAmount: 0,
        remainingAmount: 70000,
        status: "pendente",
        isOverdue: true,
      },
    ]);

    expect(summary.totalPlanned).toBe(570000);
    expect(summary.totalActual).toBe(430000);
    expect(summary.totalRemaining).toBe(140000);
    expect(summary.totalOverBudget).toBe(30000);
    expect(summary.pendingCount).toBe(1);
    expect(summary.partialCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.overBudgetCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
  });

  it("fixedSummary soma apenas fixos", () => {
    const fixedSummary = buildTrackingSummary([
      {
        expenseType: "fixo",
        category: "moradia",
        plannedAmount: 300000,
        actualAmount: 250000,
        remainingAmount: 50000,
        status: "concluido",
      },
      {
        expenseType: "fixo",
        category: "servicos",
        plannedAmount: 100000,
        actualAmount: 0,
        remainingAmount: 100000,
        status: "pendente",
      },
    ]);

    expect(fixedSummary.totalPlanned).toBe(400000);
    expect(fixedSummary.totalActual).toBe(250000);
  });

  it("variableSummary soma apenas variáveis", () => {
    const variableSummary = buildTrackingSummary([
      {
        expenseType: "variavel",
        category: "alimentacao",
        plannedAmount: 120000,
        actualAmount: 90000,
        remainingAmount: 30000,
        status: "parcial",
      },
      {
        expenseType: "variavel",
        category: "lazer",
        plannedAmount: 40000,
        actualAmount: 50000,
        remainingAmount: -10000,
        status: "estourado",
      },
    ]);

    expect(variableSummary.totalPlanned).toBe(160000);
    expect(variableSummary.totalActual).toBe(140000);
  });

  it("monta resumo por categoria", () => {
    const byCategory = buildTrackingSummaryByCategory([
      {
        expenseType: "fixo",
        category: "moradia",
        plannedAmount: 100000,
        actualAmount: 70000,
        remainingAmount: 30000,
        status: "parcial",
      },
      {
        expenseType: "fixo",
        category: "moradia",
        plannedAmount: 50000,
        actualAmount: 50000,
        remainingAmount: 0,
        status: "concluido",
      },
      {
        expenseType: "variavel",
        category: "alimentacao",
        plannedAmount: 80000,
        actualAmount: 90000,
        remainingAmount: -10000,
        status: "estourado",
      },
    ]);

    expect(byCategory).toHaveLength(2);
    const moradia = byCategory.find((item) => item.category === "moradia");
    const alimentacao = byCategory.find((item) => item.category === "alimentacao");

    expect(moradia).toMatchObject({
      plannedAmount: 150000,
      actualAmount: 120000,
      remainingAmount: 30000,
    });
    expect(alimentacao).toMatchObject({
      plannedAmount: 80000,
      actualAmount: 90000,
      remainingAmount: -10000,
    });
  });
});

describe("overdue rules for fixed expenses", () => {
  const referenceDate = new Date("2026-05-20T10:00:00.000Z");

  it("gasto fixo sem pagamento antes do vencimento não fica atrasado", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "fixo",
        dueDay: 25,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });

  it("gasto fixo sem pagamento depois do vencimento fica atrasado", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "fixo",
        dueDay: 5,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(true);
  });

  it("gasto fixo com lançamento não fica atrasado", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "fixo",
        dueDay: 5,
        actualAmount: 1,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });

  it("gasto variável não fica atrasado", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "variavel",
        dueDay: 5,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });

  it("mês futuro não marca atrasado", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "fixo",
        dueDay: 5,
        actualAmount: 0,
        periodMonth: "2026-06",
        referenceDate,
      })
    ).toBe(false);
  });

  it("mês passado marca atrasado quando pendente", () => {
    expect(
      isFixedExpenseOverdue({
        expenseType: "fixo",
        dueDay: 5,
        actualAmount: 0,
        periodMonth: "2026-04",
        referenceDate,
      })
    ).toBe(true);
  });
});

describe("status logic by expense type", () => {
  it("fixo sem lançamento: pendente", () => {
    const status = calcTrackingStatusByExpenseType("fixo", 10000, 0);
    expect(status).toBe("pendente");
    expect(getTrackingDisplayStatus("fixo", status)).toBe("pendente");
  });

  it("fixo com lançamento <= previsto: pago", () => {
    const status = calcTrackingStatusByExpenseType("fixo", 10000, 8000);
    expect(status).toBe("concluido");
    expect(getTrackingDisplayStatus("fixo", status)).toBe("pago");
  });

  it("fixo com lançamento > previsto: estourado", () => {
    const status = calcTrackingStatusByExpenseType("fixo", 10000, 12000);
    expect(status).toBe("estourado");
    expect(getTrackingDisplayStatus("fixo", status)).toBe("estourado");
  });

  it("variável mantém pendente/parcial/concluido/estourado", () => {
    expect(calcTrackingStatusByExpenseType("variavel", 10000, 0)).toBe("pendente");
    expect(calcTrackingStatusByExpenseType("variavel", 10000, 7000)).toBe("parcial");
    expect(calcTrackingStatusByExpenseType("variavel", 10000, 10000)).toBe("concluido");
    expect(calcTrackingStatusByExpenseType("variavel", 10000, 12000)).toBe("estourado");
  });
});
