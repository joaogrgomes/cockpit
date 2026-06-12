import { describe, expect, it } from "vitest";
import { calculateDailyRunningBalances, getMonthDateRange } from "@/lib/daily-balance";
import type { StatementItem } from "@/lib/statement";
import { buildReconciliationSummary, type ReconciliationItem } from "@/lib/reconciliation";

function buildStatementItem(
  overrides: Partial<StatementItem> &
    Pick<
      StatementItem,
      | "id"
      | "kind"
      | "date"
      | "periodMonth"
      | "description"
      | "category"
      | "categoryLabel"
      | "amount"
      | "signedAmount"
      | "originId"
      | "originType"
    >
): StatementItem {
  return {
    source: overrides.kind === "income" ? "linked" : "one_time",
    notes: null,
    paymentMethod: null,
    createdAt: new Date(2026, 5, 10, 10, 0, 0),
    originId: overrides.originId,
    ...overrides,
  };
}

function buildReconciliationItem(
  overrides: Partial<ReconciliationItem> &
    Pick<
      ReconciliationItem,
      | "id"
      | "type"
      | "date"
      | "periodMonth"
      | "title"
      | "amountCents"
      | "category"
      | "categoryLabel"
      | "originType"
      | "originLabel"
    >
): ReconciliationItem {
  return {
    href: undefined,
    notes: null,
    createdAt: new Date(2026, 5, 10, 10, 0, 0),
    updatedAt: new Date(2026, 5, 10, 10, 0, 0),
    ...overrides,
  };
}

describe("daily balance helper", () => {
  it("usa o último dia real do mês", () => {
    expect(getMonthDateRange("2026-06")).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });

  it("calcula saldo acumulado diário", () => {
    const balances = calculateDailyRunningBalances({
      openingBalanceCents: 10_000,
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      items: [
        buildStatementItem({
          id: "expense-1",
          kind: "expense",
          date: "2026-06-01",
          periodMonth: "2026-06",
          description: "Gasto 1",
          amount: 500,
          signedAmount: -500,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originId: "expense-1",
          originType: "monthly_expense_entry",
        }),
        buildStatementItem({
          id: "expense-2",
          kind: "expense",
          date: "2026-06-02",
          periodMonth: "2026-06",
          description: "Gasto 2",
          amount: 500,
          signedAmount: -500,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originId: "expense-2",
          originType: "monthly_expense_entry",
        }),
      ],
    });

    expect(balances.map((day) => day.closingBalanceCents)).toEqual([9_500, 9_000, 9_000]);
  });

  it("mantém o saldo nos dias sem lançamento", () => {
    const balances = calculateDailyRunningBalances({
      openingBalanceCents: 10_000,
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      items: [
        buildStatementItem({
          id: "expense-1",
          kind: "expense",
          date: "2026-06-01",
          periodMonth: "2026-06",
          description: "Gasto 1",
          amount: 500,
          signedAmount: -500,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originId: "expense-1",
          originType: "monthly_expense_entry",
        }),
      ],
    });

    expect(balances[0]?.closingBalanceCents).toBe(9_500);
    expect(balances[1]?.closingBalanceCents).toBe(9_500);
    expect(balances[2]?.closingBalanceCents).toBe(9_500);
  });

  it("entradas aumentam o saldo e calculam resultado do dia", () => {
    const balances = calculateDailyRunningBalances({
      openingBalanceCents: 10_000,
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      items: [
        buildStatementItem({
          id: "income-1",
          kind: "income",
          date: "2026-06-01",
          periodMonth: "2026-06",
          description: "Entrada",
          amount: 1_000,
          signedAmount: 1_000,
          category: "salario",
          categoryLabel: "Salário",
          originId: "income-1",
          originType: "monthly_income_entry",
        }),
        buildStatementItem({
          id: "expense-1",
          kind: "expense",
          date: "2026-06-01",
          periodMonth: "2026-06",
          description: "Gasto",
          amount: 300,
          signedAmount: -300,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originId: "expense-1",
          originType: "monthly_expense_entry",
        }),
      ],
    });

    expect(balances[0]?.dailyResultCents).toBe(700);
    expect(balances[0]?.closingBalanceCents).toBe(10_700);
  });

  it("ordena por data antes de calcular", () => {
    const balances = calculateDailyRunningBalances({
      openingBalanceCents: 10_000,
      startDate: "2026-06-01",
      endDate: "2026-06-02",
      items: [
        buildReconciliationItem({
          id: "day-2-income",
          kind: "income",
          date: "2026-06-02",
          periodMonth: "2026-06",
          description: "Entrada do dia 2",
          amount: 1_000,
          signedAmount: 1_000,
          category: "salario",
          categoryLabel: "Salário",
          originId: "day-2-income",
          originType: "monthly_income_entry",
        }),
        buildReconciliationItem({
          id: "day-1-expense",
          kind: "expense",
          date: "2026-06-01",
          periodMonth: "2026-06",
          description: "Gasto do dia 1",
          amount: 500,
          signedAmount: -500,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originId: "day-1-expense",
          originType: "monthly_expense_entry",
        }),
      ],
    });

    expect(balances[0]?.closingBalanceCents).toBe(9_500);
    expect(balances[1]?.closingBalanceCents).toBe(10_500);
  });

  it("integra com reconciliation sem mudar a diferença final", () => {
    const summary = buildReconciliationSummary({
      periodMonth: "2026-06",
      cutoffDate: "2026-06-12",
      bankBalanceCents: 11_035,
      openingBalanceCents: 10_000,
      openingBalanceSourceLabel: "Carry-over do mês anterior",
      items: [
        buildReconciliationItem({
          id: "income-1",
          type: "income",
          date: "2026-06-01",
          periodMonth: "2026-06",
          title: "Entrada",
          amountCents: 1_000,
          category: "salario",
          categoryLabel: "Salário",
          originType: "monthly_income_entry",
          originLabel: "Entrada planejada",
        }),
        buildReconciliationItem({
          id: "expense-1",
          type: "expense",
          date: "2026-06-02",
          periodMonth: "2026-06",
          title: "Gasto",
          amountCents: 465,
          category: "alimentacao",
          categoryLabel: "Alimentação",
          originType: "monthly_expense_entry",
          originLabel: "Gasto avulso",
        }),
      ],
    });

    expect(summary.calculatedClosingBalanceCents).toBe(10_535);
    expect(summary.differenceCents).toBe(-500);
  });
});
