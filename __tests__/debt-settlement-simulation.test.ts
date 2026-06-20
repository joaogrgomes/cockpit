import { describe, expect, it } from "vitest";
import {
  buildDebtSettlementSimulation,
  filterDebtSettlementSimulationDebts,
  getDebtSettlementSimulationCreditors,
} from "@/lib/debt-settlement-simulation";
import type { DebtSettlementOption, DebtSettlementSimulationDebt } from "@/types";

function makeOption(overrides: Partial<DebtSettlementOption>): DebtSettlementOption {
  return {
    id: "option-1",
    debtId: "debt-1",
    kind: "cash",
    installments: 1,
    totalAmountCents: 100_000,
    upfrontAmountCents: 100_000,
    monthlyInstallmentCents: null,
    firstDueDate: null,
    validUntil: null,
    status: "active",
    notes: null,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    ...overrides,
  };
}

function makeDebt(overrides: Partial<DebtSettlementSimulationDebt> = {}): DebtSettlementSimulationDebt {
  return {
    id: "debt-1",
    name: "Santander",
    creditor: "Santander",
    type: "cartao",
    debtType: "payoff",
    status: "em_aberto",
    currentValue: 100_000,
    originalValue: null,
    monthlyPayment: null,
    dueDay: null,
    dueDate: null,
    totalInstallments: null,
    paidInstallments: null,
    overdueSince: null,
    paidAt: null,
    paidAmount: null,
    paymentMethod: null,
    clearanceDueDate: null,
    clearedAt: null,
    archivedAt: null,
    paymentNotes: null,
    priority: null,
    perceivedRisk: null,
    notes: null,
    tags: null,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    lastUpdatedAt: new Date("2026-06-10T10:00:00Z"),
    hasActiveProposal: false,
    settlementOptions: [],
    ...overrides,
  };
}

describe("buildDebtSettlementSimulation", () => {
  it("retorna totais zerados quando a simulação está vazia", () => {
    const result = buildDebtSettlementSimulation({
      debts: [],
      selectedOptionIds: [],
    });

    expect(result).toEqual({
      acceptedItems: [],
      selectedItems: [],
      allItems: [],
      immediateOutflowCents: 0,
      futureInstallmentsTotalCents: 0,
      totalOperationCents: 0,
      monthlySchedule: [],
      maxMonthlyInstallmentCents: 0,
      committedMonthsCount: 0,
    });
  });

  it("inclui opções aceitas automaticamente no cálculo base", () => {
    const debt = makeDebt({
      settlementOptions: [
        makeOption({
          id: "accepted-cash",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 90_000,
          upfrontAmountCents: 90_000,
          status: "accepted",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debt],
      selectedOptionIds: [],
    });

    expect(result.acceptedItems).toHaveLength(1);
    expect(result.selectedItems).toHaveLength(0);
    expect(result.immediateOutflowCents).toBe(90_000);
    expect(result.totalOperationCents).toBe(90_000);
  });

  it("coloca opção à vista no desembolso imediato", () => {
    const debt = makeDebt({
      settlementOptions: [
        makeOption({
          id: "cash-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 120_000,
          upfrontAmountCents: 120_000,
          status: "active",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debt],
      selectedOptionIds: ["cash-1"],
    });

    expect(result.immediateOutflowCents).toBe(120_000);
    expect(result.futureInstallmentsTotalCents).toBe(0);
    expect(result.totalOperationCents).toBe(120_000);
    expect(result.monthlySchedule).toHaveLength(0);
  });

  it("gera cronograma mensal para opção parcelada com entrada", () => {
    const debt = makeDebt({
      settlementOptions: [
        makeOption({
          id: "installment-1",
          debtId: "debt-1",
          kind: "installment",
          installments: 3,
          totalAmountCents: 35_000,
          upfrontAmountCents: 5_000,
          monthlyInstallmentCents: 10_000,
          firstDueDate: "2026-07-10",
          status: "active",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debt],
      selectedOptionIds: ["installment-1"],
    });

    expect(result.immediateOutflowCents).toBe(5_000);
    expect(result.futureInstallmentsTotalCents).toBe(30_000);
    expect(result.totalOperationCents).toBe(35_000);
    expect(result.maxMonthlyInstallmentCents).toBe(10_000);
    expect(result.committedMonthsCount).toBe(3);
    expect(result.monthlySchedule.map((month) => month.periodMonth)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("agrupa parcelas de dívidas diferentes no mesmo mês", () => {
    const debtA = makeDebt({
      id: "debt-a",
      name: "Santander",
      creditor: "Santander",
      settlementOptions: [
        makeOption({
          id: "installment-a",
          debtId: "debt-a",
          kind: "installment",
          installments: 2,
          totalAmountCents: 20_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 10_000,
          firstDueDate: "2026-07-10",
          status: "active",
        }),
      ],
    });
    const debtB = makeDebt({
      id: "debt-b",
      name: "Itaú",
      creditor: "Itaú",
      settlementOptions: [
        makeOption({
          id: "installment-b",
          debtId: "debt-b",
          kind: "installment",
          installments: 2,
          totalAmountCents: 30_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 15_000,
          firstDueDate: "2026-07-15",
          status: "accepted",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debtA, debtB],
      selectedOptionIds: ["installment-a"],
    });

    expect(result.monthlySchedule).toHaveLength(2);
    expect(result.monthlySchedule[0]).toMatchObject({
      periodMonth: "2026-07",
      totalAmountCents: 25_000,
    });
    expect(result.monthlySchedule[1]).toMatchObject({
      periodMonth: "2026-08",
      totalAmountCents: 25_000,
    });
    expect(result.totalOperationCents).toBe(50_000);
    expect(result.committedMonthsCount).toBe(2);
    expect(result.maxMonthlyInstallmentCents).toBe(25_000);
  });

  it("ignora conflito e mantém apenas uma opção por dívida", () => {
    const debt = makeDebt({
      settlementOptions: [
        makeOption({
          id: "cash-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 80_000,
          upfrontAmountCents: 80_000,
          status: "active",
        }),
        makeOption({
          id: "installment-1",
          debtId: "debt-1",
          kind: "installment",
          installments: 3,
          totalAmountCents: 90_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 30_000,
          firstDueDate: "2026-07-10",
          status: "active",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debt],
      selectedOptionIds: ["cash-1", "installment-1"],
    });

    expect(result.selectedItems).toHaveLength(1);
    expect(result.selectedItems[0]?.optionId).toBe("cash-1");
    expect(result.immediateOutflowCents).toBe(80_000);
    expect(result.totalOperationCents).toBe(80_000);
    expect(result.monthlySchedule).toHaveLength(0);
  });

  it("bloqueia nova seleção quando a dívida já tem opção aceita", () => {
    const debt = makeDebt({
      settlementOptions: [
        makeOption({
          id: "accepted-installment",
          debtId: "debt-1",
          kind: "installment",
          installments: 3,
          totalAmountCents: 90_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 30_000,
          firstDueDate: "2026-07-10",
          status: "accepted",
        }),
        makeOption({
          id: "active-installment",
          debtId: "debt-1",
          kind: "installment",
          installments: 2,
          totalAmountCents: 60_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 30_000,
          firstDueDate: "2026-07-10",
          status: "active",
        }),
      ],
    });

    const result = buildDebtSettlementSimulation({
      debts: [debt],
      selectedOptionIds: ["active-installment"],
    });

    expect(result.acceptedItems).toHaveLength(1);
    expect(result.selectedItems).toHaveLength(0);
    expect(result.totalOperationCents).toBe(90_000);
    expect(result.monthlySchedule).toHaveLength(3);
  });

  it("lista apenas credores com opções elegíveis no filtro", () => {
    const activeDebt = makeDebt({
      id: "debt-active",
      creditor: "Itaú",
      settlementOptions: [
        makeOption({
          id: "active-option",
          debtId: "debt-active",
          status: "active",
        }),
      ],
    });
    const acceptedDebt = makeDebt({
      id: "debt-accepted",
      creditor: "Santander",
      settlementOptions: [
        makeOption({
          id: "accepted-option",
          debtId: "debt-accepted",
          status: "accepted",
        }),
      ],
    });
    const expiredOnlyDebt = makeDebt({
      id: "debt-expired",
      creditor: "C&A",
      settlementOptions: [
        makeOption({
          id: "expired-option",
          debtId: "debt-expired",
          status: "expired",
        }),
      ],
    });
    const rejectedOnlyDebt = makeDebt({
      id: "debt-rejected",
      creditor: "Caedu",
      settlementOptions: [
        makeOption({
          id: "rejected-option",
          debtId: "debt-rejected",
          status: "rejected",
        }),
      ],
    });
    const noOptionDebt = makeDebt({
      id: "debt-empty",
      creditor: "Sem opção",
      settlementOptions: [],
    });

    expect(
      getDebtSettlementSimulationCreditors([
        activeDebt,
        acceptedDebt,
        expiredOnlyDebt,
        rejectedOnlyDebt,
        noOptionDebt,
      ])
    ).toEqual(["C&A", "Itaú", "Santander"]);
  });

  it("filtra as dívidas elegíveis por credor sem mudar a simulação base", () => {
    const acceptedDebt = makeDebt({
      id: "debt-accepted",
      creditor: "Santander",
      settlementOptions: [
        makeOption({
          id: "accepted-option",
          debtId: "debt-accepted",
          status: "accepted",
          totalAmountCents: 90_000,
        }),
      ],
    });
    const activeDebt = makeDebt({
      id: "debt-active",
      creditor: "Itaú",
      settlementOptions: [
        makeOption({
          id: "active-option",
          debtId: "debt-active",
          status: "active",
          totalAmountCents: 75_000,
        }),
      ],
    });
    const filtered = filterDebtSettlementSimulationDebts([acceptedDebt, activeDebt], ["Itaú"]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.creditor).toBe("Itaú");

    const result = buildDebtSettlementSimulation({
      debts: [acceptedDebt, activeDebt],
      selectedOptionIds: ["active-option"],
    });

    expect(result.acceptedItems).toHaveLength(1);
    expect(result.selectedItems).toHaveLength(1);
    expect(result.totalOperationCents).toBe(165_000);
  });
});
