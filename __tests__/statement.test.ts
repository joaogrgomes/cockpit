import { describe, expect, it } from "vitest";
import {
  buildStatementResult,
  buildStatementEntryUpdateValues,
  groupStatementItemsByDate,
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
      entryName: "Bebida - Missão Vida",
      entryCategory: null,
      entryExpenseType: null,
      monthlyExpenseName: "Alimentação",
      monthlyExpenseCategory: "alimentacao",
      monthlyExpenseType: "variavel",
      periodMonth: "2026-05",
      amount: 1400,
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
      description: "Bebida - Missão Vida",
      category: "alimentacao",
      categoryLabel: "Alimentação",
      signedAmount: -1400,
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
      entryName: "Bebida - Missão Vida",
      entryCategory: null,
      entryExpenseType: null,
      monthlyExpenseName: "Alimentação",
      monthlyExpenseCategory: "alimentacao",
      monthlyExpenseType: "variavel",
      periodMonth: "2026-05",
      amount: 1400,
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
      description: "Bebida - Missão Vida",
      category: "alimentacao",
      expenseType: "variavel",
      date: "2026-05-05",
      canEditDescription: true,
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

  it("permite editar descrição de gasto vinculado sem liberar categoria ou tipo", () => {
    const linkedExpense = buildStatementEntryUpdateValues(
      mapExpenseEntryRowToDetail({
        id: "expense-detail-1",
        monthlyExpenseId: "planned-expense-1",
        entryName: "Bebida - Missão Vida",
        entryCategory: null,
        entryExpenseType: null,
        monthlyExpenseName: "Alimentação",
        monthlyExpenseCategory: "alimentacao",
        monthlyExpenseType: "variavel",
        periodMonth: "2026-05",
        amount: 1400,
        paidAt: "2026-05-05",
        paymentMethod: "pix",
        notes: "Loja do bairro",
      }),
      {
        amount: 1500,
        date: "2026-05-06",
        paymentMethod: "cartao",
        notes: "Atualizado",
        description: "Bebida - Missão Vida atualizada",
        category: "lazer",
        expenseType: "fixo",
      }
    );

    expect(linkedExpense).toMatchObject({
      amount: 1500,
      date: "2026-05-06",
      periodMonth: "2026-05",
      paymentMethod: "cartao",
      notes: "Atualizado",
      description: "Bebida - Missão Vida atualizada",
    });
    expect(linkedExpense).not.toHaveProperty("category");
    expect(linkedExpense).not.toHaveProperty("expenseType");
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

describe("groupStatementItemsByDate", () => {
  it("calcula saldo do dia somando signedAmount", () => {
    const groups = groupStatementItemsByDate([
      mapIncomeEntryRowToStatementItem({
        id: "income-1",
        monthlyIncomeId: null,
        entryName: "Entrada 1",
        entryCategory: "outros",
        monthlyIncomeName: null,
        monthlyIncomeCategory: null,
        periodMonth: "2026-05",
        amount: 10000,
        receivedAt: "2026-05-28",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-28T12:00:00.000Z",
      }),
      mapExpenseEntryRowToStatementItem({
        id: "expense-1",
        monthlyExpenseId: null,
        entryName: "Gasto 1",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 5000,
        paidAt: "2026-05-28",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-28T10:00:00.000Z",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      date: "2026-05-28",
      dailyBalance: 5000,
    });
  });

  it("retorna saldo negativo quando só há gastos", () => {
    const groups = groupStatementItemsByDate([
      mapExpenseEntryRowToStatementItem({
        id: "expense-1",
        monthlyExpenseId: null,
        entryName: "Gasto 1",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 10000,
        paidAt: "2026-05-27",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-27T10:00:00.000Z",
      }),
      mapExpenseEntryRowToStatementItem({
        id: "expense-2",
        monthlyExpenseId: null,
        entryName: "Gasto 2",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 20000,
        paidAt: "2026-05-27",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-27T12:00:00.000Z",
      }),
      mapExpenseEntryRowToStatementItem({
        id: "expense-3",
        monthlyExpenseId: null,
        entryName: "Gasto 3",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 10000,
        paidAt: "2026-05-27",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-27T14:00:00.000Z",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].dailyBalance).toBe(-40000);
  });

  it("retorna saldo zero quando entradas e saídas se anulam", () => {
    const groups = groupStatementItemsByDate([
      mapIncomeEntryRowToStatementItem({
        id: "income-1",
        monthlyIncomeId: null,
        entryName: "Entrada 1",
        entryCategory: "outros",
        monthlyIncomeName: null,
        monthlyIncomeCategory: null,
        periodMonth: "2026-05",
        amount: 10000,
        receivedAt: "2026-05-26",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-26T08:00:00.000Z",
      }),
      mapExpenseEntryRowToStatementItem({
        id: "expense-1",
        monthlyExpenseId: null,
        entryName: "Gasto 1",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 10000,
        paidAt: "2026-05-26",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-26T09:00:00.000Z",
      }),
    ]);

    expect(groups[0].dailyBalance).toBe(0);
  });

  it("preserva ordenação por data", () => {
    const groups = groupStatementItemsByDate([
      mapIncomeEntryRowToStatementItem({
        id: "income-1",
        monthlyIncomeId: null,
        entryName: "Entrada 1",
        entryCategory: "outros",
        monthlyIncomeName: null,
        monthlyIncomeCategory: null,
        periodMonth: "2026-05",
        amount: 10000,
        receivedAt: "2026-05-27",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-27T08:00:00.000Z",
      }),
      mapExpenseEntryRowToStatementItem({
        id: "expense-1",
        monthlyExpenseId: null,
        entryName: "Gasto 1",
        entryCategory: "lazer",
        entryExpenseType: "variavel",
        monthlyExpenseName: null,
        monthlyExpenseCategory: null,
        monthlyExpenseType: null,
        periodMonth: "2026-05",
        amount: 5000,
        paidAt: "2026-05-28",
        paymentMethod: "pix",
        notes: null,
        createdAt: "2026-05-28T08:00:00.000Z",
      }),
    ]);

    expect(groups.map((group) => group.date)).toEqual(["2026-05-28", "2026-05-27"]);
  });

  it("usa signedAmount no cálculo do saldo diário", () => {
    const groups = groupStatementItemsByDate([
      {
        id: "custom-1",
        kind: "income",
        source: "one_time",
        date: "2026-05-25",
        periodMonth: "2026-05",
        description: "Entrada",
        category: "outros",
        categoryLabel: "Outros",
        amount: 999999,
        signedAmount: 100,
        paymentMethod: null,
        notes: null,
        originId: "custom-1",
        originType: "monthly_income_entry",
      },
      {
        id: "custom-2",
        kind: "expense",
        source: "one_time",
        date: "2026-05-25",
        periodMonth: "2026-05",
        description: "Gasto",
        category: "lazer",
        categoryLabel: "Lazer",
        amount: 1,
        signedAmount: -100,
        paymentMethod: null,
        notes: null,
        originId: "custom-2",
        originType: "monthly_expense_entry",
      },
    ]);

    expect(groups[0].dailyBalance).toBe(0);
  });
});
