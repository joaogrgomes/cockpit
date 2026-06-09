import { describe, expect, it } from "vitest";
import {
  buildStatementResult,
  buildStatementEntryUpdateValues,
  getStatementEntryHref,
  mapExpenseEntryRowToDetail,
  mapExpenseEntryRowToStatementItem,
  mapIncomeEntryRowToDetail,
  mapIncomeEntryRowToStatementItem,
} from "@/lib/statement";

describe("statement mapping", () => {
  it("gera href correto para detalhe de lançamento", () => {
    expect(getStatementEntryHref("monthly_income_entry", "income-1")).toBe(
      "/statement/monthly_income_entry/income-1"
    );
    expect(getStatementEntryHref("monthly_expense_entry", "expense-1")).toBe(
      "/statement/monthly_expense_entry/expense-1"
    );
  });

  it("usa nome/categoria da entrada planejada quando o lançamento é vinculado", () => {
    const item = mapIncomeEntryRowToStatementItem({
      id: "income-1",
      monthlyIncomeId: "planned-income-1",
      entryName: null,
      entryCategory: null,
      monthlyIncomeName: "Salário",
      monthlyIncomeCategory: "salario",
      periodMonth: "2026-05",
      amount: 500000,
      receivedAt: "2026-05-28",
      paymentMethod: "pix",
      notes: null,
      createdAt: "2026-05-28T10:00:00.000Z",
    });

    expect(item).toMatchObject({
      kind: "income",
      source: "linked",
      description: "Salário",
      category: "salario",
      categoryLabel: "Salário",
      signedAmount: 500000,
      originType: "monthly_income_entry",
    });
  });

  it("usa nome/categoria da entrada avulsa quando o lançamento é solto", () => {
    const item = mapIncomeEntryRowToStatementItem({
      id: "income-2",
      monthlyIncomeId: null,
      entryName: "Restituição IR",
      entryCategory: "reembolso",
      monthlyIncomeName: null,
      monthlyIncomeCategory: null,
      periodMonth: "2026-05",
      amount: 200000,
      receivedAt: "2026-05-28",
      paymentMethod: "pix",
      notes: "Recebido do governo",
      createdAt: "2026-05-28T12:00:00.000Z",
    });

    expect(item).toMatchObject({
      source: "one_time",
      description: "Restituição IR",
      category: "reembolso",
      categoryLabel: "Reembolso",
      signedAmount: 200000,
    });
  });

  it("usa nome/categoria do gasto planejado ou avulso conforme a origem", () => {
    const linked = mapExpenseEntryRowToStatementItem({
      id: "expense-1",
      monthlyExpenseId: "planned-expense-1",
      entryName: null,
      entryCategory: null,
      entryExpenseType: null,
      monthlyExpenseName: "Aluguel",
      monthlyExpenseCategory: "moradia",
      monthlyExpenseType: "fixo",
      periodMonth: "2026-05",
      amount: 120000,
      paidAt: "2026-05-05",
      paymentMethod: "pix",
      notes: null,
      createdAt: "2026-05-05T08:00:00.000Z",
    });

    const oneTime = mapExpenseEntryRowToStatementItem({
      id: "expense-2",
      monthlyExpenseId: null,
      entryName: "Viagem",
      entryCategory: "lazer",
      entryExpenseType: "variavel",
      monthlyExpenseName: null,
      monthlyExpenseCategory: null,
      monthlyExpenseType: null,
      periodMonth: "2026-05",
      amount: 350000,
      paidAt: "2026-05-10",
      paymentMethod: "cartao",
      notes: "Fim de semana prolongado",
      createdAt: "2026-05-10T18:00:00.000Z",
    });

    expect(linked).toMatchObject({
      kind: "expense",
      source: "linked",
      description: "Aluguel",
      category: "moradia",
      categoryLabel: "Moradia",
      signedAmount: -120000,
    });
    expect(oneTime).toMatchObject({
      kind: "expense",
      source: "one_time",
      description: "Viagem",
      category: "lazer",
      categoryLabel: "Lazer",
      signedAmount: -350000,
    });
  });

  it("resolve detalhe de entrada vinculada e avulsa com a fonte correta", () => {
    const linked = mapIncomeEntryRowToDetail({
      id: "income-detail-1",
      monthlyIncomeId: "planned-income-1",
      entryName: null,
      entryCategory: null,
      monthlyIncomeName: "Salário",
      monthlyIncomeCategory: "salario",
      periodMonth: "2026-05",
      amount: 500000,
      receivedAt: "2026-05-28",
      paymentMethod: "pix",
      notes: "Pagamento do mês",
    });

    const oneTime = mapIncomeEntryRowToDetail({
      id: "income-detail-2",
      monthlyIncomeId: null,
      entryName: "Restituição IR",
      entryCategory: "reembolso",
      monthlyIncomeName: null,
      monthlyIncomeCategory: null,
      periodMonth: "2026-05",
      amount: 200000,
      receivedAt: "2026-05-28",
      paymentMethod: "pix",
      notes: "Recebido do governo",
    });

    expect(linked).toMatchObject({
      source: "linked",
      description: "Salário",
      category: "salario",
      date: "2026-05-28",
      canEditDescription: false,
      canEditCategory: false,
    });
    expect(oneTime).toMatchObject({
      source: "one_time",
      description: "Restituição IR",
      category: "reembolso",
      date: "2026-05-28",
      canEditDescription: true,
      canEditCategory: true,
    });
  });

  it("resolve detalhe de gasto vinculada e avulsa com o tipo correto", () => {
    const linked = mapExpenseEntryRowToDetail({
      id: "expense-detail-1",
      monthlyExpenseId: "planned-expense-1",
      entryName: null,
      entryCategory: null,
      entryExpenseType: null,
      monthlyExpenseName: "Aluguel",
      monthlyExpenseCategory: "moradia",
      monthlyExpenseType: "fixo",
      periodMonth: "2026-05",
      amount: 120000,
      paidAt: "2026-05-05",
      paymentMethod: "pix",
      notes: null,
    });

    const oneTime = mapExpenseEntryRowToDetail({
      id: "expense-detail-2",
      monthlyExpenseId: null,
      entryName: "Viagem",
      entryCategory: "lazer",
      entryExpenseType: "variavel",
      monthlyExpenseName: null,
      monthlyExpenseCategory: null,
      monthlyExpenseType: null,
      periodMonth: "2026-05",
      amount: 350000,
      paidAt: "2026-05-10",
      paymentMethod: "cartao",
      notes: "Fim de semana prolongado",
    });

    expect(linked).toMatchObject({
      source: "linked",
      description: "Aluguel",
      category: "moradia",
      expenseType: "fixo",
      date: "2026-05-05",
      canEditDescription: false,
      canEditCategory: false,
      canEditExpenseType: false,
    });
    expect(oneTime).toMatchObject({
      source: "one_time",
      description: "Viagem",
      category: "lazer",
      expenseType: "variavel",
      date: "2026-05-10",
      canEditDescription: true,
      canEditCategory: true,
      canEditExpenseType: true,
    });
  });

  it("aplica campos editáveis corretos na atualização de lançamento", () => {
    const linkedIncome = buildStatementEntryUpdateValues(
      mapIncomeEntryRowToDetail({
        id: "income-detail-1",
        monthlyIncomeId: "planned-income-1",
        entryName: null,
        entryCategory: null,
        monthlyIncomeName: "Salário",
        monthlyIncomeCategory: "salario",
        periodMonth: "2026-05",
        amount: 500000,
        receivedAt: "2026-05-28",
        paymentMethod: "pix",
        notes: "Pagamento do mês",
      }),
      {
        amount: 510000,
        date: "2026-05-29",
        paymentMethod: "transferencia",
        notes: "Ajustado",
        description: "Não pode",
        category: "outros",
      }
    );

    const oneTimeExpense = buildStatementEntryUpdateValues(
      mapExpenseEntryRowToDetail({
        id: "expense-detail-2",
        monthlyExpenseId: null,
        entryName: "Viagem",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 350000,
        paidAt: "2026-05-10",
        paymentMethod: "cartao",
        notes: "Fim de semana prolongado",
      }),
      {
        amount: 360000,
        date: "2026-05-11",
        paymentMethod: "pix",
        notes: "Novo texto",
        description: "Viagem atualizada",
        category: "lazer",
        expenseType: "variavel",
      }
    );

    expect(linkedIncome).toMatchObject({
      amount: 510000,
      date: "2026-05-29",
      periodMonth: "2026-05",
      paymentMethod: "transferencia",
      notes: "Ajustado",
    });
    expect(linkedIncome).not.toHaveProperty("description");
    expect(linkedIncome).not.toHaveProperty("category");

    expect(oneTimeExpense).toMatchObject({
      amount: 360000,
      date: "2026-05-11",
      periodMonth: "2026-05",
      paymentMethod: "pix",
      notes: "Novo texto",
      description: "Viagem atualizada",
      category: "lazer",
      expenseType: "variavel",
    });
  });
});

describe("buildStatementResult", () => {
  const items = [
    mapIncomeEntryRowToStatementItem({
      id: "income-1",
      monthlyIncomeId: null,
      entryName: "Bônus",
      entryCategory: "outros",
      monthlyIncomeName: null,
      monthlyIncomeCategory: null,
      periodMonth: "2026-05",
      amount: 100000,
      receivedAt: "2026-05-28",
      paymentMethod: "pix",
      notes: "Pagamento extra",
      createdAt: "2026-05-28T12:00:00.000Z",
    }),
    mapExpenseEntryRowToStatementItem({
      id: "expense-1",
      monthlyExpenseId: null,
      entryName: "Mercado",
      entryCategory: "alimentacao",
      entryExpenseType: "variavel",
      monthlyExpenseName: null,
      monthlyExpenseCategory: null,
      monthlyExpenseType: null,
      periodMonth: "2026-05",
      amount: 25000,
      paidAt: "2026-05-28",
      paymentMethod: "cartao",
      notes: "Compra do mês",
      createdAt: "2026-05-28T18:00:00.000Z",
    }),
    mapIncomeEntryRowToStatementItem({
      id: "income-2",
      monthlyIncomeId: "planned-income-1",
      entryName: null,
      entryCategory: null,
      monthlyIncomeName: "Salário",
      monthlyIncomeCategory: "salario",
      periodMonth: "2026-05",
      amount: 500000,
      receivedAt: "2026-05-27",
      paymentMethod: "transferencia",
      notes: "Salário do mês",
      createdAt: "2026-05-27T09:00:00.000Z",
    }),
    mapExpenseEntryRowToStatementItem({
      id: "expense-2",
      monthlyExpenseId: "planned-expense-1",
      entryName: null,
      entryCategory: null,
      entryExpenseType: null,
      monthlyExpenseName: "Aluguel",
      monthlyExpenseCategory: "moradia",
      monthlyExpenseType: "fixo",
      periodMonth: "2026-05",
      amount: 120000,
      paidAt: "2026-05-27",
      paymentMethod: "pix",
      notes: "Conta mensal",
      createdAt: "2026-05-27T10:00:00.000Z",
    }),
  ];

  it("retorna entradas e gastos juntos em ordem decrescente", () => {
    const result = buildStatementResult({
      periodMonth: "2026-05",
      items,
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "expense-1",
      "income-1",
      "expense-2",
      "income-2",
    ]);
    expect(result.summary).toMatchObject({
      totalIncome: 600000,
      totalExpense: 145000,
      balance: 455000,
      count: 4,
    });
  });

  it("filtra por tipo", () => {
    const incomeOnly = buildStatementResult({
      periodMonth: "2026-05",
      items,
      type: "income",
    });

    const expenseOnly = buildStatementResult({
      periodMonth: "2026-05",
      items,
      type: "expense",
    });

    expect(incomeOnly.items.every((item) => item.kind === "income")).toBe(true);
    expect(expenseOnly.items.every((item) => item.kind === "expense")).toBe(true);
  });

  it("filtra por categoria e busca por texto", () => {
    const categoryFiltered = buildStatementResult({
      periodMonth: "2026-05",
      items,
      category: "moradia",
    });

    const queryFiltered = buildStatementResult({
      periodMonth: "2026-05",
      items,
      query: "salário",
    });

    expect(categoryFiltered.items.map((item) => item.category)).toEqual(["moradia"]);
    expect(queryFiltered.items.map((item) => item.description)).toEqual(["Salário"]);
  });
});
