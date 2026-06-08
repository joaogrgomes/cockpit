import "server-only";

import { and, eq, ne, or, sql } from "drizzle-orm";
import {
  calcAdditions,
  calcDiscountPct,
  calcGrowthPct,
} from "@/lib/calculations";
import { normalizeDateOnly } from "@/lib/date-utils";
import {
  compareRiskSignals,
  getPerceivedRiskRank,
  getPriorityRank,
} from "@/lib/dashboard-rankings";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";

export type DashboardTopDebt = {
  id: string;
  name: string;
  creditor: string;
  currentValue: number;
};

export type DashboardBestOpportunity = {
  id: string;
  name: string;
  creditor: string;
  currentValue: number;
  proposedValue: number;
  discountValue: number;
  discountPct: number;
};

export type DashboardGrowthDebt = {
  id: string;
  name: string;
  creditor: string;
  currentValue: number;
  originalValue: number;
  additionsValue: number;
  growthPct: number;
};

export type DashboardRiskDebt = {
  id: string;
  name: string;
  creditor: string;
  currentValue: number;
  priority: string | null;
  perceivedRisk: string | null;
  priorityRank: number;
  perceivedRiskRank: number;
};

export type DashboardExpiringProposal = {
  debtId: string;
  debtName: string;
  expiresAt: string;
  daysUntilExpiry: number;
};

export type DashboardMetrics = {
  activeDebts: number;
  totalDue: number;
  totalOriginal: number;
  totalAdditions: number;
  overdueDebts: number;
  debtsWithActiveProposal: number;
  totalSettlementActiveProposals: number;
  totalPotentialSavings: number;
  nextExpiringProposal: DashboardExpiringProposal | null;
  topDebts: DashboardTopDebt[];
  bestOpportunities: DashboardBestOpportunity[];
  fastestGrowingDebts: DashboardGrowthDebt[];
  highestRiskDebts: DashboardRiskDebt[];
};

function calculateDaysUntil(dateValue: string | Date): number {
  const normalized = normalizeDateOnly(dateValue);
  if (!normalized) return 0;

  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  if ([year, month, day].some(Number.isNaN)) return 0;

  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  const activeDebtRows = await db
    .select({
      id: debts.id,
      name: debts.name,
      creditor: debts.creditor,
      status: debts.status,
      currentValue: debts.currentValue,
      originalValue: debts.originalValue,
      priority: debts.priority,
      perceivedRisk: debts.perceivedRisk,
    })
    .from(debts)
    .where(ne(debts.status, "quitada"));

  const activeProposalRows = await db
    .select({
      debtId: debts.id,
      debtName: debts.name,
      creditor: debts.creditor,
      currentValue: debts.currentValue,
      proposedValue: debtProposals.proposedValue,
      expiresAt: debtProposals.expiresAt,
    })
    .from(debtProposals)
    .innerJoin(debts, eq(debtProposals.debtId, debts.id))
    .where(
      and(
        eq(debtProposals.status, "ativa"),
        ne(debts.status, "quitada"),
        or(
          sql`${debtProposals.expiresAt} IS NULL`,
          sql`${debtProposals.expiresAt} >= CURRENT_DATE`
        )
      )
    );

  let totalDue = 0;
  let totalOriginal = 0;
  let totalAdditions = 0;
  let overdueDebts = 0;

  for (const debt of activeDebtRows) {
    totalDue += debt.currentValue;

    if (typeof debt.originalValue === "number") {
      totalOriginal += debt.originalValue;
      const additions = calcAdditions(debt.currentValue, debt.originalValue);
      if (typeof additions === "number") {
        totalAdditions += additions;
      }
    }

    if (debt.status === "em_atraso") {
      overdueDebts += 1;
    }
  }

  let totalSettlementActiveProposals = 0;
  let totalPotentialSavings = 0;

  for (const proposal of activeProposalRows) {
    totalSettlementActiveProposals += proposal.proposedValue;
    totalPotentialSavings += proposal.currentValue - proposal.proposedValue;
  }

  const topDebts = [...activeDebtRows]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 3)
    .map((debt) => ({
      id: debt.id,
      name: debt.name,
      creditor: debt.creditor,
      currentValue: debt.currentValue,
    }));

  const bestOpportunities = activeProposalRows
    .map((proposal) => {
      const discountValue = proposal.currentValue - proposal.proposedValue;
      const discountPct = calcDiscountPct(proposal.currentValue, proposal.proposedValue) ?? 0;

      return {
        id: proposal.debtId,
        name: proposal.debtName,
        creditor: proposal.creditor,
        currentValue: proposal.currentValue,
        proposedValue: proposal.proposedValue,
        discountValue,
        discountPct,
      };
    })
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, 3);

  const fastestGrowingDebts = activeDebtRows
    .filter((debt) => typeof debt.originalValue === "number" && debt.originalValue > 0)
    .map((debt) => {
      const originalValue = debt.originalValue as number;
      const additionsValue = calcAdditions(debt.currentValue, originalValue) ?? 0;
      const growthPct = calcGrowthPct(debt.currentValue, originalValue) ?? 0;

      return {
        id: debt.id,
        name: debt.name,
        creditor: debt.creditor,
        currentValue: debt.currentValue,
        originalValue,
        additionsValue,
        growthPct,
      };
    })
    .sort((a, b) => b.growthPct - a.growthPct)
    .slice(0, 3);

  const highestRiskDebts = [...activeDebtRows]
    .sort(compareRiskSignals)
    .slice(0, 3)
    .map((debt) => ({
      id: debt.id,
      name: debt.name,
      creditor: debt.creditor,
      currentValue: debt.currentValue,
      priority: debt.priority,
      perceivedRisk: debt.perceivedRisk,
      priorityRank: getPriorityRank(debt.priority),
      perceivedRiskRank: getPerceivedRiskRank(debt.perceivedRisk),
    }));

  const expiringCandidates = activeProposalRows
    .filter((proposal) => proposal.expiresAt)
    .map((proposal) => {
      const expiresAt = proposal.expiresAt as string;
      const daysUntilExpiry = calculateDaysUntil(expiresAt);
      return {
        debtId: proposal.debtId,
        debtName: proposal.debtName,
        expiresAt,
        daysUntilExpiry,
      };
    })
    .filter((proposal) => proposal.daysUntilExpiry > 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const nextExpiringProposal = expiringCandidates[0] ?? null;

  return {
    activeDebts: activeDebtRows.length,
    totalDue,
    totalOriginal,
    totalAdditions,
    overdueDebts,
    debtsWithActiveProposal: new Set(activeProposalRows.map((row) => row.debtId)).size,
    totalSettlementActiveProposals,
    totalPotentialSavings,
    nextExpiringProposal,
    topDebts,
    bestOpportunities,
    fastestGrowingDebts,
    highestRiskDebts,
  };
}
