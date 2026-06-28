import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDb } from "@/lib/db";
import { monthlyExpensePauses, monthlyExpenses } from "@/lib/db/schema";
import {
  getMonthlyExpenseActivePause,
  getMonthlyExpensePausePeriodLabel,
  isMonthlyExpensePausedInMonth,
  type MonthlyExpensePauseLike,
} from "@/lib/monthly-expense-pauses";
import {
  createMonthlyExpensePause,
  deleteMonthlyExpensePause,
  updateMonthlyExpensePause,
} from "@/lib/services/monthly-expense-pause.service";

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
  selectResultsByTable = {},
  insertResults = [],
  updateResults = [],
  deleteResults = [],
}: {
  selectResultsByTable?: Partial<Record<"monthlyExpenses" | "monthlyExpensePauses", unknown[][]>>;
  insertResults?: unknown[][];
  updateResults?: unknown[][];
  deleteResults?: unknown[][];
}) {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updates: Array<{ table: unknown; values: unknown }> = [];
  const deletes: Array<{ table: unknown }> = [];
  const selectIndexByTable = new Map<string, number>();
  let insertIndex = 0;
  let updateIndex = 0;
  let deleteIndex = 0;

  const mockDb: any = {
    select: () => ({
      from: (table: unknown) => {
        const key = table === monthlyExpenses ? "monthlyExpenses" : table === monthlyExpensePauses ? "monthlyExpensePauses" : "monthlyExpenses";
        const index = selectIndexByTable.get(key) ?? 0;
        const resultRows = selectResultsByTable[key as "monthlyExpenses" | "monthlyExpensePauses"]?.[index] ?? [];
        selectIndexByTable.set(key, index + 1);
        return makeSelectQuery(resultRows);
      },
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
        return {
          where: () => ({
            returning: () => Promise.resolve(updateResults[updateIndex++] ?? []),
          }),
        };
      },
    }),
    delete: (table: unknown) => {
      deletes.push({ table });
      return {
        where: () => ({
          returning: () => Promise.resolve(deleteResults[deleteIndex++] ?? []),
        }),
      };
    },
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback(mockDb),
    inserts,
    updates,
    deletes,
  };

  return mockDb;
}

beforeEach(() => {
  mockedGetDb.mockReset();
});

describe("monthly expense pause helpers", () => {
  it("identifica pausa ativa e formata período", () => {
    const pauses: MonthlyExpensePauseLike[] = [
      {
        id: "pause-1",
        monthlyExpenseId: "expense-1",
        startMonth: "2026-05",
        endMonth: "2026-06",
        reason: "Viagem",
      },
      {
        id: "pause-2",
        monthlyExpenseId: "expense-1",
        startMonth: "2026-08",
        endMonth: null,
        reason: null,
      },
    ];

    expect(isMonthlyExpensePausedInMonth(pauses, "2026-06")).toBe(true);
    expect(isMonthlyExpensePausedInMonth(pauses, "2026-07")).toBe(false);
    expect(getMonthlyExpenseActivePause(pauses, "2026-06")).toMatchObject({
      id: "pause-1",
    });
    expect(getMonthlyExpensePausePeriodLabel(pauses[0])).toBe("mai/2026 até jun/2026");
    expect(getMonthlyExpensePausePeriodLabel(pauses[1])).toBe("desde ago/2026");
  });
});

describe("monthly expense pause service", () => {
  it("cria pausa válida", async () => {
    const mockDb = createDbMock({
      selectResultsByTable: {
        monthlyExpenses: [
          [
            {
              id: "expense-1",
              isActive: true,
            },
          ],
        ],
        monthlyExpensePauses: [[]],
      },
      insertResults: [[
        {
          id: "pause-1",
          monthlyExpenseId: "expense-1",
          startMonth: "2026-05",
          endMonth: "2026-06",
          reason: "Viagem",
          createdAt: new Date("2026-05-01T12:00:00Z"),
          updatedAt: new Date("2026-05-01T12:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createMonthlyExpensePause({
      monthlyExpenseId: "expense-1",
      startMonth: "2026-05",
      endMonth: "2026-06",
      reason: " Viagem ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pause).toMatchObject({
        monthlyExpenseId: "expense-1",
        startMonth: "2026-05",
        endMonth: "2026-06",
        reason: "Viagem",
      });
    }

    const insert = mockDb.inserts.find((item: any) => item.table === monthlyExpensePauses);
    expect(insert).toBeTruthy();
  });

  it("bloqueia pausa sobreposta", async () => {
    const mockDb = createDbMock({
      selectResultsByTable: {
        monthlyExpenses: [
          [
            {
              id: "expense-1",
              isActive: true,
            },
          ],
        ],
        monthlyExpensePauses: [
          [
            {
              id: "pause-1",
              monthlyExpenseId: "expense-1",
              startMonth: "2026-05",
              endMonth: "2026-06",
              reason: "Viagem",
              createdAt: new Date("2026-05-01T12:00:00Z"),
              updatedAt: new Date("2026-05-01T12:00:00Z"),
            },
          ],
        ],
      },
    });
    mockedGetDb.mockReturnValue(mockDb);

    const result = await createMonthlyExpensePause({
      monthlyExpenseId: "expense-1",
      startMonth: "2026-06",
      endMonth: "2026-07",
      reason: "Overlapping",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OVERLAP");
    }
  });

  it("atualiza e remove pausas", async () => {
    const updateDb = createDbMock({
      selectResultsByTable: {
        monthlyExpenses: [[]],
        monthlyExpensePauses: [
          [
            {
              id: "pause-1",
              monthlyExpenseId: "expense-1",
              startMonth: "2026-05",
              endMonth: null,
              reason: "Motivo antigo",
              createdAt: new Date("2026-05-01T12:00:00Z"),
              updatedAt: new Date("2026-05-01T12:00:00Z"),
            },
          ],
          [],
        ],
      },
      updateResults: [[
        {
          id: "pause-1",
          monthlyExpenseId: "expense-1",
          startMonth: "2026-05",
          endMonth: "2026-06",
          reason: "Motivo novo",
          createdAt: new Date("2026-05-01T12:00:00Z"),
          updatedAt: new Date("2026-05-01T12:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(updateDb);

    const updated = await updateMonthlyExpensePause("pause-1", {
      startMonth: "2026-05",
      endMonth: "2026-06",
      reason: "Motivo novo",
    });

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.pause.reason).toBe("Motivo novo");
    }

    const deleteDb = createDbMock({
      selectResultsByTable: {
        monthlyExpenses: [[]],
        monthlyExpensePauses: [
          [
            {
              id: "pause-1",
              monthlyExpenseId: "expense-1",
              startMonth: "2026-05",
              endMonth: "2026-06",
              reason: "Motivo novo",
              createdAt: new Date("2026-05-01T12:00:00Z"),
              updatedAt: new Date("2026-05-01T12:00:00Z"),
            },
          ],
        ],
      },
      deleteResults: [[
        {
          id: "pause-1",
          monthlyExpenseId: "expense-1",
          startMonth: "2026-05",
          endMonth: "2026-06",
          reason: "Motivo novo",
          createdAt: new Date("2026-05-01T12:00:00Z"),
          updatedAt: new Date("2026-05-01T12:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(deleteDb);

    const deleted = await deleteMonthlyExpensePause("pause-1");
    expect(deleted.ok).toBe(true);
  });
});

describe("listagem com pausa", () => {
  it("exclui planejamento pausado no mês informado", () => {
    const expenses = [
      {
        id: "expense-1",
        startMonth: "2026-01",
        endMonth: null,
      },
      {
        id: "expense-2",
        startMonth: "2026-01",
        endMonth: null,
      },
    ];
    const pauses = [
      {
        id: "pause-1",
        monthlyExpenseId: "expense-1",
        startMonth: "2026-06",
        endMonth: null,
        reason: "Férias",
      },
    ];

    const pausesByExpenseId = {
      "expense-1": pauses,
      "expense-2": [],
    };

    const filtered = expenses.filter(
      (expense) =>
        !isMonthlyExpensePausedInMonth(
          pausesByExpenseId[expense.id as keyof typeof pausesByExpenseId],
          "2026-06"
        )
    );

    expect(filtered.map((row) => row.id)).toEqual(["expense-2"]);
  });
});
