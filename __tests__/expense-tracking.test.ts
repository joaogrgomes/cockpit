import { describe, expect, it } from "vitest";
import {
  buildTrackingSummary,
  buildTrackingSummaryByCategory,
  calcTrackingStatus,
  getCurrentPeriodMonth,
  isValidPeriodMonth,
  normalizePeriodMonth,
  sumEntryAmounts,
} from "@/lib/expense-tracking";

describe("calcTrackingStatus", () => {
  it("retorna pendente quando não há realizado", () => {
    expect(calcTrackingStatus(10000, 0)).toBe("pendente");
  });

  it("retorna parcial quando realizado < previsto", () => {
    expect(calcTrackingStatus(10000, 7000)).toBe("parcial");
  });

  it("retorna concluido quando realizado = previsto", () => {
    expect(calcTrackingStatus(10000, 10000)).toBe("concluido");
  });

  it("retorna estourado quando realizado > previsto", () => {
    expect(calcTrackingStatus(10000, 12000)).toBe("estourado");
  });
});

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

  it("monta resumo geral do mês", () => {
    const summary = buildTrackingSummary([
      {
        category: "moradia",
        plannedAmount: 300000,
        actualAmount: 300000,
        remainingAmount: 0,
        status: "concluido",
      },
      {
        category: "alimentacao",
        plannedAmount: 150000,
        actualAmount: 50000,
        remainingAmount: 100000,
        status: "parcial",
      },
      {
        category: "lazer",
        plannedAmount: 50000,
        actualAmount: 80000,
        remainingAmount: -30000,
        status: "estourado",
      },
      {
        category: "educacao",
        plannedAmount: 70000,
        actualAmount: 0,
        remainingAmount: 70000,
        status: "pendente",
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
  });

  it("monta resumo por categoria", () => {
    const byCategory = buildTrackingSummaryByCategory([
      { category: "moradia", plannedAmount: 100000, actualAmount: 70000 },
      { category: "moradia", plannedAmount: 50000, actualAmount: 50000 },
      { category: "alimentacao", plannedAmount: 80000, actualAmount: 90000 },
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
