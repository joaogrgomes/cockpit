import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDb } from "@/lib/db";
import { debtSettlementOptions } from "@/lib/db/schema";
import {
  normalizeDebtSettlementOptionUpsertInput,
  parseDebtSettlementOptionKind,
  parseDebtSettlementOptionStatus,
} from "@/lib/debt-settlement-options";
import {
  archiveDebtSettlementOption,
  createDebtSettlementOption,
  listDebtSettlementOptions,
  markDebtSettlementOptionAsAccepted,
  updateDebtSettlementOption,
} from "@/lib/services/debt-settlement-option.service";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

const mockedGetDb = vi.mocked(getDb);

function makeSelectQuery(resultRows: unknown[]) {
  const query: {
    where: () => unknown;
    orderBy: () => unknown;
    limit: (count: number) => Promise<unknown[]>;
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ) => Promise<TResult1 | TResult2>;
  } = {
    where: () => query,
    orderBy: () => query,
    limit: (count: number) => Promise.resolve(resultRows.slice(0, count)),
    then: (onfulfilled, onrejected) => Promise.resolve(resultRows).then(onfulfilled, onrejected),
  };

  return query;
}

function createDbMock({
  selectResults = [],
  insertResults = [],
  updateResults = [],
}: {
  selectResults?: unknown[][];
  insertResults?: unknown[][];
  updateResults?: unknown[][];
}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  let selectIndex = 0;
  let insertIndex = 0;
  let updateIndex = 0;

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
        return Promise.resolve(insertResults[insertIndex++] ?? []);
      },
    }),
    update: (table: unknown) => ({
      set(values: unknown) {
        updates.push({ table, values });
        const execute = () => Promise.resolve(updateResults[updateIndex++] ?? []);
        return {
          where: () => ({
            returning: execute,
            then: (onfulfilled: any, onrejected: any) => execute().then(onfulfilled, onrejected),
          }),
        };
      },
    }),
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback(mockDb),
    inserts,
    updates,
  };

  return mockDb;
}

beforeEach(() => {
  mockedGetDb.mockReset();
});

describe("debt settlement option helpers", () => {
  it("mantém unions fechados para kind e status", () => {
    expect(parseDebtSettlementOptionKind("cash")).toBe("cash");
    expect(parseDebtSettlementOptionKind("installment")).toBe("installment");
    expect(parseDebtSettlementOptionStatus("accepted")).toBe("accepted");

    expect(() => parseDebtSettlementOptionKind("parcelado")).toThrow();
    expect(() => parseDebtSettlementOptionStatus("unknown")).toThrow();
  });

  it("normaliza opção à vista para upfront igual ao total", () => {
    const normalized = normalizeDebtSettlementOptionUpsertInput({
      kind: "cash",
      installments: 1,
      totalAmountCents: 120_000,
      upfrontAmountCents: 10_000,
      monthlyInstallmentCents: null,
      firstDueDate: null,
      validUntil: null,
      notes: "  teste  ",
    });

    expect(normalized).toEqual({
      ok: true,
      value: {
        kind: "cash",
        installments: 1,
        totalAmountCents: 120_000,
        upfrontAmountCents: 120_000,
        monthlyInstallmentCents: null,
        firstDueDate: null,
        validUntil: null,
        notes: "teste",
      },
    });
  });
});

describe("debt settlement option service", () => {
  it("cria opção à vista válida", async () => {
    const mockDb = createDbMock({
      selectResults: [[{ id: "debt-1" }]],
      insertResults: [[
        {
          id: "option-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 120_000,
          upfrontAmountCents: 120_000,
          monthlyInstallmentCents: null,
          firstDueDate: null,
          validUntil: null,
          status: "active",
          notes: "À vista",
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createDebtSettlementOption({
      debtId: "debt-1",
      kind: "cash",
      installments: 1,
      totalAmountCents: 120_000,
      upfrontAmountCents: 50_000,
      monthlyInstallmentCents: null,
      firstDueDate: null,
      validUntil: null,
      notes: "À vista",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.option).toMatchObject({
        kind: "cash",
        installments: 1,
        totalAmountCents: 120_000,
        upfrontAmountCents: 120_000,
        monthlyInstallmentCents: null,
        status: "active",
      });
    }

    const insert = mockDb.inserts.find((item: any) => item.table === debtSettlementOptions);
    expect(insert).toBeTruthy();
  });

  it("cria opção parcelada válida", async () => {
    const mockDb = createDbMock({
      selectResults: [[{ id: "debt-1" }]],
      insertResults: [[
        {
          id: "option-2",
          debtId: "debt-1",
          kind: "installment",
          installments: 6,
          totalAmountCents: 360_000,
          upfrontAmountCents: 60_000,
          monthlyInstallmentCents: 50_000,
          firstDueDate: "2026-07-10",
          validUntil: "2026-07-31",
          status: "active",
          notes: null,
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createDebtSettlementOption({
      debtId: "debt-1",
      kind: "installment",
      installments: 6,
      totalAmountCents: 360_000,
      upfrontAmountCents: 60_000,
      monthlyInstallmentCents: 50_000,
      firstDueDate: "2026-07-10",
      validUntil: "2026-07-31",
      notes: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.option.kind).toBe("installment");
      expect(result.option.installments).toBe(6);
    }
  });

  it("bloqueia opção à vista com installments diferente de 1", async () => {
    mockedGetDb.mockReturnValue(createDbMock({ selectResults: [[{ id: "debt-1" }]] }));

    const result = await createDebtSettlementOption({
      debtId: "debt-1",
      kind: "cash",
      installments: 2,
      totalAmountCents: 120_000,
      upfrontAmountCents: 0,
      monthlyInstallmentCents: null,
      firstDueDate: null,
      validUntil: null,
      notes: null,
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      error: "Opção à vista deve ter 1 parcela.",
    });
  });

  it("bloqueia opção parcelada com installments menor ou igual a 1", async () => {
    mockedGetDb.mockReturnValue(createDbMock({ selectResults: [[{ id: "debt-1" }]] }));

    const result = await createDebtSettlementOption({
      debtId: "debt-1",
      kind: "installment",
      installments: 1,
      totalAmountCents: 120_000,
      upfrontAmountCents: 0,
      monthlyInstallmentCents: 40_000,
      firstDueDate: "2026-07-10",
      validUntil: null,
      notes: null,
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      error: "Opção parcelada deve ter mais de 1 parcela.",
    });
  });

  it("bloqueia valor total menor ou igual a zero", async () => {
    mockedGetDb.mockReturnValue(createDbMock({ selectResults: [[{ id: "debt-1" }]] }));

    const result = await createDebtSettlementOption({
      debtId: "debt-1",
      kind: "cash",
      installments: 1,
      totalAmountCents: 0,
      upfrontAmountCents: 0,
      monthlyInstallmentCents: null,
      firstDueDate: null,
      validUntil: null,
      notes: null,
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      error: "O valor total deve ser maior que zero.",
    });
  });

  it("lista opções por dívida e oculta arquivadas da visão principal", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        {
          id: "option-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 120_000,
          upfrontAmountCents: 120_000,
          monthlyInstallmentCents: null,
          firstDueDate: null,
          validUntil: null,
          status: "active",
          notes: null,
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
        {
          id: "option-2",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 90_000,
          upfrontAmountCents: 90_000,
          monthlyInstallmentCents: null,
          firstDueDate: null,
          validUntil: null,
          status: "archived",
          notes: null,
          createdAt: new Date("2026-06-09T10:00:00Z"),
          updatedAt: new Date("2026-06-09T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await listDebtSettlementOptions("debt-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "option-1",
      kind: "cash",
      status: "active",
    });
  });

  it("arquiva opção e a remove da lista principal", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        {
          id: "option-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 120_000,
          upfrontAmountCents: 120_000,
          monthlyInstallmentCents: null,
          firstDueDate: null,
          validUntil: null,
          status: "active",
          notes: null,
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ]],
      updateResults: [[
        {
          id: "option-1",
          debtId: "debt-1",
          kind: "cash",
          installments: 1,
          totalAmountCents: 120_000,
          upfrontAmountCents: 120_000,
          monthlyInstallmentCents: null,
          firstDueDate: null,
          validUntil: null,
          status: "archived",
          notes: null,
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:10:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const archived = await archiveDebtSettlementOption("option-1");
    expect(archived.ok).toBe(true);

    const listed = await listDebtSettlementOptions("debt-1");
    expect(listed).toHaveLength(0);
  });

  it("marcar como aceita desmarca accepted anterior da mesma dívida", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        {
          id: "option-2",
          debtId: "debt-1",
          kind: "installment",
          installments: 6,
          totalAmountCents: 360_000,
          upfrontAmountCents: 60_000,
          monthlyInstallmentCents: 50_000,
          firstDueDate: "2026-07-10",
          validUntil: null,
          status: "active",
          notes: null,
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:00:00Z"),
        },
      ]],
      updateResults: [
        [],
        [
          {
            id: "option-2",
            debtId: "debt-1",
            kind: "installment",
            installments: 6,
            totalAmountCents: 360_000,
            upfrontAmountCents: 60_000,
            monthlyInstallmentCents: 50_000,
            firstDueDate: "2026-07-10",
            validUntil: null,
            status: "accepted",
            notes: null,
            createdAt: new Date("2026-06-10T10:00:00Z"),
            updatedAt: new Date("2026-06-10T10:15:00Z"),
          },
        ],
      ],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const accepted = await markDebtSettlementOptionAsAccepted("option-2");
    expect(accepted.ok).toBe(true);

    expect(mockDb.updates).toHaveLength(2);
    expect(mockDb.updates[0]?.values).toMatchObject({ status: "active" });
    expect(mockDb.updates[1]?.values).toMatchObject({ status: "accepted" });
  });

  it("atualiza opção existente", async () => {
    const mockDb = createDbMock({
      selectResults: [
        [
          {
            id: "option-1",
            debtId: "debt-1",
            kind: "cash",
            installments: 1,
            totalAmountCents: 120_000,
            upfrontAmountCents: 120_000,
            monthlyInstallmentCents: null,
            firstDueDate: null,
            validUntil: null,
            status: "active",
            notes: null,
            createdAt: new Date("2026-06-10T10:00:00Z"),
            updatedAt: new Date("2026-06-10T10:00:00Z"),
          },
        ],
      ],
      updateResults: [[
        {
          id: "option-1",
          debtId: "debt-1",
          kind: "installment",
          installments: 3,
          totalAmountCents: 300_000,
          upfrontAmountCents: 0,
          monthlyInstallmentCents: 100_000,
          firstDueDate: "2026-07-10",
          validUntil: "2026-08-10",
          status: "active",
          notes: "Atualizada",
          createdAt: new Date("2026-06-10T10:00:00Z"),
          updatedAt: new Date("2026-06-10T10:20:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await updateDebtSettlementOption("option-1", {
      kind: "installment",
      installments: 3,
      totalAmountCents: 300_000,
      upfrontAmountCents: 0,
      monthlyInstallmentCents: 100_000,
      firstDueDate: "2026-07-10",
      validUntil: "2026-08-10",
      notes: "Atualizada",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.option).toMatchObject({
        kind: "installment",
        installments: 3,
        totalAmountCents: 300_000,
        monthlyInstallmentCents: 100_000,
        status: "active",
      });
    }
  });
});
