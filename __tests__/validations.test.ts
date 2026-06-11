import { describe, expect, it } from "vitest";
import {
  CashFlowSettingsSchema,
  DebtAttachmentSchema,
  DebtProposalSchema,
  DebtSchema,
  DebtClearanceSchema,
  DebtValueUpdateSchema,
  DebtPaymentSchema,
  FutureExpensePayableSchema,
  FutureIncomeReceivableSchema,
  MarkFutureExpenseAsRealizedSchema,
  MarkFutureIncomeAsReceivedSchema,
  MonthlyClosingSchema,
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
      debtType: "payoff",
      status: "em_aberto",
      currentValue: 120000,
    });

    expect(result.success).toBe(true);
  });

  it("define payoff como tipo padrão quando debtType não é informado", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão Nubank",
      creditor: "Nubank",
      type: "cartao_credito",
      status: "em_aberto",
      currentValue: 120000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.debtType).toBe("payoff");
  });

  it("rejeita currentValue <= 0", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      debtType: "payoff",
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
      debtType: "payoff",
      status: "com_proposta",
      currentValue: 1000,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita debtType inválido", () => {
    const result = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      debtType: "invalido",
      status: "em_aberto",
      currentValue: 1000,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita paidInstallments maior que totalInstallments", () => {
    const result = DebtSchema.safeParse({
      name: "Financiamento",
      creditor: "Banco",
      type: "financiamento",
      debtType: "payoff",
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
      debtType: "payoff",
      status: "em_aberto",
      currentValue: 1000,
      perceivedRisk: "nao_sei",
    });

    const withNull = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      debtType: "payoff",
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

  it("aceita status de pós-pagamento", () => {
    const awaiting = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      debtType: "payoff",
      status: "aguardando_baixa",
      currentValue: 1000,
    });

    const archived = DebtSchema.safeParse({
      name: "Cartão",
      creditor: "Banco",
      type: "cartao_credito",
      debtType: "payoff",
      status: "arquivada",
      currentValue: 1000,
    });

    expect(awaiting.success).toBe(true);
    expect(archived.success).toBe(true);
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

describe("DebtPaymentSchema", () => {
  it("aceita pagamento válido", () => {
    const result = DebtPaymentSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      paidAt: "2026-06-09",
      paidAmount: 120000,
      paymentMethod: "pix",
      clearanceDueDate: "2026-06-16",
      paymentNotes: "Pago com desconto",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita clearanceDueDate menor que paidAt", () => {
    const result = DebtPaymentSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      paidAt: "2026-06-09",
      paidAmount: 120000,
      paymentMethod: "pix",
      clearanceDueDate: "2026-06-08",
    });

    expect(result.success).toBe(false);
  });
});

describe("DebtClearanceSchema", () => {
  it("aceita confirmação de baixa válida", () => {
    const result = DebtClearanceSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      clearedAt: "2026-06-09",
      paymentNotes: "Regularizado no Serasa",
    });

    expect(result.success).toBe(true);
  });
});

describe("DebtAttachmentSchema", () => {
  it("aceita anexo com tipo válido", () => {
    const result = DebtAttachmentSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      type: "payment_receipt",
      notes: "Comprovante do PIX",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita tipo de anexo inválido", () => {
    const result = DebtAttachmentSchema.safeParse({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
      type: "arquivo_invalido",
      notes: "Teste",
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
      startMonth: "2026-01",
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
      startMonth: "2026-01",
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
      startMonth: "2026-01",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("aceita categoria beleza_cuidados", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Salão",
      category: "beleza_cuidados",
      amount: 8500,
      expenseType: "variavel",
      startMonth: "2026-01",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("aceita dueDay e paymentMethod nulos", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Academia",
      category: "esportes",
      amount: 18000,
      expenseType: "fixo",
      startMonth: "2026-01",
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
      startMonth: "2026-01",
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
      startMonth: "2026-01",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("aceita endMonth igual a startMonth", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Aluguel",
      category: "moradia",
      amount: 250000,
      expenseType: "fixo",
      startMonth: "2026-05",
      endMonth: "2026-05",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita endMonth menor que startMonth", () => {
    const result = MonthlyExpenseSchema.safeParse({
      name: "Aluguel",
      category: "moradia",
      amount: 250000,
      expenseType: "fixo",
      startMonth: "2026-05",
      endMonth: "2026-04",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("MonthlyExpenseEntrySchema", () => {
  it("aceita lançamento vinculado válido", () => {
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

  it("aceita gasto avulso válido", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      name: "Aniversário da Poli",
      category: "familia",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      periodMonth: "2026-05",
      amount: 150000,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("aceita gasto avulso com categoria beleza_cuidados", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      name: "Corte de cabelo",
      category: "beleza_cuidados",
      expenseType: "variavel",
      occurrenceType: "unexpected",
      periodMonth: "2026-05",
      amount: 4500,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita gasto avulso sem name", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      category: "familia",
      expenseType: "variavel",
      periodMonth: "2026-05",
      amount: 150000,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita gasto avulso sem category", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      name: "Presente",
      expenseType: "variavel",
      periodMonth: "2026-05",
      amount: 10000,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita gasto avulso sem expenseType", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      name: "Presente",
      category: "familia",
      periodMonth: "2026-05",
      amount: 10000,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita gasto avulso sem occurrenceType", () => {
    const result = MonthlyExpenseEntrySchema.safeParse({
      monthlyExpenseId: null,
      name: "Presente",
      category: "familia",
      expenseType: "variavel",
      periodMonth: "2026-05",
      amount: 10000,
      paidAt: "2026-05-15",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });
});

describe("FutureExpensePayableSchema", () => {
  it("aceita gasto futuro válido", () => {
    const result = FutureExpensePayableSchema.safeParse({
      name: "Férias",
      category: "lazer",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      costAnalysisItemId: "550e8400-e29b-41d4-a716-446655440999",
      expectedAmount: 300000,
      expectedDate: "2026-08-10",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("usa planned_one_off como padrão no gasto futuro", () => {
    const result = FutureExpensePayableSchema.safeParse({
      name: "Férias",
      category: "lazer",
      expenseType: "variavel",
      expectedAmount: 300000,
      expectedDate: "2026-08-10",
      notes: null,
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data.occurrenceType : null).toBe("planned_one_off");
  });

  it("aceita costAnalysisItemId nulo ou ausente", () => {
    const withNull = FutureExpensePayableSchema.safeParse({
      name: "Férias",
      category: "lazer",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      costAnalysisItemId: null,
      expectedAmount: 300000,
      expectedDate: "2026-08-10",
      notes: null,
    });

    const withoutValue = FutureExpensePayableSchema.safeParse({
      name: "Férias",
      category: "lazer",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      expectedAmount: 300000,
      expectedDate: "2026-08-10",
      notes: null,
    });

    expect(withNull.success).toBe(true);
    expect(withoutValue.success).toBe(true);
  });

  it("aceita gasto futuro com categoria beleza_cuidados", () => {
    const result = FutureExpensePayableSchema.safeParse({
      name: "Salão mensal",
      category: "beleza_cuidados",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      expectedAmount: 12000,
      expectedDate: "2026-08-10",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita expectedAmount <= 0", () => {
    const result = FutureExpensePayableSchema.safeParse({
      name: "Férias",
      category: "lazer",
      expenseType: "variavel",
      expectedAmount: 0,
      expectedDate: "2026-08-10",
      notes: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("MarkFutureExpenseAsRealizedSchema", () => {
  it("aceita payload válido", () => {
    const result = MarkFutureExpenseAsRealizedSchema.safeParse({
      futureExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      realizedAmount: 280000,
      paidAt: "2026-05-12",
      paymentMethod: "pix",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita realizedAmount <= 0", () => {
    const result = MarkFutureExpenseAsRealizedSchema.safeParse({
      futureExpenseId: "550e8400-e29b-41d4-a716-446655440000",
      realizedAmount: 0,
      paidAt: "2026-08-12",
      paymentMethod: null,
      notes: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("MonthlyIncomeSchema", () => {
  it("aceita entrada planejada válida", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Salário CLT",
      category: "salario",
      amount: 650000,
      startMonth: "2026-01",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita amount <= 0", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Freela",
      category: "freela",
      amount: 0,
      startMonth: "2026-01",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Entrada X",
      category: "categoria_invalida",
      amount: 10000,
      startMonth: "2026-01",
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
      startMonth: "2026-01",
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
      startMonth: "2026-01",
      paymentMethod: null,
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("aceita endMonth igual a startMonth", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Salário CLT",
      category: "salario",
      amount: 650000,
      startMonth: "2026-05",
      endMonth: "2026-05",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita endMonth menor que startMonth", () => {
    const result = MonthlyIncomeSchema.safeParse({
      name: "Salário CLT",
      category: "salario",
      amount: 650000,
      startMonth: "2026-05",
      endMonth: "2026-04",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("MonthlyIncomeEntrySchema", () => {
  it("aceita entry vinculada válida", () => {
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

  it("aceita entry avulsa válida", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: null,
      name: "Restituição IR",
      category: "reembolso",
      periodMonth: "2026-05",
      amount: 80000,
      receivedAt: "2026-05-20",
      paymentMethod: "pix",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita entry avulsa sem name", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: null,
      category: "reembolso",
      periodMonth: "2026-05",
      amount: 80000,
      receivedAt: "2026-05-20",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita entry avulsa sem category", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: null,
      name: "Restituição IR",
      periodMonth: "2026-05",
      amount: 80000,
      receivedAt: "2026-05-20",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = MonthlyIncomeEntrySchema.safeParse({
      monthlyIncomeId: null,
      name: "Entrada X",
      category: "categoria_invalida",
      periodMonth: "2026-05",
      amount: 50000,
      receivedAt: "2026-05-20",
      paymentMethod: "pix",
    });

    expect(result.success).toBe(false);
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

describe("FutureIncomeReceivableSchema", () => {
  it("cria previsão válida", () => {
    const result = FutureIncomeReceivableSchema.safeParse({
      name: "PLR 2026",
      category: "beneficio",
      expectedAmount: 250000,
      expectedDate: "2026-09-15",
      status: "prevista",
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita valor zero", () => {
    const result = FutureIncomeReceivableSchema.safeParse({
      name: "PLR",
      category: "beneficio",
      expectedAmount: 0,
      expectedDate: "2026-09-15",
      status: "prevista",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = FutureIncomeReceivableSchema.safeParse({
      name: "Entrada X",
      category: "categoria_invalida",
      expectedAmount: 100000,
      expectedDate: "2026-09-15",
      status: "prevista",
    });

    expect(result.success).toBe(false);
  });

  it("aceita notes null", () => {
    const result = FutureIncomeReceivableSchema.safeParse({
      name: "Restituição",
      category: "reembolso",
      expectedAmount: 100000,
      expectedDate: "2026-07-01",
      status: "prevista",
      notes: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("MarkFutureIncomeAsReceivedSchema", () => {
  it("valida marcar como recebida", () => {
    const result = MarkFutureIncomeAsReceivedSchema.safeParse({
      futureIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      receivedAmount: 200000,
      receivedAt: "2026-05-20",
      paymentMethod: "pix",
      notes: "Valor final",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita receivedAmount zero", () => {
    const result = MarkFutureIncomeAsReceivedSchema.safeParse({
      futureIncomeId: "550e8400-e29b-41d4-a716-446655440000",
      receivedAmount: 0,
      receivedAt: "2026-09-20",
      paymentMethod: null,
      notes: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("MonthlyClosingSchema", () => {
  it("aceita periodMonth válido", () => {
    const result = MonthlyClosingSchema.safeParse({
      periodMonth: "2026-05",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita periodMonth inválido", () => {
    const result = MonthlyClosingSchema.safeParse({
      periodMonth: "2026/05",
    });

    expect(result.success).toBe(false);
  });
});
