import "server-only";

import { desc, ne } from "drizzle-orm";
import { calcAdditions } from "@/lib/calculations";
import { getDb } from "@/lib/db";
import { debts } from "@/lib/db/schema";

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

  let totalDue = 0;
  let totalOriginal = 0;
  let totalAdditions = 0;
  let overdueDebts = 0;

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

  return {
    activeDebts: activeRows.length,
    totalDue,
    totalOriginal,
    totalAdditions,
    overdueDebts,
    topDebts,
  };
}
