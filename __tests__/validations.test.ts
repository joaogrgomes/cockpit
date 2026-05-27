import { describe, expect, it } from "vitest";
import {
  CashFlowSettingsSchema,
  DebtProposalSchema,
  DebtSchema,
  DebtValueUpdateSchema,
  MonthlyIncomeEntrySchema,
  MonthlyIncomeSchema,
  MonthlyExpenseEntrySchema,
  MonthlyExpenseSchema,
} from "@/lib/validations";

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

  it("aceita perceivedRisk=nao_sei e null", () => {
    const withNaoSei = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 1000,
      perceivedRisk: "nao_sei",
    });

    const withNull = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 1000,
      perceivedRisk: null,
    });

    expect(withNaoSei.success).toBe(true);
    expect(withNull.success).toBe(true);
  });

  it("rejeita perceivedRisk inválido", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 1000,
      perceivedRisk: "invalido",
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

  it("rejeita recordedAt no futuro", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    const result = DebtValueUpdateSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      recordedValue: 12345,
      recordedAt: tomorrowIso,
    });

    expect(result.success).toBe(false);
  });
});

describe("MonthlyExpenseSchema", () => {
  it("aceita gasto válido com campos obrigatórios", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Aluguel",
      category: "moradia",
      amount: 250000,
      expenseType: "fixo",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita amount <= 0", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Luz",
      category: "servicos",
      amount: 0,
      expenseType: "variavel",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Teste",
      category: "categoria_invalida",
      amount: 1000,
      expenseType: "fixo",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("aceita dueDay e paymentMethod nulos", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Academia",
      category: "esportes",
      amount: 18000,
      expenseType: "fixo",
      dueDay: null,
      paymentMethod: null,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("aceita limpar campos opcionais com null em update", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Internet",
      category: "servicos",
      amount: 12000,
      expenseType: "fixo",
      dueDay: null,
      paymentMethod: null,
      dueLabel: null,
      notes: null,
      isActive: false,
    });

    expect(result.success).toBe(true);
  });

  it("aceita categoria esportes", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Jiu-jitsu",
      category: "esportes",
      amount: 22000,
      expenseType: "fixo",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("MonthlyExpenseEntrySchema", () => {
  it("aceita lançamento válido", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 12000,
      paidAt: "2026-05-20",
      paymentMethod: "pix",
      notes: "Pagamento integral",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita amount <= 0", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 0,
      paidAt: "2026-05-20",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita periodMonth inválido", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026/05",
      amount: 1000,
      paidAt: "2026-05-20",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("aceita paymentMethod null", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 5000,
      paidAt: "2026-05-20",
      paymentMethod: null,
      notes: "Sem método definido",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita paymentMethod inválido", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 5000,
      paidAt: "2026-05-20",
      paymentMethod: "credito_auto",
    });

    expect(result.success).toBe(false);
  });

  it("aceita notes null", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 5000,
      paidAt: "2026-05-20",
      paymentMethod: "boleto",
      notes: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("MonthlyIncomeSchema", () => {
  it("aceita entrada planejada válida", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Salário CLT",
      category: "salario",
      amount: 650000,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita amount <= 0", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Freela",
      category: "freela",
      amount: 0,
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Entrada X",
      category: "categoria_invalida",
      amount: 10000,
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("aceita expectedDay null", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Rendimento",
      category: "rendimento",
      amount: 30000,
      expectedDay: null,
      paymentMethod: null,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("aceita paymentMethod null", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Reembolso",
      category: "reembolso",
      amount: 10000,
      paymentMethod: null,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("MonthlyIncomeEntrySchema", () => {
  it("aceita entry válida", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 120000,
      receivedAt: "2026-05-10",
      paymentMethod: "pix",
      notes: "Recebimento parcial",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita periodMonth inválido", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026/05",
      amount: 120000,
      receivedAt: "2026-05-10",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita amount <= 0", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 0,
      receivedAt: "2026-05-10",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita paymentMethod inválido", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 120000,
      receivedAt: "2026-05-10",
      paymentMethod: "boleto",
    });

    expect(result.success).toBe(false);
  });

  it("aceita notes null", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 120000,
      receivedAt: "2026-05-10",
      paymentMethod: "transferencia",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("aceita paymentMethod null", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 120000,
      receivedAt: "2026-05-10",
      paymentMethod: null,
      notes: "Sem método definido",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita receivedAt no futuro", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      periodMonth: "2026-05",
      amount: 120000,
      receivedAt: tomorrowIso,
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });
});

describe("CashFlowSettingsSchema", () => {
  it("aceita saldo inicial positivo", () => {
    const result = CashFlowSettingsSchema.safeParse({
      startMonth: "2026-05",
      initialBalance: 100000,
    });

    expect(result.success).toBe(true);
  });

  it("aceita saldo inicial zero", () => {
    const result = CashFlowSettingsSchema.safeParse({
      startMonth: "2026-05",
      initialBalance: 0,
    });

    expect(result.success).toBe(true);
  });

  it("aceita saldo inicial negativo", () => {
    const result = CashFlowSettingsSchema.safeParse({
      startMonth: "2026-05",
      initialBalance: -250000,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita startMonth inválido", () => {
    const result = CashFlowSettingsSchema.safeParse({
      startMonth: "2026/05",
      initialBalance: 0,
    });

    expect(result.success).toBe(false);
  });
});
