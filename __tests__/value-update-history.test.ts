import { describe, expect, it } from "vitest";
import {
  calcDifferenceFromPrevious,
  mapValueUpdatesToHistory,
} from "@/lib/value-update-history";
import type { DebtValueUpdate } from "@/types";

describe("calcDifferenceFromPrevious", () => {
  it("retorna null no primeiro registro", () => {
    expect(calcDifferenceFromPrevious(120000, null)).toBeNull();
  });

  it("calcula aumento e reducao corretamente", () => {
    expect(calcDifferenceFromPrevious(120000, 100000)).toBe(20000);
    expect(calcDifferenceFromPrevious(80000, 100000)).toBe(-20000);
  });
});

describe("mapValueUpdatesToHistory", () => {
  it("adiciona diferenca entre registros consecutivos", () => {
    const updates: DebtValueUpdate[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        debtId: "22222222-2222-2222-2222-222222222222",
        recordedValue: 100000,
        recordedAt: "2026-05-01",
        source: null,
        notes: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        debtId: "22222222-2222-2222-2222-222222222222",
        recordedValue: 105000,
        recordedAt: "2026-05-10",
        source: "app",
        notes: null,
        createdAt: new Date("2026-05-10T10:00:00.000Z"),
      },
    ];

    const result = mapValueUpdatesToHistory(updates);

    expect(result).toHaveLength(2);
    expect(result[0]?.differenceFromPrevious).toBeNull();
    expect(result[1]?.differenceFromPrevious).toBe(5000);
  });
});
