import { describe, expect, it } from "vitest";
import {
  buildIncomeTrackingSummary,
  buildIncomeTrackingSummaryByCategory,
  calcIncomeTrackingStatus,
  getCurrentPeriodMonth,
  isIncomeOverdue,
  isValidPeriodMonth,
  normalizePeriodMonth,
  sumIncomeEntryAmounts,
} from "@/lib/income-tracking";

describe("income period month helpers", () => {
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

describe("income tracking aggregations", () => {
  it("soma lançamentos corretamente", () => {
    expect(sumIncomeEntryAmounts([{ amount: 1000 }, { amount: 2500 }, { amount: 500 }])).toBe(
      4000
    );
  });

  it("calcula status pendente/parcial/recebido", () => {
    expect(calcIncomeTrackingStatus(10000, 0)).toBe("pendente");
    expect(calcIncomeTrackingStatus(10000, 7000)).toBe("parcial");
    expect(calcIncomeTrackingStatus(10000, 10000)).toBe("recebido");
    expect(calcIncomeTrackingStatus(10000, 12000)).toBe("recebido");
  });

  it("summary geral soma tudo", () => {
    const summary = buildIncomeTrackingSummary([
      {
        category: "salario",
        expectedDay: 5,
        plannedAmount: 500000,
        actualAmount: 500000,
        remainingAmount: 0,
        abovePlannedAmount: 0,
        status: "recebido",
      },
      {
        category: "freela",
        expectedDay: 15,
        plannedAmount: 120000,
        actualAmount: 40000,
        remainingAmount: 80000,
        abovePlannedAmount: 0,
        status: "parcial",
      },
      {
        category: "reembolso",
        expectedDay: 20,
        plannedAmount: 30000,
        actualAmount: 0,
        remainingAmount: 30000,
        abovePlannedAmount: 0,
        status: "pendente",
        isOverdue: true,
      },
      {
        category: "venda",
        expectedDay: null,
        plannedAmount: 50000,
        actualAmount: 65000,
        remainingAmount: -15000,
        abovePlannedAmount: 15000,
        status: "recebido",
      },
    ]);

    expect(summary.totalPlanned).toBe(700000);
    expect(summary.totalReceived).toBe(605000);
    expect(summary.totalRemaining).toBe(95000);
    expect(summary.totalAbovePlanned).toBe(15000);
    expect(summary.pendingCount).toBe(1);
    expect(summary.partialCount).toBe(1);
    expect(summary.receivedCount).toBe(2);
    expect(summary.overdueCount).toBe(1);
  });

  it("monta resumo por categoria", () => {
    const byCategory = buildIncomeTrackingSummaryByCategory([
      {
        category: "salario",
        expectedDay: 5,
        plannedAmount: 500000,
        actualAmount: 500000,
        remainingAmount: 0,
        abovePlannedAmount: 0,
        status: "recebido",
      },
      {
        category: "freela",
        expectedDay: 15,
        plannedAmount: 100000,
        actualAmount: 120000,
        remainingAmount: -20000,
        abovePlannedAmount: 20000,
        status: "recebido",
      },
      {
        category: "freela",
        expectedDay: 15,
        plannedAmount: 50000,
        actualAmount: 0,
        remainingAmount: 50000,
        abovePlannedAmount: 0,
        status: "pendente",
      },
    ]);

    expect(byCategory).toHaveLength(2);

    const salario = byCategory.find((item) => item.category === "salario");
    const freela = byCategory.find((item) => item.category === "freela");

    expect(salario).toMatchObject({
      plannedAmount: 500000,
      receivedAmount: 500000,
      remainingAmount: 0,
      abovePlannedAmount: 0,
    });

    expect(freela).toMatchObject({
      plannedAmount: 150000,
      receivedAmount: 120000,
      remainingAmount: 30000,
      abovePlannedAmount: 0,
    });
  });
});

describe("income overdue rules", () => {
  const referenceDate = new Date("2026-05-20T10:00:00.000Z");

  it("entrada sem recebimento antes da data prevista não fica atrasada", () => {
    expect(
      isIncomeOverdue({
        expectedDay: 25,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });

  it("entrada sem recebimento após data prevista fica atrasada", () => {
    expect(
      isIncomeOverdue({
        expectedDay: 5,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(true);
  });

  it("entrada com recebimento não fica atrasada", () => {
    expect(
      isIncomeOverdue({
        expectedDay: 5,
        actualAmount: 1,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });

  it("mês futuro não marca atraso", () => {
    expect(
      isIncomeOverdue({
        expectedDay: 5,
        actualAmount: 0,
        periodMonth: "2026-06",
        referenceDate,
      })
    ).toBe(false);
  });

  it("mês passado marca atraso quando pendente", () => {
    expect(
      isIncomeOverdue({
        expectedDay: 5,
        actualAmount: 0,
        periodMonth: "2026-04",
        referenceDate,
      })
    ).toBe(true);
  });

  it("sem expectedDay não marca atraso", () => {
    expect(
      isIncomeOverdue({
        expectedDay: null,
        actualAmount: 0,
        periodMonth: "2026-05",
        referenceDate,
      })
    ).toBe(false);
  });
});
