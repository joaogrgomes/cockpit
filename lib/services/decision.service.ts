import "server-only";

import { and, eq, or, sql } from "drizzle-orm";
import { getDaysUntilExpiry } from "@/lib/services/proposal.service";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";
import { buildExcludeClosedDebtStatusesCondition } from "@/lib/debt-status";
import {
  buildDecisionItems,
  splitDebtsByType,
  type DecisionBaseDebt,
  type DecisionItem,
} from "@/lib/decision-labels";

export type DecisionMetrics = {
  payoffItems: DecisionItem[];
  structuralItems: StructuralDecisionItem[];
};

export type StructuralDecisionItem = DecisionBaseDebt & {
  monthlyPayment: number | null;
  notes: string | null;
  activeProposal: {
    proposedValue: number;
    expiresAt: string | Date | null;
  } | null;
  daysUntilProposalExpiry: number | null;
};

export async function getDecisionMetrics(): Promise<DecisionMetrics> {
  const db = getDb();

  const activeDebtRows = await db
    .select({
      id: debts.id,
      name: debts.name,
      creditor: debts.creditor,
      debtType: debts.debtType,
      status: debts.status,
      currentValue: debts.currentValue,
      originalValue: debts.originalValue,
      monthlyPayment: debts.monthlyPayment,
      notes: debts.notes,
      lastUpdatedAt: debts.lastUpdatedAt,
      priority: debts.priority,
      perceivedRisk: debts.perceivedRisk,
    })
    .from(debts)
    .where(buildExcludeClosedDebtStatusesCondition());

  const activeProposalRows = await db
    .select({
      debtId: debtProposals.debtId,
      proposedValue: debtProposals.proposedValue,
      expiresAt: debtProposals.expiresAt,
    })
    .from(debtProposals)
    .innerJoin(debts, eq(debtProposals.debtId, debts.id))
    .where(
      and(
        eq(debtProposals.status, "ativa"),
        buildExcludeClosedDebtStatusesCondition(),
        or(
          sql`${debtProposals.expiresAt} IS NULL`,
          sql`${debtProposals.expiresAt} >= CURRENT_DATE`
        )
      )
    );

  const proposalByDebtId = new Map(
    activeProposalRows.map((row) => [
      row.debtId,
      {
        proposedValue: row.proposedValue,
        expiresAt: row.expiresAt,
      },
    ])
  );

  const { payoffDebts, structuralDebts } = splitDebtsByType(
    activeDebtRows.map((debt) => ({
      ...debt,
      debtType: debt.debtType as "payoff" | "structural",
      activeProposal: proposalByDebtId.get(debt.id) ?? null,
    }))
  );

  const payoffItems = buildDecisionItems(payoffDebts);
  const structuralItems = structuralDebts
    .map((debt) => {
      const activeProposal = proposalByDebtId.get(debt.id) ?? null;

      return {
        ...debt,
        activeProposal,
        daysUntilProposalExpiry: activeProposal?.expiresAt
          ? getDaysUntilExpiry(activeProposal.expiresAt)
          : null,
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);

  return { payoffItems, structuralItems };
}
