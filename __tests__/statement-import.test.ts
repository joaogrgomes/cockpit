import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyIncomeEntries,
  statementCategorizationRules,
  statementImportBatches,
  statementImportRows,
} from "@/lib/db/schema";
import {
  getAutoSelectedStatementImportMonthlyPlanId,
  buildStatementImportRowHash,
  dedupeImportedStatementItems,
  normalizeImportedDescription,
  parseBrazilianMoneyToCents,
  parseInterCsvStatement,
  type ImportedStatementItem,
  type StatementImportReviewedRow,
} from "@/lib/statement-import";
import { normalizeStatementCategorizationPattern } from "@/lib/statement-categorization-rules";
import {
  commitStatementImportBatch,
  createStatementImportBatchWithRows,
  getStatementImportRowsByBatchId,
} from "@/lib/services/statement-import.service";
import { upsertStatementCategorizationRuleFromReview } from "@/lib/services/statement-categorization-rules.service";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

const mockedGetDb = vi.mocked(getDb);

function makeSelectQuery(resultRows: unknown[]) {
  const query: {
    where: () => unknown;
    orderBy: () => unknown;
    limit: (count: number) => Promise<unknown[]>;
    innerJoin: () => unknown;
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ) => Promise<TResult1 | TResult2>;
  } = {
    where: () => query,
    orderBy: () => query,
    limit: (count: number) => Promise.resolve(resultRows.slice(0, count)),
    innerJoin: () => query,
    then: (onfulfilled, onrejected) => Promise.resolve(resultRows).then(onfulfilled, onrejected),
  };

  return query;
}

function createDbMock(selectResults: unknown[][]) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  let selectIndex = 0;
  let expenseEntryCounter = 0;
  let incomeEntryCounter = 0;
  let categorizationRuleCounter = 0;

  const mockDb: any = {
    select: () => ({
      from: () => makeSelectQuery(selectResults[selectIndex++] ?? []),
    }),
    insert: (table: unknown) => ({
      values(values: unknown) {
        inserts.push({ table, values });
        return this;
      },
      returning() {
        if (table === statementImportBatches) {
          return Promise.resolve([{ id: "batch-1" }]);
        }

        if (table === monthlyExpenseEntries) {
          expenseEntryCounter += 1;
          return Promise.resolve([{ id: `expense-entry-${expenseEntryCounter}` }]);
        }

        if (table === monthlyIncomeEntries) {
          incomeEntryCounter += 1;
          return Promise.resolve([{ id: `income-entry-${incomeEntryCounter}` }]);
        }

        if (table === statementCategorizationRules) {
          categorizationRuleCounter += 1;
          return Promise.resolve([{ id: `categorization-rule-${categorizationRuleCounter}` }]);
        }

        return Promise.resolve([{ id: `inserted-${inserts.length}` }]);
      },
    }),
    update: (table: unknown) => ({
      set(values: unknown) {
        updates.push({ table, values });
        const result = {
          returning: () => Promise.resolve([]),
          then: (onfulfilled: any, onrejected: any) =>
            Promise.resolve([]).then(onfulfilled, onrejected),
        };
        return {
          where: () => result,
        };
      },
    }),
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback(mockDb),
    inserts,
    updates,
  };

  return mockDb;
}

describe("statement import parser", () => {
  it("ignora cabeçalho informativo e lê a tabela do CSV do Inter", () => {
    const csv = [
      "Extrato Conta Corrente",
      "Conta ;7104340",
      "Período ;13/06/2026 a 14/06/2026",
      "Saldo ;9.395,21",
      "Data Lançamento;Histórico;Descrição;Valor;Saldo",
      "14/06/2026;Compra no débito;Padaria Central;-36,04;9.395,21",
      "14/06/2026;Pix recebido ;Depraxe;4.000,00;9.431,25",
    ].join("\n");

    const items = parseInterCsvStatement(csv);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      source: "inter_csv",
      transactionDate: "2026-06-14",
      rawHistory: "Compra no débito",
      rawDescription: "Padaria Central",
      description: "Padaria Central",
      amountCents: 3604,
      balanceAfterCents: 939521,
      direction: "expense",
    });
    expect(items[1]).toMatchObject({
      direction: "income",
      amountCents: 400000,
    });
  });

  it("normaliza espaços e converte valores brasileiros", () => {
    expect(normalizeImportedDescription("  Pix   enviado   ")).toBe("Pix enviado");
    expect(parseBrazilianMoneyToCents("1.234,56")).toBe(123456);
    expect(parseBrazilianMoneyToCents("-36,04")).toBe(-3604);
  });

  it("gera hash estável e distinto quando o saldo pós-transação muda", () => {
    const base = {
      source: "inter_csv" as const,
      transactionDate: "2026-06-14",
      rawHistory: "Compra no débito",
      rawDescription: "Padaria Central",
      amountCents: 3604,
      balanceAfterCents: 939521,
      direction: "expense" as const,
    };

    const hash1 = buildStatementImportRowHash(base);
    const hash2 = buildStatementImportRowHash(base);
    const hash3 = buildStatementImportRowHash({ ...base, balanceAfterCents: 943125 });

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("deduplica por hash existente e por hash repetido no mesmo arquivo", () => {
    const items: ImportedStatementItem[] = [
      {
        source: "inter_csv",
        rowIndex: 1,
        externalId: null,
        transactionDate: "2026-06-14",
        rawHistory: "Compra no débito",
        rawDescription: "Padaria Central",
        description: "Padaria Central",
        amountCents: 3604,
        balanceAfterCents: 939521,
        direction: "expense",
        rowHash: "hash-1",
      },
      {
        source: "inter_csv",
        rowIndex: 2,
        externalId: null,
        transactionDate: "2026-06-14",
        rawHistory: "Compra no débito",
        rawDescription: "Padaria Central",
        description: "Padaria Central",
        amountCents: 3604,
        balanceAfterCents: 939521,
        direction: "expense",
        rowHash: "hash-1",
      },
      {
        source: "inter_csv",
        rowIndex: 3,
        externalId: null,
        transactionDate: "2026-06-14",
        rawHistory: "Pix recebido",
        rawDescription: "Depraxe",
        description: "Depraxe",
        amountCents: 400000,
        balanceAfterCents: 943125,
        direction: "income",
        rowHash: "hash-2",
      },
    ];

    const { insertedItems, duplicateItems } = dedupeImportedStatementItems(
      items,
      new Set(["hash-2"])
    );

    expect(insertedItems).toHaveLength(1);
    expect(insertedItems[0].rowHash).toBe("hash-1");
    expect(duplicateItems).toHaveLength(2);
  });
});

describe("statement categorization rules", () => {
  it("normaliza descrição de forma estável", () => {
    expect(normalizeStatementCategorizationPattern("  PÁDARIA   CENTRAL  ")).toBe("padaria central");
  });

  it("aplica sugestão ao carregar o lote quando existe regra compatível", async () => {
    const mockDb = createDbMock([
      [
        {
          id: "row-1",
          batchId: "batch-1",
          source: "inter_csv",
          rowIndex: 1,
          rowHash: "hash-1",
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Compra no débito",
          rawDescription: "Padaria Central",
          description: "Padaria Central",
          amountCents: 3604,
          balanceAfterCents: 939521,
          direction: "expense",
          status: "pending",
          createdEntryType: null,
          createdEntryId: null,
          createdAt: new Date("2026-06-14T10:00:00Z"),
          updatedAt: new Date("2026-06-14T10:00:00Z"),
        },
      ],
      [
        {
          id: "rule-1",
          pattern: "Padaria Central",
          normalizedPattern: "padaria central",
          matchType: "exact",
          direction: "expense",
          category: "alimentacao",
          expenseType: "variavel",
          occurrenceType: "planned_one_off",
          monthlyExpenseId: null,
          monthlyIncomeId: null,
          usageCount: 3,
          lastUsedAt: new Date("2026-06-10T10:00:00Z"),
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const rows = await getStatementImportRowsByBatchId("batch-1");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      isSuggested: true,
      suggestedRuleId: "rule-1",
      suggestedCategory: "alimentacao",
      suggestedExpenseType: "variavel",
      suggestedOccurrenceType: "planned_one_off",
      suggestedMonthlyExpenseId: null,
      suggestedMonthlyIncomeId: null,
    });
  });

  it("mantém linha sem sugestão quando não há regra compatível", async () => {
    const mockDb = createDbMock([
      [
        {
          id: "row-1",
          batchId: "batch-1",
          source: "inter_csv",
          rowIndex: 1,
          rowHash: "hash-1",
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Compra no débito",
          rawDescription: "Padaria Central",
          description: "Padaria Central",
          amountCents: 3604,
          balanceAfterCents: 939521,
          direction: "expense",
          status: "pending",
          createdEntryType: null,
          createdEntryId: null,
          createdAt: new Date("2026-06-14T10:00:00Z"),
          updatedAt: new Date("2026-06-14T10:00:00Z"),
        },
      ],
      [],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const rows = await getStatementImportRowsByBatchId("batch-1");

    expect(rows[0]).toMatchObject({
      isSuggested: false,
      suggestedRuleId: null,
      suggestedCategory: null,
      suggestedExpenseType: null,
      suggestedOccurrenceType: null,
      suggestedMonthlyExpenseId: null,
      suggestedMonthlyIncomeId: null,
    });
  });

  it("auto-seleciona o planejamento quando há exatamente uma opção compatível", () => {
    const plans = [
      {
        id: "expense-1",
        isActive: true,
        category: "alimentacao",
        startMonth: "2026-01",
        endMonth: "2026-12",
      },
    ];

    expect(
      getAutoSelectedStatementImportMonthlyPlanId("2026-06", "alimentacao", plans, null)
    ).toBe("expense-1");
  });

  it("não auto-seleciona o planejamento quando há múltiplas opções compatíveis", () => {
    const plans = [
      {
        id: "expense-1",
        isActive: true,
        category: "alimentacao",
        startMonth: "2026-01",
        endMonth: "2026-12",
      },
      {
        id: "expense-2",
        isActive: true,
        category: "alimentacao",
        startMonth: "2026-01",
        endMonth: "2026-12",
      },
    ];

    expect(
      getAutoSelectedStatementImportMonthlyPlanId("2026-06", "alimentacao", plans, null)
    ).toBeNull();
  });
});

describe("statement import service", () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
  });

  it("cria lote e staging sem duplicar hashes existentes", async () => {
    const mockDb = createDbMock([
      [{ rowHash: "hash-1" }],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createStatementImportBatchWithRows(
      {
        source: "inter_csv",
        originalFilename: "extrato.csv",
      },
      [
        {
          source: "inter_csv",
          rowIndex: 1,
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Compra no débito",
          rawDescription: "Padaria Central",
          description: "Padaria Central",
          amountCents: 3604,
          balanceAfterCents: 939521,
          direction: "expense",
          rowHash: "hash-1",
        },
        {
          source: "inter_csv",
          rowIndex: 2,
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Pix recebido",
          rawDescription: "Depraxe",
          description: "Depraxe",
          amountCents: 400000,
          balanceAfterCents: 943125,
          direction: "income",
          rowHash: "hash-2",
        },
      ]
    );

    expect(result).toMatchObject({
      kind: "created_batch",
      batchId: "batch-1",
      insertedCount: 1,
      duplicateCount: 1,
    });

    const batchInsert = mockDb.inserts.find((item: any) => item.table === statementImportBatches);
    const stagingInsert = mockDb.inserts.find((item: any) => item.table === statementImportRows);

    expect(batchInsert).toBeTruthy();
    expect(stagingInsert).toBeTruthy();
    expect(Array.isArray(stagingInsert.values)).toBe(true);
    expect(stagingInsert.values).toHaveLength(1);
    expect(stagingInsert.values[0]).toMatchObject({
      rowIndex: 2,
      rowHash: "hash-2",
      status: "pending",
      amountCents: 400000,
    });
  });

  it("cria regra de categorização ao confirmar linha importada", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-1",
          status: "pending",
          direction: "expense",
          transactionDate: "2026-06-14",
          amountCents: 3604,
        },
      ],
      [],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-1",
        decision: "import",
        description: "Padaria Central",
        category: "alimentacao",
        mode: "one_time",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: "variavel",
        occurrenceType: "planned_one_off",
      },
    ]);

    expect(result).toMatchObject({
      committedCount: 1,
      ignoredCount: 0,
      batchStatus: "committed",
    });

    const ruleInsert = mockDb.inserts.find((item: any) => item.table === statementCategorizationRules);
    expect(ruleInsert).toBeTruthy();
    expect(ruleInsert.values).toMatchObject({
      pattern: "Padaria Central",
      normalizedPattern: "padaria central",
      matchType: "exact",
      direction: "expense",
      category: "alimentacao",
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
      monthlyExpenseId: null,
      monthlyIncomeId: null,
      usageCount: 1,
    });
  });

  it("não cria regra para linha ignorada", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-1",
          status: "pending",
          direction: "income",
          transactionDate: "2026-06-14",
          amountCents: 400000,
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-1",
        decision: "ignore",
        description: "Depraxe",
        category: "salario",
        mode: "one_time",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: null,
        occurrenceType: null,
      },
    ]);

    expect(mockDb.inserts.find((item: any) => item.table === statementCategorizationRules)).toBeFalsy();
  });

  it("não cria regra quando faltam campos mínimos", async () => {
    const mockDb = createDbMock([]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await upsertStatementCategorizationRuleFromReview(mockDb, {
      direction: "expense",
      description: "Padaria Central",
      category: "",
      mode: "one_time",
      monthlyExpenseId: null,
      monthlyIncomeId: null,
      expenseType: "variavel",
      occurrenceType: "planned_one_off",
    });

    expect(result).toBeNull();
    expect(mockDb.inserts.find((item: any) => item.table === statementCategorizationRules)).toBeFalsy();
  });

  it("atualiza regra existente, incrementa uso e reflete nova categoria", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-1",
          status: "pending",
          direction: "expense",
          transactionDate: "2026-06-14",
          amountCents: 3604,
        },
      ],
      [
        {
          id: "rule-1",
          pattern: "Padaria Central",
          normalizedPattern: "padaria central",
          matchType: "exact",
          direction: "expense",
          category: "alimentacao",
          expenseType: "variavel",
          occurrenceType: "planned_one_off",
          monthlyExpenseId: null,
          monthlyIncomeId: null,
          usageCount: 3,
          lastUsedAt: new Date("2026-06-10T10:00:00Z"),
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-1",
        decision: "import",
        description: "Padaria Central",
        category: "saude",
        mode: "one_time",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: "variavel",
        occurrenceType: "unexpected",
      },
    ]);

    const ruleUpdate = mockDb.updates.find((item: any) => item.table === statementCategorizationRules);
    expect(ruleUpdate).toBeTruthy();
    expect(ruleUpdate.values).toMatchObject({
      pattern: "Padaria Central",
      normalizedPattern: "padaria central",
      matchType: "exact",
      direction: "expense",
      category: "saude",
      expenseType: "variavel",
      occurrenceType: "unexpected",
    });
    expect(ruleUpdate.values.usageCount).toBeTruthy();
    expect(ruleUpdate.values.lastUsedAt).toBeTruthy();
  });

  it("não cria lote vazio quando tudo é duplicado e aponta para lote pendente", async () => {
    const mockDb = createDbMock([
      [{ rowHash: "hash-1" }, { rowHash: "hash-2" }],
      [
        {
          batchId: "batch-pending",
          batchStatus: "parsed",
          batchCreatedAt: new Date("2026-06-14T10:00:00Z"),
          rowStatus: "pending",
        },
        {
          batchId: "batch-pending",
          batchStatus: "parsed",
          batchCreatedAt: new Date("2026-06-14T10:00:00Z"),
          rowStatus: "committed",
        },
        {
          batchId: "batch-committed",
          batchStatus: "committed",
          batchCreatedAt: new Date("2026-06-10T10:00:00Z"),
          rowStatus: "committed",
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createStatementImportBatchWithRows(
      {
        source: "inter_csv",
        originalFilename: "extrato.csv",
      },
      [
        {
          source: "inter_csv",
          rowIndex: 1,
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Compra no débito",
          rawDescription: "Padaria Central",
          description: "Padaria Central",
          amountCents: 3604,
          balanceAfterCents: 939521,
          direction: "expense",
          rowHash: "hash-1",
        },
        {
          source: "inter_csv",
          rowIndex: 2,
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Pix recebido",
          rawDescription: "Depraxe",
          description: "Depraxe",
          amountCents: 400000,
          balanceAfterCents: 943125,
          direction: "income",
          rowHash: "hash-2",
        },
      ]
    );

    expect(result).toMatchObject({
      kind: "all_duplicates",
      insertedCount: 0,
      duplicateCount: 2,
      existingBatchId: "batch-pending",
      existingBatchStatus: "parsed",
    });

    expect(mockDb.inserts.find((item: any) => item.table === statementImportBatches)).toBeFalsy();
    expect(mockDb.inserts.find((item: any) => item.table === statementImportRows)).toBeFalsy();
  });

  it("não cria lote vazio quando tudo é duplicado e informa lote já comprometido", async () => {
    const mockDb = createDbMock([
      [{ rowHash: "hash-1" }],
      [
        {
          batchId: "batch-committed",
          batchStatus: "committed",
          batchCreatedAt: new Date("2026-06-10T10:00:00Z"),
          rowStatus: "committed",
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createStatementImportBatchWithRows(
      {
        source: "inter_csv",
        originalFilename: "extrato.csv",
      },
      [
        {
          source: "inter_csv",
          rowIndex: 1,
          externalId: null,
          transactionDate: "2026-06-14",
          rawHistory: "Compra no débito",
          rawDescription: "Padaria Central",
          description: "Padaria Central",
          amountCents: 3604,
          balanceAfterCents: 939521,
          direction: "expense",
          rowHash: "hash-1",
        },
      ]
    );

    expect(result).toMatchObject({
      kind: "all_duplicates",
      insertedCount: 0,
      duplicateCount: 1,
      existingBatchId: "batch-committed",
      existingBatchStatus: "committed",
    });

    expect(mockDb.inserts.find((item: any) => item.table === statementImportBatches)).toBeFalsy();
    expect(mockDb.inserts.find((item: any) => item.table === statementImportRows)).toBeFalsy();
  });

  it("descarta linha ignorada e grava despesa vinculada", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-1",
          status: "pending",
          direction: "expense",
          transactionDate: "2026-06-14",
          amountCents: 3604,
        },
      ],
      [
        {
          id: "expense-plan-1",
          isActive: true,
          startMonth: "2026-01",
          endMonth: null,
          category: "alimentacao",
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-1",
        decision: "ignore",
        description: "Padaria Central",
        category: "alimentacao",
        mode: "one_time",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: null,
        occurrenceType: null,
      },
    ]);

    expect(result).toMatchObject({
      committedCount: 0,
      ignoredCount: 1,
      batchStatus: "cancelled",
    });

    expect(mockDb.inserts.find((item: any) => item.table === monthlyExpenseEntries)).toBeFalsy();
    expect(
      mockDb.updates.some(
        (item: any) =>
          item.table === statementImportRows && item.values.status === "ignored"
      )
    ).toBe(true);
  });

  it("grava entrada avulsa com periodMonth derivado da data real", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-2",
          status: "pending",
          direction: "income",
          transactionDate: "2026-06-14",
          amountCents: 400000,
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-2",
        decision: "import",
        description: "Depraxe",
        category: "salario",
        mode: "one_time",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: null,
        occurrenceType: null,
      },
    ]);

    expect(result).toMatchObject({
      committedCount: 1,
      ignoredCount: 0,
      batchStatus: "committed",
    });

    const incomeInsert = mockDb.inserts.find((item: any) => item.table === monthlyIncomeEntries);
    expect(incomeInsert).toBeTruthy();
    expect(incomeInsert.values).toMatchObject({
      periodMonth: "2026-06",
      receivedAt: "2026-06-14",
      amount: 400000,
      category: "salario",
    });
  });

  it("grava despesa vinculada ao planejamento correto", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-3",
          status: "pending",
          direction: "expense",
          transactionDate: "2026-06-14",
          amountCents: 3604,
        },
      ],
      [
        {
          id: "expense-plan-1",
          isActive: true,
          startMonth: "2026-01",
          endMonth: null,
          category: "alimentacao",
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-3",
        decision: "import",
        description: "Padaria Central",
        category: "alimentacao",
        mode: "linked",
        monthlyExpenseId: "expense-plan-1",
        monthlyIncomeId: null,
        expenseType: null,
        occurrenceType: null,
      },
    ]);

    expect(result).toMatchObject({
      committedCount: 1,
      ignoredCount: 0,
      batchStatus: "committed",
    });

    const expenseInsert = mockDb.inserts.find((item: any) => item.table === monthlyExpenseEntries);
    expect(expenseInsert).toBeTruthy();
    expect(expenseInsert.values).toMatchObject({
      monthlyExpenseId: "expense-plan-1",
      periodMonth: "2026-06",
      paidAt: "2026-06-14",
      amount: 3604,
    });
  });

  it("retorna erros estruturados por linha quando a validação falha", async () => {
    const mockDb = createDbMock([
      [{ id: "batch-1" }],
      [
        {
          id: "row-4",
          status: "pending",
          direction: "expense",
          transactionDate: "2026-06-14",
          amountCents: 3604,
        },
      ],
    ]);
    mockedGetDb.mockReturnValue(mockDb);

    const result = await commitStatementImportBatch("batch-1", [
      {
        rowId: "row-4",
        decision: "import",
        description: "Padaria Central",
        category: "alimentacao",
        mode: "linked",
        monthlyExpenseId: null,
        monthlyIncomeId: null,
        expenseType: null,
        occurrenceType: null,
      },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Existem linhas com erro. Corrija os itens destacados e tente novamente.");
      expect(result.fieldErrorsByRowId).toMatchObject({
        "row-4": ["Selecione o planejamento desta linha."],
      });
    }

    expect(mockDb.inserts.find((item: any) => item.table === monthlyExpenseEntries)).toBeFalsy();
    expect(mockDb.inserts.find((item: any) => item.table === monthlyIncomeEntries)).toBeFalsy();
  });
});
