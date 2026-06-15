import { describe, expect, it } from "vitest";
import {
  calculateDebtSelectionSummary,
  filterDebtSelectionItems,
  getSelectableDebtCreditors,
  selectLatestPayoffProposal,
  toggleCreditorFilterMode,
} from "@/lib/debt-selection";
import type { DebtSelectionItem } from "@/lib/debt-selection";
import type { DebtProposal } from "@/types";

function makeDebt(overrides: Partial<DebtSelectionItem> = {}): DebtSelectionItem {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Dívida",
    creditor: overrides.creditor ?? "Credor",
    type: overrides.type ?? "cartao_credito",
    debtType: overrides.debtType ?? "payoff",
    status: overrides.status ?? "em_aberto",
    currentValue: overrides.currentValue ?? 100_000,
    originalValue: overrides.originalValue ?? 120_000,
    monthlyPayment: overrides.monthlyPayment ?? 10_000,
    dueDay: overrides.dueDay ?? 10,
    dueDate: overrides.dueDate ?? null,
    totalInstallments: overrides.totalInstallments ?? null,
    paidInstallments: overrides.paidInstallments ?? null,
    overdueSince: overrides.overdueSince ?? null,
    paidAt: overrides.paidAt ?? null,
    paidAmount: overrides.paidAmount ?? null,
    paymentMethod: overrides.paymentMethod ?? null,
    clearanceDueDate: overrides.clearanceDueDate ?? null,
    clearedAt: overrides.clearedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    paymentNotes: overrides.paymentNotes ?? null,
    priority: overrides.priority ?? null,
    perceivedRisk: overrides.perceivedRisk ?? null,
    notes: overrides.notes ?? null,
    tags: overrides.tags ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-06-10T12:00:00.000Z"),
    lastUpdatedAt: overrides.lastUpdatedAt ?? new Date("2026-06-10T12:00:00.000Z"),
    latestPayoffProposal: overrides.latestPayoffProposal ?? null,
    hasPayoffProposal: overrides.hasPayoffProposal ?? Boolean(overrides.latestPayoffProposal),
  };
}

function makeProposal(overrides: Partial<DebtProposal> = {}): DebtProposal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    debtId: overrides.debtId ?? "debt-id",
    proposedValue: overrides.proposedValue ?? 80_000,
    proposedAt: overrides.proposedAt ?? "2026-06-01",
    expiresAt: overrides.expiresAt ?? "2026-06-10",
    origin: overrides.origin ?? null,
    status: overrides.status ?? "ativa",
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-06-01T10:00:00.000Z"),
  };
}

describe("debt selection helpers", () => {
  it("filtra por nome e credor", () => {
    const debts = [
      makeDebt({ name: "Cartão Itaú", creditor: "Itaú" }),
      makeDebt({ name: "Empréstimo Santander", creditor: "Santander" }),
      makeDebt({ name: "BB Financiamento", creditor: "Banco do Brasil" }),
    ];

    const result = filterDebtSelectionItems(debts, {
      searchText: "santander",
      includedCreditors: [],
      excludedCreditors: [],
      debtTypes: [],
      statuses: [],
      proposalAvailability: "all",
      sort: "current_desc",
    });

    expect(result.map((debt) => debt.name)).toEqual(["Empréstimo Santander"]);
  });

  it("inclui múltiplos credores", () => {
    const debts = [
      makeDebt({ name: "Cartão Itaú", creditor: "Itaú" }),
      makeDebt({ name: "Empréstimo Santander", creditor: "Santander" }),
      makeDebt({ name: "BB Financiamento", creditor: "Banco do Brasil" }),
    ];

    const result = filterDebtSelectionItems(debts, {
      searchText: "",
      includedCreditors: ["Itaú", "Santander"],
      excludedCreditors: [],
      debtTypes: [],
      statuses: [],
      proposalAvailability: "all",
      sort: "current_desc",
    });

    expect(result.map((debt) => debt.creditor)).toEqual(["Itaú", "Santander"]);
  });

  it("liga e desliga credor por pílula", () => {
    const initial = {
      includedCreditors: [],
      excludedCreditors: [],
    };

    const includeFirst = toggleCreditorFilterMode(initial, "Itaú", "include");
    expect(includeFirst.includedCreditors).toEqual(["Itaú"]);
    expect(includeFirst.excludedCreditors).toEqual([]);

    const includeSecond = toggleCreditorFilterMode(includeFirst, "Itaú", "include");
    expect(includeSecond.includedCreditors).toEqual([]);
    expect(includeSecond.excludedCreditors).toEqual([]);
  });

  it("filtra por tipo, status e presença de proposta", () => {
    const debts = [
      makeDebt({
        name: "Cartão Itaú",
        creditor: "Itaú",
        debtType: "payoff",
        status: "em_aberto",
        latestPayoffProposal: {
          ...makeProposal({ debtId: "1" }),
          isCurrent: true,
          isExpired: false,
        },
        hasPayoffProposal: true,
      }),
      makeDebt({
        name: "Estrutural Banco",
        creditor: "Banco",
        debtType: "structural",
        status: "arquivada",
        latestPayoffProposal: null,
        hasPayoffProposal: false,
      }),
    ];

    const result = filterDebtSelectionItems(debts, {
      searchText: "",
      includedCreditors: [],
      excludedCreditors: [],
      debtTypes: ["payoff"],
      statuses: ["em_aberto"],
      proposalAvailability: "with",
      sort: "current_desc",
    });

    expect(result.map((debt) => debt.name)).toEqual(["Cartão Itaú"]);
  });

  it("sinaliza a proposta mais recente com preferência para a ativa e válida", () => {
    const proposalOlderCurrent = makeProposal({
      id: "proposal-current",
      proposedValue: 75_000,
      proposedAt: "2026-05-20",
      expiresAt: "2026-06-30",
      status: "ativa",
      createdAt: new Date("2026-05-20T10:00:00.000Z"),
    });
    const proposalNewerExpired = makeProposal({
      id: "proposal-expired",
      proposedValue: 65_000,
      proposedAt: "2026-06-10",
      expiresAt: "2026-06-12",
      status: "expirada",
      createdAt: new Date("2026-06-10T10:00:00.000Z"),
    });

    const selected = selectLatestPayoffProposal([proposalNewerExpired, proposalOlderCurrent]);

    expect(selected?.id).toBe("proposal-current");
    expect(selected?.proposedValue).toBe(75_000);
    expect(selected?.isCurrent).toBe(true);
    expect(selected?.isExpired).toBe(false);
  });

  it("resume a seleção com propostas vencidas e dívidas sem proposta", () => {
    const debts = [
      makeDebt({
        id: "1",
        name: "Cartão Itaú",
        creditor: "Itaú",
        currentValue: 100_000,
        latestPayoffProposal: {
          ...makeProposal({
            debtId: "1",
            proposedValue: 70_000,
            expiresAt: "2026-06-10",
            status: "expirada",
          }),
          isCurrent: false,
          isExpired: true,
        },
        hasPayoffProposal: true,
      }),
      makeDebt({
        id: "2",
        name: "Santander",
        creditor: "Santander",
        currentValue: 50_000,
        latestPayoffProposal: {
          ...makeProposal({
            debtId: "2",
            proposedValue: 45_000,
            expiresAt: "2026-06-30",
            status: "ativa",
          }),
          isCurrent: true,
          isExpired: false,
        },
        hasPayoffProposal: true,
      }),
      makeDebt({
        id: "3",
        name: "Banco do Brasil",
        creditor: "Banco do Brasil",
        currentValue: 20_000,
        latestPayoffProposal: null,
        hasPayoffProposal: false,
      }),
    ];

    const summary = calculateDebtSelectionSummary(debts);

    expect(summary.filteredCount).toBe(3);
    expect(summary.totalCurrentValueCents).toBe(170_000);
    expect(summary.totalProposalValueCents).toBe(115_000);
    expect(summary.estimatedSavingsCents).toBe(35_000);
    expect(summary.debtsWithoutProposalCount).toBe(1);
    expect(summary.debtsWithoutProposal[0]?.name).toBe("Banco do Brasil");
    expect(summary.expiredProposalCount).toBe(1);
  });

  it("não soma dívidas sem proposta no total de quitação", () => {
    const debts = [
      makeDebt({
        id: "1",
        name: "Com proposta",
        creditor: "Credor 1",
        currentValue: 100_000,
        latestPayoffProposal: {
          ...makeProposal({ debtId: "1", proposedValue: 80_000 }),
          isCurrent: true,
          isExpired: false,
        },
        hasPayoffProposal: true,
      }),
      makeDebt({
        id: "2",
        name: "Sem proposta",
        creditor: "Credor 2",
        currentValue: 200_000,
        latestPayoffProposal: null,
        hasPayoffProposal: false,
      }),
    ];

    const summary = calculateDebtSelectionSummary(debts);

    expect(summary.totalProposalValueCents).toBe(80_000);
    expect(summary.debtsWithoutProposalCount).toBe(1);
    expect(summary.debtsWithoutProposal[0]?.name).toBe("Sem proposta");
  });

  it("recalcula o resumo quando o filtro de credor muda", () => {
    const debts = [
      makeDebt({
        name: "Cartão Itaú",
        creditor: "Itaú",
        currentValue: 100_000,
        latestPayoffProposal: {
          ...makeProposal({ debtId: "1", proposedValue: 80_000 }),
          isCurrent: true,
          isExpired: false,
        },
        hasPayoffProposal: true,
      }),
      makeDebt({
        name: "Santander",
        creditor: "Santander",
        currentValue: 50_000,
        latestPayoffProposal: {
          ...makeProposal({ debtId: "2", proposedValue: 40_000 }),
          isCurrent: true,
          isExpired: false,
        },
        hasPayoffProposal: true,
      }),
    ];

    const filtered = filterDebtSelectionItems(debts, {
      searchText: "",
      includedCreditors: ["Itaú"],
      excludedCreditors: [],
      debtTypes: [],
      statuses: [],
      proposalAvailability: "all",
      sort: "current_desc",
    });

    const summary = calculateDebtSelectionSummary(filtered);

    expect(summary.filteredCount).toBe(1);
    expect(summary.totalProposalValueCents).toBe(80_000);
  });

  it("limpar filtros remove credores ativos via estado vazio", () => {
    const debts = [
      makeDebt({ name: "Cartão Itaú", creditor: "Itaú" }),
      makeDebt({ name: "Santander", creditor: "Santander" }),
    ];

    const filtered = filterDebtSelectionItems(debts, {
      searchText: "",
      includedCreditors: [],
      excludedCreditors: [],
      debtTypes: [],
      statuses: [],
      proposalAvailability: "all",
      sort: "current_desc",
    });

    expect(filtered.map((debt) => debt.creditor)).toEqual(["Itaú", "Santander"]);
  });

  it("mostra apenas credores com ao menos uma dívida não arquivada", () => {
    const debts = [
      makeDebt({ creditor: "C&A", status: "arquivada" }),
      makeDebt({ creditor: "Caedu", status: "arquivada" }),
      makeDebt({ creditor: "Itaú", status: "em_aberto" }),
      makeDebt({ creditor: "Santander", status: "arquivada" }),
      makeDebt({ creditor: "Santander", status: "em_negociacao" }),
    ];

    expect(getSelectableDebtCreditors(debts)).toEqual(["Itaú", "Santander"]);
  });
});
