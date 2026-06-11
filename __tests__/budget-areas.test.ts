import { describe, expect, it } from "vitest";
import {
  calculateBudgetAreasAnalysis,
  getDefaultBudgetAreaModel,
  mapExpenseCategoryToBudgetArea,
  sumBudgetAreaBaseIncome,
} from "@/lib/budget-areas";

describe("budget areas helpers", () => {
  it("calcula o ideal por percentual", () => {
    const analysis = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-06",
      baseIncomeCents: 1_000_000,
      expenseItems: [],
      model: getDefaultBudgetAreaModel(),
    });

    const necessidades = analysis.rows.find((row) => row.areaKey === "necessidades_basicas");

    expect(necessidades?.idealAmountCents).toBe(500_000);
    expect(analysis.totalIdealDistributedCents).toBe(1_000_000);
  });

  it("agrupa gastos planejados por categoria", () => {
    const analysis = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-06",
      baseIncomeCents: 1_000_000,
      expenseItems: [
        {
          id: "1",
          name: "Aluguel",
          category: "moradia",
          expenseType: "fixo",
          amount: 250_000,
          startMonth: "2026-01",
          endMonth: null,
        },
        {
          id: "2",
          name: "Supermercado",
          category: "alimentacao",
          expenseType: "variavel",
          amount: 150_000,
          startMonth: "2026-01",
          endMonth: null,
        },
        {
          id: "3",
          name: "Escola Tito",
          category: "educacao",
          expenseType: "fixo",
          amount: 160_000,
          startMonth: "2026-01",
          endMonth: null,
        },
        {
          id: "4",
          name: "Família",
          category: "familia",
          expenseType: "variavel",
          amount: 40_000,
          startMonth: "2026-01",
          endMonth: null,
        },
        {
          id: "5",
          name: "BB",
          category: "dividas",
          expenseType: "fixo",
          amount: 300_000,
          startMonth: "2026-01",
          endMonth: null,
        },
      ],
      model: getDefaultBudgetAreaModel(),
    });

    const necessidades = analysis.rows.find((row) => row.areaKey === "necessidades_basicas");
    const dividas = analysis.rows.find((row) => row.areaKey === "dividas");
    const educacao = analysis.rows.find((row) => row.areaKey === "educacao");

    expect(necessidades?.actualPlannedAmountCents).toBe(600_000);
    expect(dividas?.actualPlannedAmountCents).toBe(300_000);
    expect(educacao?.actualPlannedAmountCents).toBe(0);
  });

  it("calcula a diferença entre ideal e real", () => {
    const analysis = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-06",
      baseIncomeCents: 1_000_000,
      expenseItems: [
        {
          id: "1",
          name: "BB",
          category: "dividas",
          expenseType: "fixo",
          amount: 300_000,
          startMonth: "2026-01",
          endMonth: null,
        },
      ],
      model: getDefaultBudgetAreaModel(),
    });

    const dividas = analysis.rows.find((row) => row.areaKey === "dividas");

    expect(dividas?.idealAmountCents).toBe(200_000);
    expect(dividas?.differenceCents).toBe(100_000);
  });

  it("coloca categoria não mapeada em não classificado", () => {
    const analysis = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-06",
      baseIncomeCents: 1_000_000,
      expenseItems: [
        {
          id: "1",
          name: "Item misterioso",
          category: "misteriosa",
          expenseType: "variavel",
          amount: 50_000,
          startMonth: "2026-01",
          endMonth: null,
        },
      ],
      model: getDefaultBudgetAreaModel(),
    });

    const unclassified = analysis.rows.find((row) => row.areaKey === "nao_classificado");

    expect(unclassified?.label).toBe("Não classificado");
    expect(unclassified?.actualPlannedAmountCents).toBe(50_000);
  });

  it("respeita vigência ao calcular o planejado atual", () => {
    const futureItem = {
      id: "1",
      name: "Escola Joana",
      category: "educacao",
      expenseType: "fixo",
      amount: 160_000,
      startMonth: "2026-08",
      endMonth: null,
    };

    const beforeStart = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-07",
      baseIncomeCents: 1_000_000,
      expenseItems: [futureItem],
      model: getDefaultBudgetAreaModel(),
    });

    const atStart = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-08",
      baseIncomeCents: 1_000_000,
      expenseItems: [futureItem],
      model: getDefaultBudgetAreaModel(),
    });

    expect(beforeStart.rows.find((row) => row.areaKey === "necessidades_basicas")?.actualPlannedAmountCents).toBe(0);
    expect(atStart.rows.find((row) => row.areaKey === "necessidades_basicas")?.actualPlannedAmountCents).toBe(160_000);
  });

  it("impede planejamento após o término", () => {
    const item = {
      id: "1",
      name: "Escola temporária",
      category: "educacao",
      expenseType: "fixo",
      amount: 90_000,
      startMonth: "2026-08",
      endMonth: "2026-08",
    };

    const afterEnd = calculateBudgetAreasAnalysis({
      referenceMonth: "2026-09",
      baseIncomeCents: 1_000_000,
      expenseItems: [item],
      model: getDefaultBudgetAreaModel(),
    });

    expect(afterEnd.rows.find((row) => row.areaKey === "necessidades_basicas")?.actualPlannedAmountCents).toBe(0);
  });

  it("soma a renda base considerando vigência", () => {
    expect(
      sumBudgetAreaBaseIncome(
        [
          {
            id: "1",
            name: "Salário",
            category: "salario",
            amount: 800_000,
            startMonth: "2026-01",
            endMonth: null,
          },
          {
            id: "2",
            name: "Freela futuro",
            category: "freela",
            amount: 300_000,
            startMonth: "2026-08",
            endMonth: null,
          },
        ],
        "2026-06"
      )
    ).toBe(800_000);
  });

  it("mapeia categorias conhecidas para áreas", () => {
    expect(mapExpenseCategoryToBudgetArea("moradia")).toBe("necessidades_basicas");
    expect(mapExpenseCategoryToBudgetArea("educacao")).toBe("necessidades_basicas");
    expect(mapExpenseCategoryToBudgetArea("familia")).toBe("necessidades_basicas");
    expect(mapExpenseCategoryToBudgetArea("dividas")).toBe("dividas");
    expect(mapExpenseCategoryToBudgetArea("doacoes")).toBe("doacoes");
  });
});
