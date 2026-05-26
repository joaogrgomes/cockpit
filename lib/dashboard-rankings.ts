export const PRIORITY_RANK: Record<string, number> = {
  critica: 4,
  alta: 3,
  media: 2,
  baixa: 1,
};

export const PERCEIVED_RISK_RANK: Record<string, number> = {
  juridico: 7,
  alto: 6,
  consignado: 5,
  negativacao: 4,
  medio: 3,
  baixo: 2,
  nao_sei: 1,
};

export type RiskSignal = {
  priority?: string | null;
  perceivedRisk?: string | null;
  currentValue?: number;
};

export function getPriorityRank(priority?: string | null): number {
  if (!priority) return 0;
  return PRIORITY_RANK[priority] ?? 0;
}

export function getPerceivedRiskRank(perceivedRisk?: string | null): number {
  if (!perceivedRisk) return 0;
  return PERCEIVED_RISK_RANK[perceivedRisk] ?? 0;
}

export function compareRiskSignals(a: RiskSignal, b: RiskSignal): number {
  const priorityDiff = getPriorityRank(b.priority) - getPriorityRank(a.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const riskDiff = getPerceivedRiskRank(b.perceivedRisk) - getPerceivedRiskRank(a.perceivedRisk);
  if (riskDiff !== 0) return riskDiff;

  return (b.currentValue ?? 0) - (a.currentValue ?? 0);
}
