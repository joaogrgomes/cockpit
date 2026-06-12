import { describe, expect, it } from "vitest";
import {
  buildMonthlyExpenseAgendaItem,
  computeDebtNextDueDate,
  filterPaymentAgendaItemsByWindow,
  getMonthlyExpenseAgendaDueDate,
  getPaymentAgendaWindow,
  getPaymentAgendaSourceActionLabel,
  getPaymentAgendaSourceLabel,
  getPaymentAgendaStatusBadgeVariant,
  getPaymentAgendaStatusLabel,
  groupPaymentAgendaItems,
  type PaymentAgendaItem,
} from "@/lib/payment-agenda";

function buildItem(overrides: Partial<PaymentAgendaItem> & Pick<PaymentAgendaItem, "id" | "sourceType" | "title" | "amountCents" | "dueDate" | "status" | "category" | "href">): PaymentAgendaItem {
  return {
    paymentMethod: null,
    paymentCode: null,
    notes: null,
    ...overrides,
  };
}

describe("payment agenda helpers", () => {
  it("agrupa itens por período", () => {
    const agenda = groupPaymentAgendaItems(
      [
        buildItem({
          id: "today",
          sourceType: "future_expense",
          title: "Hoje",
          amountCents: 1000,
          dueDate: "2026-06-11",
          status: "previsto",
          category: "Transporte",
          href: "/expenses/future",
        }),
        buildItem({
          id: "overdue",
          sourceType: "debt_due",
          title: "Vencido",
          amountCents: 2000,
          dueDate: "2026-06-10",
          status: "em_atraso",
          category: "Quitação",
          href: "/debts/1",
        }),
        buildItem({
          id: "tomorrow",
          sourceType: "future_expense",
          title: "Amanhã",
          amountCents: 3000,
          dueDate: "2026-06-12",
          status: "previsto",
          category: "Saúde",
          href: "/expenses/future",
        }),
        buildItem({
          id: "week",
          sourceType: "debt_proposal",
          title: "Semana",
          amountCents: 4000,
          dueDate: "2026-06-14",
          status: "ativa",
          category: "Quitação",
          href: "/debts/2",
        }),
        buildItem({
          id: "next",
          sourceType: "debt_clearance",
          title: "Próximo",
          amountCents: 5000,
          dueDate: "2026-06-18",
          status: "aguardando_baixa",
          category: "Quitação",
          href: "/debts/3",
        }),
      ],
      "2026-06-11"
    );

    expect(agenda.totalCount).toBe(5);
    expect(agenda.totalAmountCents).toBe(15_000);
    expect(agenda.buckets.today.count).toBe(2);
    expect(agenda.buckets.tomorrow.count).toBe(1);
    expect(agenda.buckets.week.count).toBe(1);
    expect(agenda.buckets.next.count).toBe(1);
  });

  it("calcula o próximo vencimento por dia da dívida", () => {
    expect(computeDebtNextDueDate(15, "2026-06-11")).toBe("2026-06-15");
    expect(computeDebtNextDueDate(10, "2026-06-11")).toBe("2026-07-10");
  });

  it("calcula e agrupa despesas mensais planejadas pendentes", () => {
    const today = "2026-06-12";
    const window = getPaymentAgendaWindow(today);

    const dueToday = buildMonthlyExpenseAgendaItem({
      monthlyExpenseId: "expense-1",
      name: "ChatGPT",
      category: "assinaturas",
      expenseType: "fixo",
      dueDay: 12,
      amount: 11000,
      startMonth: "2026-01",
      endMonth: null,
      isActive: true,
      periodMonth: "2026-06",
      actualAmount: 0,
      referenceDate: today,
    });

    const overdue = buildMonthlyExpenseAgendaItem({
      monthlyExpenseId: "expense-2",
      name: "Pilates da Poli",
      category: "saude",
      expenseType: "fixo",
      dueDay: 5,
      amount: 18000,
      startMonth: "2026-01",
      endMonth: null,
      isActive: true,
      periodMonth: "2026-06",
      actualAmount: 0,
      referenceDate: today,
    });

    const realized = buildMonthlyExpenseAgendaItem({
      monthlyExpenseId: "expense-3",
      name: "Realizado",
      category: "saude",
      expenseType: "fixo",
      dueDay: 12,
      amount: 18000,
      startMonth: "2026-01",
      endMonth: null,
      isActive: true,
      periodMonth: "2026-06",
      actualAmount: 5000,
      referenceDate: today,
    });

    const futureSeven = buildMonthlyExpenseAgendaItem({
      monthlyExpenseId: "expense-4",
      name: "Academia",
      category: "saude",
      expenseType: "fixo",
      dueDay: 19,
      amount: 9000,
      startMonth: "2026-01",
      endMonth: null,
      isActive: true,
      periodMonth: "2026-06",
      actualAmount: 0,
      referenceDate: today,
    });

    const futureEight = buildMonthlyExpenseAgendaItem({
      monthlyExpenseId: "expense-5",
      name: "Curso",
      category: "educacao",
      expenseType: "fixo",
      dueDay: 20,
      amount: 45000,
      startMonth: "2026-01",
      endMonth: null,
      isActive: true,
      periodMonth: "2026-06",
      actualAmount: 0,
      referenceDate: today,
    });

    expect(dueToday?.dueDate).toBe("2026-06-12");
    expect(dueToday?.status).toBe("hoje");
    expect(overdue?.status).toBe("atrasado");
    expect(realized).toBeNull();
    expect(futureSeven?.status).toBe("proximo");
    expect(futureEight?.status).toBe("proximo");

    const filtered = filterPaymentAgendaItemsByWindow(
      [dueToday, overdue, futureSeven, futureEight].filter(
        (item): item is PaymentAgendaItem => Boolean(item)
      ),
      today
    );

    expect(window).toEqual({
      startDate: "2026-06-12",
      endDate: "2026-06-19",
    });
    expect(filtered.map((item) => item.title)).toEqual([
      "ChatGPT",
      "Pilates da Poli",
      "Academia",
    ]);
    expect(filtered.some((item) => item.title === "Curso")).toBe(false);

    const agenda = groupPaymentAgendaItems(
      filtered,
      today
    );

    expect(agenda.totalCount).toBe(3);
    expect(agenda.items.map((item) => item.title)).toEqual([
      "Pilates da Poli",
      "ChatGPT",
      "Academia",
    ]);
    expect(agenda.buckets.today.items.map((item) => item.title)).toEqual([
      "Pilates da Poli",
      "ChatGPT",
    ]);
    expect(agenda.buckets.today.count).toBe(2);
  });

  it("calcula vencimento mensal com corte no fim do mês", () => {
    expect(getMonthlyExpenseAgendaDueDate("2026-02", 31)).toBe("2026-02-28");
  });

  it("expõe rótulos e badges da agenda", () => {
    expect(getPaymentAgendaSourceLabel("future_expense")).toBe("Gasto futuro");
    expect(getPaymentAgendaSourceLabel("monthly_expense")).toBe("Despesa mensal");
    expect(getPaymentAgendaSourceActionLabel("debt_proposal")).toBe("Abrir dívida");
    expect(getPaymentAgendaSourceActionLabel("monthly_expense")).toBe("Abrir acompanhamento");
    expect(getPaymentAgendaStatusLabel("future_expense", "previsto")).toBe("Previsto");
    expect(getPaymentAgendaStatusLabel("debt_proposal", "ativa")).toBe("Ativa");
    expect(getPaymentAgendaStatusLabel("monthly_expense", "atrasado")).toBe("Atrasado");
    expect(getPaymentAgendaStatusBadgeVariant("debt_due", "em_atraso")).toBe("destructive");
    expect(getPaymentAgendaStatusBadgeVariant("monthly_expense", "hoje")).toBe("default");
  });
});
