import { describe, expect, it } from "vitest";
import {
  compareRiskSignals,
  getPerceivedRiskRank,
  getPriorityRank,
} from "@/lib/dashboard-rankings";

describe("dashboard risk rankings", () => {
  it("aplica a ordem de prioridade definida", () => {
    expect(getPriorityRank("critica")).toBeGreaterThan(getPriorityRank("alta"));
    expect(getPriorityRank("alta")).toBeGreaterThan(getPriorityRank("media"));
    expect(getPriorityRank("media")).toBeGreaterThan(getPriorityRank("baixa"));
    expect(getPriorityRank(null)).toBe(0);
  });

  it("aplica a ordem de risco percebido definida", () => {
    expect(getPerceivedRiskRank("juridico")).toBeGreaterThan(getPerceivedRiskRank("alto"));
    expect(getPerceivedRiskRank("alto")).toBeGreaterThan(getPerceivedRiskRank("consignado"));
    expect(getPerceivedRiskRank("nao_sei")).toBeGreaterThan(getPerceivedRiskRank(null));
  });

  it("ordena primeiro por prioridade e depois por risco percebido", () => {
    const rows = [
      { priority: "alta", perceivedRisk: "alto", currentValue: 1000 },
      { priority: "critica", perceivedRisk: "baixo", currentValue: 1000 },
      { priority: "alta", perceivedRisk: "juridico", currentValue: 1000 },
    ];

    const sorted = [...rows].sort(compareRiskSignals);

    expect(sorted[0]).toEqual(rows[1]);
    expect(sorted[1]).toEqual(rows[2]);
    expect(sorted[2]).toEqual(rows[0]);
  });
});
