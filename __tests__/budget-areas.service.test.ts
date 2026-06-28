import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDb } from "@/lib/db";
import { budgetAreaSettings } from "@/lib/db/schema";
import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import { listMonthlyIncomes } from "@/lib/services/monthly-income.service";
import {
  getBudgetAreaSettings,
  getBudgetAreasViewModel,
  upsertBudgetAreaSettings,
} from "@/lib/services/budget-areas.service";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/services/monthly-income.service", () => ({
  listMonthlyIncomes: vi.fn(),
}));

vi.mock("@/lib/services/monthly-expense.service", () => ({
  listMonthlyExpenses: vi.fn(),
}));

const mockedGetDb = vi.mocked(getDb);
const mockedListMonthlyIncomes = vi.mocked(listMonthlyIncomes);
const mockedListMonthlyExpenses = vi.mocked(listMonthlyExpenses);

function makeSelectQuery(resultRows: unknown[]) {
  const query: {
    orderBy: () => unknown;
    limit: (count: number) => Promise<unknown[]>;
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ) => Promise<TResult1 | TResult2>;
  } = {
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
    inserts,
    updates,
  };

  return mockDb;
}

beforeEach(() => {
  mockedGetDb.mockReset();
  mockedListMonthlyIncomes.mockReset();
  mockedListMonthlyExpenses.mockReset();
});

describe("budget areas service", () => {
  it("cria a configuração padrão quando ainda não existe", async () => {
    const mockDb = createDbMock({
      selectResults: [[]],
      insertResults: [[
        {
          id: "settings-1",
          scope: "global",
          baseIncomeCents: 980_000,
          needsPercent: 60,
          debtPaymentPercent: 20,
          emergencyReservePercent: 10,
          flexiblePercent: 10,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-01T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const settings = await getBudgetAreaSettings();

    expect(settings).toEqual({
      baseIncomeCents: 980_000,
      needsPercent: 60,
      debtPaymentPercent: 20,
      emergencyReservePercent: 10,
      flexiblePercent: 10,
    });

    const insert = mockDb.inserts.find((item: any) => item.table === budgetAreaSettings);
    expect(insert?.values).toMatchObject({
      scope: "global",
      baseIncomeCents: 980_000,
      needsPercent: 60,
      debtPaymentPercent: 20,
      emergencyReservePercent: 10,
      flexiblePercent: 10,
    });
  });

  it("atualiza a configuração existente sem criar outra linha", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        {
          id: "settings-1",
          scope: "global",
          baseIncomeCents: 980_000,
          needsPercent: 60,
          debtPaymentPercent: 20,
          emergencyReservePercent: 10,
          flexiblePercent: 10,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-01T10:00:00Z"),
        },
      ]],
      updateResults: [[
        {
          id: "settings-1",
          scope: "global",
          baseIncomeCents: 1_250_000,
          needsPercent: 50,
          debtPaymentPercent: 25,
          emergencyReservePercent: 15,
          flexiblePercent: 10,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-15T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);

    const settings = await upsertBudgetAreaSettings({
      baseIncomeCents: 1_250_000,
      needsPercent: 50,
      debtPaymentPercent: 25,
      emergencyReservePercent: 15,
      flexiblePercent: 10,
    });

    expect(settings).toEqual({
      baseIncomeCents: 1_250_000,
      needsPercent: 50,
      debtPaymentPercent: 25,
      emergencyReservePercent: 15,
      flexiblePercent: 10,
    });

    expect(mockDb.inserts).toHaveLength(0);
    expect(mockDb.updates).toHaveLength(1);
  });

  it("separa a renda calculada do mês da configuração salva", async () => {
    const mockDb = createDbMock({
      selectResults: [[
        {
          id: "settings-1",
          scope: "global",
          baseIncomeCents: 1_500_000,
          needsPercent: 50,
          debtPaymentPercent: 25,
          emergencyReservePercent: 15,
          flexiblePercent: 10,
          createdAt: new Date("2026-06-01T10:00:00Z"),
          updatedAt: new Date("2026-06-01T10:00:00Z"),
        },
      ]],
    });
    mockedGetDb.mockReturnValue(mockDb);
    mockedListMonthlyIncomes.mockResolvedValue([
      {
        id: "income-1",
        name: "Salário",
        category: "salario",
        amount: 800_000,
        startMonth: "2026-01",
        endMonth: null,
      },
    ] as never);
    mockedListMonthlyExpenses.mockResolvedValue([] as never);

    const viewModel = await getBudgetAreasViewModel("2026-06");

    expect(viewModel.settings.baseIncomeCents).toBe(1_500_000);
    expect(viewModel.calculatedBaseIncomeCents).toBe(800_000);
    expect(viewModel.model.allocations.find((allocation) => allocation.areaKey === "necessidades_basicas")?.percentage).toBe(50);
    expect(viewModel.defaultAnalysis.baseIncomeCents).toBe(1_500_000);
  });
});
