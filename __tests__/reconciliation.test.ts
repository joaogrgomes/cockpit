import { describe, expect, it } from "vitest";
import {
  buildReconciliationSummary,
  getReconciliationDifferenceMessage,
  type ReconciliationItem,
} from "@/lib/reconciliation";

function buildItem(
  overrides: Partial<ReconciliationItem> &
    Pick<
      ReconciliationItem,
      "id" | "type" | "date" | "periodMonth" | "title" | "amountCents" | "category" | "categoryLabel" | "originType" | "originLabel"
    >
): ReconciliationItem {
  return {
    href: `/statement/${overrides.type === "income" ? "monthly_income_entry" : "monthly_expense_entry"}/${overrides.id}`,
    notes: null,
    createdAt: new Date(2026, 5, 10, 10, 0, 0),
    updatedAt: new Date(2026, 5, 10, 10, 0, 0),
    ...overrides,
  };
}

describe("reconciliation helpers", () => {
  it("calcula diferença e saldo final", () => {
    const summary = buildReconciliationSummary({
      periodMonth: "2026-06",
      cutoffDate: "2026-06-12",
      bankBalanceCents: 1_103_500,
      openingBalanceCents: 1_000_000,
      openingBalanceSourceLabel: "Carry-over do mês anterior",
      items: [
        buildItem({
          id: "income-1",
          type: "income",
          date: "2026-06-10",
          periodMonth: "2026-06",
          title: "Salário",
          amountCents: 200_000,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_linked",
          originLabel: "Entrada planejada",
        }),
        buildItem({
          id: "expense-1",
          type: "expense",
          date: "2026-06-11",
          periodMonth: "2026-06",
          title: "Mercado",
          amountCents: 49_500,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originType: "monthly_expense_entry_one_time",
          originLabel: "Gasto avulso",
        }),
      ],
      allItems: [],
    });

    expect(summary.openingBalanceCents).toBe(1_000_000);
    expect(summary.realizedIncomeCents).toBe(200_000);
    expect(summary.realizedExpenseCents).toBe(49_500);
    expect(summary.calculatedClosingBalanceCents).toBe(1_150_500);
    expect(summary.cockpitBalanceCents).toBe(1_150_500);
    expect(summary.differenceCents).toBe(47_000);
  });

  it("expõe mensagem para diferença positiva", () => {
    expect(getReconciliationDifferenceMessage(47_000)).toContain("acima do banco");
    expect(getReconciliationDifferenceMessage(47_000)).toContain("gasto faltando");
  });

  it("expõe mensagem para diferença negativa", () => {
    expect(getReconciliationDifferenceMessage(-47_000)).toContain("abaixo do banco");
    expect(getReconciliationDifferenceMessage(-47_000)).toContain("entrada faltando");
  });

  it("marca lançamento com valor exato da diferença como suspeito", () => {
    const summary = buildReconciliationSummary({
      periodMonth: "2026-06",
      cutoffDate: "2026-06-12",
      bankBalanceCents: 0,
      openingBalanceCents: 0,
      openingBalanceSourceLabel: "Configuração inicial",
      items: [
        buildItem({
          id: "exact",
          type: "income",
          date: "2026-06-12",
          periodMonth: "2026-06",
          title: "Entrada exata",
          amountCents: 47_000,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_one_time",
          originLabel: "Entrada avulsa",
        }),
      ],
    });

    expect(summary.differenceCents).toBe(47_000);
    expect(summary.suspects[0]?.reason).toContain("Valor exato");
  });

  it("marca lançamento próximo da diferença como suspeito", () => {
    const summary = buildReconciliationSummary({
      periodMonth: "2026-06",
      cutoffDate: "2026-06-12",
      bankBalanceCents: 0,
      openingBalanceCents: 0,
      openingBalanceSourceLabel: "Configuração inicial",
      items: [
        buildItem({
          id: "near-1",
          type: "income",
          date: "2026-06-12",
          periodMonth: "2026-06",
          title: "Entrada próxima",
          amountCents: 46_500,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_one_time",
          originLabel: "Entrada avulsa",
        }),
        buildItem({
          id: "near-2",
          type: "income",
          date: "2026-06-12",
          periodMonth: "2026-06",
          title: "Completar diferença",
          amountCents: 500,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_one_time",
          originLabel: "Entrada avulsa",
        }),
      ],
    });

    expect(summary.differenceCents).toBe(47_000);
    expect(summary.suspects[0]?.reason).toContain("Valor próximo");
  });

  it("marca lançamento fora do mês mas criado recentemente como suspeito", () => {
    const summary = buildReconciliationSummary({
      periodMonth: "2026-06",
      cutoffDate: "2026-06-12",
      bankBalanceCents: 0,
      openingBalanceCents: 0,
      openingBalanceSourceLabel: "Configuração inicial",
      items: [
        buildItem({
          id: "current",
          type: "income",
          date: "2026-06-12",
          periodMonth: "2026-06",
          title: "Entrada do mês",
          amountCents: 47_000,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_one_time",
          originLabel: "Entrada avulsa",
        }),
      ],
      allItems: [
        buildItem({
          id: "recent-outside",
          type: "expense",
          date: "2026-05-28",
          periodMonth: "2026-05",
          title: "Despesa fora do mês",
          amountCents: 12_000,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originType: "monthly_expense_entry_one_time",
          originLabel: "Gasto avulso",
          createdAt: new Date(2026, 5, 11, 9, 0, 0),
          updatedAt: new Date(2026, 5, 11, 9, 0, 0),
        }),
        buildItem({
          id: "current",
          type: "income",
          date: "2026-06-12",
          periodMonth: "2026-06",
          title: "Entrada do mês",
          amountCents: 47_000,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry_one_time",
          originLabel: "Entrada avulsa",
        }),
      ],
    });

    expect(summary.differenceCents).toBe(47_000);
    expect(summary.suspects.some((suspect) => suspect.reason.includes("Fora do mês selecionado"))).toBe(
      true
    );
  });
});
