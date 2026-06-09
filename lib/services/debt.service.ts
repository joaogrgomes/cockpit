import "server-only";

import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";
import type { Debt, NewDebt } from "@/types";
import { buildExcludeArchivedDebtStatusesCondition } from "@/lib/debt-status";

export type DebtListFilters = {
  status?: string;
  type?: string;
  sort?: "current_desc" | "current_asc";
  showArchived?: boolean;
};

export type DebtListItem = Debt & {
  hasActiveProposal: boolean;
};

export async function listDebts(filters: DebtListFilters = {}): Promise<DebtListItem[]> {
  const db = getDb();
  const whereConditions = [];

  if (filters.status) {
    whereConditions.push(eq(debts.status, filters.status));
  }

  if (filters.type) {
    whereConditions.push(eq(debts.type, filters.type));
  }

  if (!filters.status && !filters.showArchived) {
    whereConditions.push(buildExcludeArchivedDebtStatusesCondition());
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const orderCurrentValue =
    filters.sort === "current_asc" ? asc(debts.currentValue) : desc(debts.currentValue);

  const query = db
    .select({
      ...getTableColumns(debts),
      hasActiveProposal: sql<boolean>`
        exists (
          select 1
          from ${debtProposals} dp
          where dp.debt_id = ${debts.id}
            and dp.status = 'ativa'
            and (dp.expires_at is null or dp.expires_at >= CURRENT_DATE)
            and ${debts.status} not in ('quitada','aguardando_baixa','baixada','arquivada')
        )
      `,
    })
    .from(debts)
    .orderBy(orderCurrentValue, desc(debts.lastUpdatedAt));

  if (!whereClause) {
    return query;
  }

  return db
    .select({
      ...getTableColumns(debts),
      hasActiveProposal: sql<boolean>`
        exists (
          select 1
          from ${debtProposals} dp
          where dp.debt_id = ${debts.id}
            and dp.status = 'ativa'
            and (dp.expires_at is null or dp.expires_at >= CURRENT_DATE)
            and ${debts.status} not in ('quitada','aguardando_baixa','baixada','arquivada')
        )
      `,
    })
    .from(debts)
    .where(whereClause)
    .orderBy(orderCurrentValue, desc(debts.lastUpdatedAt));
}

export async function getDebtById(id: string): Promise<Debt | null> {
  const db = getDb();
  const result = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createDebt(input: NewDebt): Promise<Debt> {
  const db = getDb();
  const result = await db.insert(debts).values(input).returning();
  return result[0];
}

export async function updateDebt(id: string, input: Partial<NewDebt>): Promise<Debt | null> {
  const db = getDb();
  const result = await db
    .update(debts)
    .set({
      ...input,
      lastUpdatedAt: sql`now()`,
    })
    .where(eq(debts.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteDebt(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(debts).where(eq(debts.id, id)).returning({ id: debts.id });
  return result.length > 0;
}
