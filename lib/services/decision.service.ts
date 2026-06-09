import "server-only";

import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";
import { buildExcludeClosedDebtStatusesCondition } from "@/lib/debt-status";
import { buildDecisionItems, type DecisionItem } from "@/lib/decision-labels";

export type DecisionMetrics = {
  items: DecisionItem[];
};

export async function getDecisionMetrics(): Promise<DecisionMetrics> {
  const db = getDb();

  const activeDebtRows = await db
    .select({
      id: debts.id,
      name: debts.name,
      creditor: debts.creditor,
      status: debts.status,
      currentValue: debts.currentValue,
      originalValue: debts.originalValue,
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

  const items = buildDecisionItems(
    activeDebtRows.map((debt) => ({
      ...debt,
      activeProposal: proposalByDebtId.get(debt.id) ?? null,
    }))
  );

  return { items };
}
