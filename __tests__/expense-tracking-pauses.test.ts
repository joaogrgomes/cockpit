import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  listMonthlyExpensePausesByExpenseIds: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { monthlyExpenseEntries, monthlyExpenses } from "@/lib/db/schema";
import { getExpenseTrackingByPeriod } from "@/lib/services/monthly-expense-entry.service";

vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/services/monthly-expense-pause.service", () => ({
  listMonthlyExpensePausesByExpenseIds: mocks.listMonthlyExpensePausesByExpenseIds,
}));

const mockedGetDb = vi.mocked(getDb);

function makeSelectQuery(resultRows: unknown[]) {
  const query: {
    where: () => unknown;
    orderBy: () => unknown;
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: TResult2) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ) => Promise<TResult1 | TResult2>;
  } = {
    where: () => query,
    orderBy: () => query,
    then: (onfulfilled, onrejected) => Promise.resolve(resultRows).then(onfulfilled, onrejected),
  };

  return query;
}

function createDbMock({
  monthlyExpenseRows,
  monthlyExpenseEntryRows,
}: {
  monthlyExpenseRows: unknown[];
  monthlyExpenseEntryRows: unknown[];
}) {
  const mockDb: any = {
    select: () => ({
      from: (table: unknown) => {
        if (table === monthlyExpenses) {
          return makeSelectQuery(monthlyExpenseRows);
        }

        if (table === monthlyExpenseEntries) {
          return makeSelectQuery(monthlyExpenseEntryRows);
        }

        return makeSelectQuery([]);
      },
    }),
  };

  return mockDb;
}

describe("getExpenseTrackingByPeriod com pausas", () => {
  it("exclui julho pausado e volta em agosto", async () => {
    mockedGetDb.mockReturnValue(
      createDbMock({
        monthlyExpenseRows: [
          {
            id: "expense-1",
            name: "Pilates Poli",
            category: "saude",
            expenseType: "fixo",
            dueDay: 12,
            amount: 15000,
            startMonth: "2026-01",
            endMonth: null,
          },
        ],
        monthlyExpenseEntryRows: [],
      })
    );

    mocks.listMonthlyExpensePausesByExpenseIds.mockResolvedValue([
      {
        id: "pause-1",
        monthlyExpenseId: "expense-1",
        startMonth: "2026-06",
        endMonth: "2026-07",
        reason: "Férias",
      },
    ]);

    const july = await getExpenseTrackingByPeriod("2026-07");
    expect(july.fixedItems).toHaveLength(0);
    expect(july.summary.pendingCount).toBe(0);

    const august = await getExpenseTrackingByPeriod("2026-08");
    expect(august.fixedItems).toHaveLength(1);
    expect(august.fixedItems[0]).toMatchObject({
      monthlyExpenseId: "expense-1",
      name: "Pilates Poli",
    });
  });
});
