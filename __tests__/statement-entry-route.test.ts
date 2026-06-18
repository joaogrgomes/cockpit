import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}));

import { getStatementEntryDetail } from "@/lib/services/statement-entry.service";

function createEmptySelectChain() {
  const chain = {
    from: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => [] as Array<Record<string, unknown>>),
  };

  return chain;
}

beforeEach(() => {
  getDbMock.mockReset();
});

describe("statement entry detail route guards", () => {
  it("retorna null para originType inválido", async () => {
    await expect(getStatementEntryDetail("invalid_origin", "entry-1")).resolves.toBeNull();
  });

  it("retorna null quando o id não existe", async () => {
    getDbMock.mockReturnValue({
      select: vi.fn(() => createEmptySelectChain()),
    });

    await expect(getStatementEntryDetail("monthly_expense_entry", "missing-id")).resolves.toBeNull();
    await expect(getStatementEntryDetail("monthly_income_entry", "missing-id")).resolves.toBeNull();
  });
});
