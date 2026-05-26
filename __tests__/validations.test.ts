import { describe, expect, it } from "vitest";
import { DebtProposalSchema, DebtSchema, DebtValueUpdateSchema } from "@/lib/validations";

describe("DebtSchema", () => {
  it("aceita dívida com campos obrigatórios", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão Nubank",
      creditor: "Nubank",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 120000,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita currentValue <= 0", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      status: "com_proposta",
      currentValue: 1000,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita paidInstallments maior que totalInstallments", () => {
    const result = DebtSchema.safeParse({
      name: "Financiamento",
      creditor: "Banco",
      type: "financiamento",
      status: "parcelada",
      currentValue: 50000,
      totalInstallments: 10,
      paidInstallments: 11,
    });

    expect(result.success).toBe(false);
  });
});

describe("DebtProposalSchema", () => {
  it("aceita proposta válida", () => {
    const result = DebtProposalSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      proposedValue: 90000,
      proposedAt: "2026-05-25",
      expiresAt: "2026-06-01",
      status: "ativa",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita proposedValue <= 0", () => {
    const result = DebtProposalSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      proposedValue: 0,
      proposedAt: "2026-05-25",
      status: "ativa",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita expiresAt anterior a proposedAt", () => {
    const result = DebtProposalSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      proposedValue: 1000,
      proposedAt: "2026-05-25",
      expiresAt: "2026-05-20",
      status: "ativa",
    });

    expect(result.success).toBe(false);
  });
});

describe("DebtValueUpdateSchema", () => {
  it("aceita atualização válida", () => {
    const result = DebtValueUpdateSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      recordedValue: 12345,
      recordedAt: "2026-05-25",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita recordedValue <= 0", () => {
    const result = DebtValueUpdateSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      recordedValue: 0,
      recordedAt: "2026-05-25",
    });

    expect(result.success).toBe(false);
  });
});
