import "server-only";

import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { calcAdditions } from "@/lib/calculations";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";

export type DashboardTopDebt = {
  id: string;
  name: string;
  creditor: string;
  currentValue: number;
};

export type DashboardMetrics = {
  activeDebts: number;
  totalDue: number;
  totalOriginal: number;
  totalAdditions: number;
  overdueDebts: number;
  totalSettlementActiveProposals: number;
  totalPotentialSavings: number;
  topDebts: DashboardTopDebt[];
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  const activeRows = await db
    .select({
      id: debts.id,
      name: debts.name,
      creditor: debts.creditor,
      status: debts.status,
      currentValue: debts.currentValue,
      originalValue: debts.originalValue,
    })
    .from(debts)
    .where(ne(debts.status, "quitada"));

  const topDebts = await db
    .select({
      id: debts.id,
      name: debts.name,
      creditor: debts.creditor,
      currentValue: debts.currentValue,
    })
    .from(debts)
    .where(ne(debts.status, "quitada"))
    .orderBy(desc(debts.currentValue))
    .limit(3);

  const activeProposalRows = await db
    .select({
      currentValue: debts.currentValue,
      proposedValue: debtProposals.proposedValue,
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
  let totalSettlementActiveProposals = 0;
  let totalPotentialSavings = 0;

  for (const row of activeRows) {
    totalDue += row.currentValue;

    if (typeof row.originalValue === "number") {
      totalOriginal += row.originalValue;
      const additions = calcAdditions(row.currentValue, row.originalValue);
      if (typeof additions === "number") {
        totalAdditions += additions;
      }
    }

    if (row.status === "em_atraso") {
      overdueDebts += 1;
    }
  }

  for (const row of activeProposalRows) {
    totalSettlementActiveProposals += row.proposedValue;
    totalPotentialSavings += row.currentValue - row.proposedValue;
  }

  return {
    activeDebts: activeRows.length,
    totalDue,
    totalOriginal,
    totalAdditions,
    overdueDebts,
    totalSettlementActiveProposals,
    totalPotentialSavings,
    topDebts,
  };
}
