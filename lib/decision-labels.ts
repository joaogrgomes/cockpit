import { calcDiscountPct, calcGrowthPct } from "@/lib/calculations";
import { compareRiskSignals } from "@/lib/dashboard-rankings";

export type DecisionLabelKey =
  | "melhor_oportunidade_quitacao"
  | "mais_barata_para_resolver"
  | "maior_risco"
  | "mais_cara_em_crescimento"
  | "proposta_vencendo"
  | "precisa_atualizar_valor"
  | "aguardando_negociacao";

export type DecisionLabel = {
  key: DecisionLabelKey;
  title: string;
  reason: string;
};

export type DecisionBaseDebt = {
  id: string;
  name: string;
  creditor: string;
  status: string;
  currentValue: number;
  originalValue: number | null;
  lastUpdatedAt: string | Date;
  priority: string | null;
  perceivedRisk: string | null;
  activeProposal: {
    proposedValue: number;
    expiresAt: string | Date | null;
  } | null;
};

export type DecisionItem = DecisionBaseDebt & {
  growthPct: number | null;
  discountPct: number | null;
  daysSinceLastUpdate: number;
  daysUntilProposalExpiry: number | null;
  labels: DecisionLabel[];
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function calculateDaysBetween(from: string | Date, to: Date): number {
  const fromDate = from instanceof Date ? from : new Date(from);
  const diffMs = startOfDay(to).getTime() - startOfDay(fromDate).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function calculateDaysUntil(from: Date, target: string | Date): number {
  const toDate = target instanceof Date ? target : new Date(target);
  const diffMs = startOfDay(toDate).getTime() - startOfDay(from).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getRiskReason(priority: string | null, perceivedRisk: string | null): string {
  if (priority === "critica") {
    return "Prioridade crítica";
  }

  if (priority === "alta") {
    return "Prioridade alta";
  }

  if (perceivedRisk === "juridico") {
    return "Risco jurídico informado";
  }

  if (perceivedRisk) {
    return `Risco percebido: ${perceivedRisk}`;
  }

  return "Maior combinação de prioridade e risco percebido";
}

export function buildDecisionItems(
  debts: DecisionBaseDebt[],
  now: Date = new Date()
): DecisionItem[] {
  const activeDebts = debts.filter((debt) => debt.status !== "quitada");

  const enriched = activeDebts.map((debt) => {
    const growthPct =
      typeof debt.originalValue === "number" && debt.originalValue > 0
        ? calcGrowthPct(debt.currentValue, debt.originalValue)
        : null;

    const discountPct = debt.activeProposal
      ? calcDiscountPct(debt.currentValue, debt.activeProposal.proposedValue)
      : null;

    const daysUntilProposalExpiry = debt.activeProposal?.expiresAt
      ? calculateDaysUntil(now, debt.activeProposal.expiresAt)
      : null;

    return {
      ...debt,
      growthPct,
      discountPct,
      daysUntilProposalExpiry,
      daysSinceLastUpdate: calculateDaysBetween(debt.lastUpdatedAt, now),
      labels: [] as DecisionLabel[],
    };
  });

  const bestOpportunityId = [...enriched]
    .filter((debt) => typeof debt.discountPct === "number")
    .sort((a, b) => {
      const pctDiff = (b.discountPct ?? -Infinity) - (a.discountPct ?? -Infinity);
      if (pctDiff !== 0) return pctDiff;
      return b.currentValue - a.currentValue;
    })[0]?.id;

  const cheapestSettlementId = [...enriched]
    .filter((debt) => debt.activeProposal)
    .sort(
      (a, b) =>
        (a.activeProposal?.proposedValue ?? Number.POSITIVE_INFINITY) -
        (b.activeProposal?.proposedValue ?? Number.POSITIVE_INFINITY)
    )[0]?.id;

  const highestRiskId = [...enriched].sort(compareRiskSignals)[0]?.id;

  const highestGrowthId = [...enriched]
    .filter((debt) => typeof debt.growthPct === "number")
    .sort((a, b) => (b.growthPct ?? -Infinity) - (a.growthPct ?? -Infinity))[0]?.id;

  for (const debt of enriched) {
    if (debt.id === bestOpportunityId) {
      debt.labels.push({
        key: "melhor_oportunidade_quitacao",
        title: "Melhor oportunidade de quitação",
        reason: "Maior desconto percentual entre as propostas ativas",
      });
    }

    if (debt.id === cheapestSettlementId) {
      debt.labels.push({
        key: "mais_barata_para_resolver",
        title: "Mais barata para resolver",
        reason: "Menor valor de quitação entre as propostas ativas",
      });
    }

    if (debt.id === highestRiskId) {
      debt.labels.push({
        key: "maior_risco",
        title: "Maior risco",
        reason: getRiskReason(debt.priority, debt.perceivedRisk),
      });
    }

    if (debt.id === highestGrowthId) {
      debt.labels.push({
        key: "mais_cara_em_crescimento",
        title: "Mais cara em crescimento",
        reason:
          typeof debt.growthPct === "number"
            ? `Cresceu ${debt.growthPct.toFixed(1)}% desde o valor original`
            : "Maior crescimento percentual entre as dívidas com valor original",
      });
    }

    if (
      typeof debt.daysUntilProposalExpiry === "number" &&
      debt.daysUntilProposalExpiry >= 0 &&
      debt.daysUntilProposalExpiry <= 7
    ) {
      debt.labels.push({
        key: "proposta_vencendo",
        title: "Proposta vencendo",
        reason: `Vence em ${debt.daysUntilProposalExpiry} dia(s)`,
      });
    }

    if (debt.daysSinceLastUpdate > 30) {
      debt.labels.push({
        key: "precisa_atualizar_valor",
        title: "Precisa atualizar valor",
        reason: `Última atualização há ${debt.daysSinceLastUpdate} dias`,
      });
    }

    if (debt.status === "em_negociacao") {
      debt.labels.push({
        key: "aguardando_negociacao",
        title: "Aguardando negociação",
        reason: "Status atual: em negociação",
      });
    }
  }

  return enriched
    .filter((debt) => debt.labels.length > 0)
    .sort((a, b) => {
      const labelDiff = b.labels.length - a.labels.length;
      if (labelDiff !== 0) return labelDiff;
      return b.currentValue - a.currentValue;
    });
}
