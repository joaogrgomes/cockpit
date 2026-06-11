import { describe, expect, it } from "vitest";
import {
  canScheduleFutureExpenseFromCostKind,
  calculateAnnualAmount,
  calculateCostAnalysisTotals,
  getCostAnalysisKindLabel,
} from "@/lib/cost-analyses";
import { CostAnalysisItemSchema } from "@/lib/validations";
import type { CostAnalysisItem } from "@/types";

function makeItem(overrides: Partial<CostAnalysisItem>): CostAnalysisItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    costAnalysisId: overrides.costAnalysisId ?? "analysis-id",
    name: overrides.name ?? "Item",
    monthlyAmountCents: overrides.monthlyAmountCents ?? 0,
    costKind: overrides.costKind ?? "cash",
    notes: overrides.notes ?? null,
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? new Date("2026-06-11T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-06-11T00:00:00.000Z"),
  };
}

describe("cost analyses helpers", () => {
  it("calcula valor anual a partir do mensal", () => {
    expect(calculateAnnualAmount(60_500)).toBe(726_000);
  });

  it("soma total mensal e total anual do carro", () => {
    const analysis = calculateCostAnalysisTotals(
      [
        makeItem({ name: "Financiamento", monthlyAmountCents: 60_500, costKind: "cash" }),
        makeItem({ name: "Depreciação", monthlyAmountCents: 13_000, costKind: "economic", sortOrder: 1 }),
        makeItem({ name: "Combustível", monthlyAmountCents: 65_000, costKind: "cash", sortOrder: 2 }),
        makeItem({ name: "Estacionamento", monthlyAmountCents: 2_500, costKind: "cash", sortOrder: 3 }),
        makeItem({ name: "IPVA", monthlyAmountCents: 18_000, costKind: "provision", sortOrder: 4 }),
        makeItem({ name: "Custo de oportunidade", monthlyAmountCents: 0, costKind: "economic", sortOrder: 5 }),
        makeItem({ name: "Seguro", monthlyAmountCents: 20_300, costKind: "provision", sortOrder: 6 }),
        makeItem({ name: "Pedágio", monthlyAmountCents: 500, costKind: "cash", sortOrder: 7 }),
        makeItem({ name: "Manutenção", monthlyAmountCents: 18_000, costKind: "provision", sortOrder: 8 }),
        makeItem({ name: "Lavagem", monthlyAmountCents: 6_000, costKind: "cash", sortOrder: 9 }),
      ],
      1_130_000,
      1_600_000
    );

    expect(analysis.totalMonthlyCents).toBe(203_800);
    expect(analysis.totalAnnualCents).toBe(2_445_600);
    expect(analysis.totalCashMonthlyCents).toBe(134_500);
    expect(analysis.totalEconomicMonthlyCents).toBe(13_000);
    expect(analysis.totalProvisionMonthlyCents).toBe(56_300);
  });

  it("calcula percentuais sobre renda líquida e bruta", () => {
    const analysis = calculateCostAnalysisTotals(
      [
        makeItem({ name: "Financiamento", monthlyAmountCents: 60_500 }),
        makeItem({ name: "Combustível", monthlyAmountCents: 65_000, sortOrder: 1 }),
        makeItem({ name: "Seguro", monthlyAmountCents: 20_300, costKind: "provision", sortOrder: 2 }),
        makeItem({ name: "Lavagem", monthlyAmountCents: 6_000, sortOrder: 3 }),
        makeItem({ name: "Manutenção", monthlyAmountCents: 18_000, costKind: "provision", sortOrder: 4 }),
        makeItem({ name: "IPVA", monthlyAmountCents: 18_000, costKind: "provision", sortOrder: 5 }),
        makeItem({ name: "Depreciação", monthlyAmountCents: 13_000, costKind: "economic", sortOrder: 6 }),
        makeItem({ name: "Estacionamento", monthlyAmountCents: 2_500, sortOrder: 7 }),
        makeItem({ name: "Pedágio", monthlyAmountCents: 500, sortOrder: 8 }),
        makeItem({ name: "Custo de oportunidade", monthlyAmountCents: 0, costKind: "economic", sortOrder: 9 }),
      ],
      1_130_000,
      1_600_000
    );

    expect(analysis.netIncomePercentage).toBe(18.04);
    expect(analysis.grossIncomePercentage).toBe(12.74);
  });

  it("retorna percentual nulo quando a renda base é zero", () => {
    const analysis = calculateCostAnalysisTotals([makeItem({ monthlyAmountCents: 10_000 })], 0, 0);

    expect(analysis.netIncomePercentage).toBeNull();
    expect(analysis.grossIncomePercentage).toBeNull();
  });

  it("mapeia labels dos tipos de custo", () => {
    expect(getCostAnalysisKindLabel("cash")).toBe("Saída de caixa");
    expect(getCostAnalysisKindLabel("economic")).toBe("Custo econômico");
    expect(getCostAnalysisKindLabel("provision")).toBe("Provisão");
  });

  it("permite agendar gasto apenas para provisionados", () => {
    expect(canScheduleFutureExpenseFromCostKind("provision")).toBe(true);
    expect(canScheduleFutureExpenseFromCostKind("cash")).toBe(false);
    expect(canScheduleFutureExpenseFromCostKind("economic")).toBe(false);
  });

  it("rejeita costKind inválido", () => {
    const result = CostAnalysisItemSchema.safeParse({
      analysisId: "550e8400-e29b-41d4-a716-446655440000",
      itemId: null,
      name: "Item inválido",
      monthlyAmountCents: 10_000,
      costKind: "invalido",
      notes: null,
    });

    expect(result.success).toBe(false);
  });
});
