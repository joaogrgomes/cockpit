import { describe, expect, it } from "vitest";
import {
  computeDebtNextDueDate,
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

  it("expõe rótulos e badges da agenda", () => {
    expect(getPaymentAgendaSourceLabel("future_expense")).toBe("Gasto futuro");
    expect(getPaymentAgendaSourceActionLabel("debt_proposal")).toBe("Abrir dívida");
    expect(getPaymentAgendaStatusLabel("future_expense", "previsto")).toBe("Previsto");
    expect(getPaymentAgendaStatusLabel("debt_proposal", "ativa")).toBe("Ativa");
    expect(getPaymentAgendaStatusBadgeVariant("debt_due", "em_atraso")).toBe("destructive");
  });
});

