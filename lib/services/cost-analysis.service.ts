import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getCurrentPeriodMonth } from "@/lib/recurrence-period";
import { getDb } from "@/lib/db";
import {
  costAnalyses,
  costAnalysisItems,
  futureExpensePayables,
} from "@/lib/db/schema";
import { listMonthlyIncomes } from "@/lib/services/monthly-income.service";
import {
  calculateCostAnalysisTotals,
  type CostAnalysisItemView,
} from "@/lib/cost-analyses";
import type {
  CostAnalysis,
  CostAnalysisItem,
  CostAnalysisKind,
  NewCostAnalysis,
  NewCostAnalysisItem,
} from "@/types";

export const DEFAULT_COST_ANALYSIS_SLUG = "carro";

export type CostAnalysisWithItems = CostAnalysis & {
  items: CostAnalysisItem[];
};

export type CostAnalysisViewModel = {
  analysis: CostAnalysisWithItems;
  items: CostAnalysisItemView[];
  totals: ReturnType<typeof calculateCostAnalysisTotals>;
  suggestedNetIncomeCents: number;
  scheduledCountsByItemId: Record<string, number>;
};

const DEFAULT_CAR_COST_ANALYSIS: NewCostAnalysis = {
  name: "Custo total do carro",
  slug: DEFAULT_COST_ANALYSIS_SLUG,
  description: "Análise do custo mensal e anual de manter o carro.",
  baseNetIncomeCents: 0,
  baseGrossIncomeCents: 0,
};

const DEFAULT_CAR_COST_ANALYSIS_ITEMS: Array<
  Omit<NewCostAnalysisItem, "costAnalysisId">
> = [
  { name: "Financiamento", monthlyAmountCents: 60_500, costKind: "cash", notes: null, sortOrder: 0 },
  { name: "Depreciação", monthlyAmountCents: 13_000, costKind: "economic", notes: null, sortOrder: 1 },
  { name: "Combustível", monthlyAmountCents: 65_000, costKind: "cash", notes: null, sortOrder: 2 },
  { name: "Estacionamento", monthlyAmountCents: 2_500, costKind: "cash", notes: null, sortOrder: 3 },
  { name: "IPVA", monthlyAmountCents: 18_000, costKind: "provision", notes: null, sortOrder: 4 },
  { name: "Custo de oportunidade", monthlyAmountCents: 0, costKind: "economic", notes: null, sortOrder: 5 },
  { name: "Seguro", monthlyAmountCents: 20_300, costKind: "provision", notes: null, sortOrder: 6 },
  { name: "Pedágio", monthlyAmountCents: 500, costKind: "cash", notes: null, sortOrder: 7 },
  { name: "Manutenção", monthlyAmountCents: 18_000, costKind: "provision", notes: null, sortOrder: 8 },
  { name: "Lavagem", monthlyAmountCents: 6_000, costKind: "cash", notes: null, sortOrder: 9 },
];

async function getSuggestedNetIncomeCents(): Promise<number> {
  const currentMonth = getCurrentPeriodMonth();
  const incomes = await listMonthlyIncomes({
    periodMonth: currentMonth,
    isActive: "true",
  });

  return incomes.reduce((sum, income) => sum + income.amount, 0);
}

async function seedDefaultCarAnalysisIfNeeded() {
  const db = getDb();
  const existing = await db
    .select({ id: costAnalyses.id })
    .from(costAnalyses)
    .where(eq(costAnalyses.slug, DEFAULT_COST_ANALYSIS_SLUG))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const suggestedNetIncomeCents = await getSuggestedNetIncomeCents();

  return db.transaction(async (tx) => {
    const insertedAnalysis = await tx
      .insert(costAnalyses)
      .values({
        ...DEFAULT_CAR_COST_ANALYSIS,
        baseNetIncomeCents: suggestedNetIncomeCents,
      })
      .returning({ id: costAnalyses.id });

    const analysisId = insertedAnalysis[0]?.id;
    if (!analysisId) {
      return null;
    }

    await tx.insert(costAnalysisItems).values(
      DEFAULT_CAR_COST_ANALYSIS_ITEMS.map((item) => ({
        ...item,
        costAnalysisId: analysisId,
      }))
    );

    return analysisId;
  });
}

export async function getCostAnalysisItemById(
  itemId: string
): Promise<CostAnalysisItem | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(costAnalysisItems)
    .where(eq(costAnalysisItems.id, itemId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getCostAnalysisById(
  analysisId: string
): Promise<CostAnalysisWithItems | null> {
  const db = getDb();
  const analysisRows = await db
    .select()
    .from(costAnalyses)
    .where(eq(costAnalyses.id, analysisId))
    .limit(1);

  const analysis = analysisRows[0];
  if (!analysis) return null;

  const items = await db
    .select()
    .from(costAnalysisItems)
    .where(eq(costAnalysisItems.costAnalysisId, analysisId))
    .orderBy(asc(costAnalysisItems.sortOrder), asc(costAnalysisItems.createdAt));

  return {
    ...analysis,
    items,
  };
}

export async function getCostAnalysisBySlug(slug: string): Promise<CostAnalysisWithItems | null> {
  const db = getDb();
  let analysisRows = await db
    .select({ id: costAnalyses.id })
    .from(costAnalyses)
    .where(eq(costAnalyses.slug, slug))
    .limit(1);

  if (!analysisRows[0] && slug === DEFAULT_COST_ANALYSIS_SLUG) {
    const createdId = await seedDefaultCarAnalysisIfNeeded();
    if (createdId) {
      return getCostAnalysisById(createdId);
    }

    analysisRows = await db
      .select({ id: costAnalyses.id })
      .from(costAnalyses)
      .where(eq(costAnalyses.slug, slug))
      .limit(1);
  }

  if (!analysisRows[0]) {
    return null;
  }

  return getCostAnalysisById(analysisRows[0].id);
}

export async function getDefaultCarCostAnalysis(): Promise<CostAnalysisViewModel | null> {
  const analysis = await getCostAnalysisBySlug(DEFAULT_COST_ANALYSIS_SLUG);
  if (!analysis) return null;

  const suggestedNetIncomeCents = await getSuggestedNetIncomeCents();
  const totals = calculateCostAnalysisTotals(
    analysis.items,
    analysis.baseNetIncomeCents,
    analysis.baseGrossIncomeCents
  );

  const scheduledCountsRows = await getDb()
    .select({
      costAnalysisItemId: futureExpensePayables.costAnalysisItemId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(futureExpensePayables)
    .where(sql`${futureExpensePayables.costAnalysisItemId} IS NOT NULL`)
    .groupBy(futureExpensePayables.costAnalysisItemId);

  const scheduledCountsByItemId = scheduledCountsRows.reduce<Record<string, number>>((acc, row) => {
    if (!row.costAnalysisItemId) return acc;
    acc[row.costAnalysisItemId] = Number(row.count ?? 0);
    return acc;
  }, {});

  return {
    analysis,
    items: totals.items,
    totals,
    suggestedNetIncomeCents,
    scheduledCountsByItemId,
  };
}

export async function upsertCostAnalysisBaseIncome(input: {
  analysisId: string;
  baseNetIncomeCents: number;
  baseGrossIncomeCents: number;
}): Promise<CostAnalysis | null> {
  const db = getDb();

  const result = await db
    .update(costAnalyses)
    .set({
      baseNetIncomeCents: input.baseNetIncomeCents,
      baseGrossIncomeCents: input.baseGrossIncomeCents,
      updatedAt: sql`now()`,
    })
    .where(eq(costAnalyses.id, input.analysisId))
    .returning();

  return result[0] ?? null;
}

export async function createCostAnalysisItem(input: {
  analysisId: string;
  name: string;
  monthlyAmountCents: number;
  costKind: CostAnalysisKind;
  notes?: string | null;
}): Promise<CostAnalysisItem | null> {
  const db = getDb();

  const lastItem = await db
    .select({ sortOrder: costAnalysisItems.sortOrder })
    .from(costAnalysisItems)
    .where(eq(costAnalysisItems.costAnalysisId, input.analysisId))
    .orderBy(desc(costAnalysisItems.sortOrder), desc(costAnalysisItems.createdAt))
    .limit(1);

  const nextSortOrder = (lastItem[0]?.sortOrder ?? -1) + 1;

  const result = await db
    .insert(costAnalysisItems)
    .values({
      costAnalysisId: input.analysisId,
      name: input.name,
      monthlyAmountCents: input.monthlyAmountCents,
      costKind: input.costKind,
      notes: input.notes ?? null,
      sortOrder: nextSortOrder,
    })
    .returning();

  return result[0] ?? null;
}

export async function updateCostAnalysisItem(input: {
  itemId: string;
  analysisId: string;
  name: string;
  monthlyAmountCents: number;
  costKind: CostAnalysisKind;
  notes?: string | null;
}): Promise<CostAnalysisItem | null> {
  const db = getDb();

  const result = await db
    .update(costAnalysisItems)
    .set({
      name: input.name,
      monthlyAmountCents: input.monthlyAmountCents,
      costKind: input.costKind,
      notes: input.notes ?? null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(costAnalysisItems.id, input.itemId),
        eq(costAnalysisItems.costAnalysisId, input.analysisId)
      )
    )
    .returning();

  return result[0] ?? null;
}

export async function deleteCostAnalysisItem(input: {
  itemId: string;
  analysisId: string;
}): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(costAnalysisItems)
    .where(
      and(
        eq(costAnalysisItems.id, input.itemId),
        eq(costAnalysisItems.costAnalysisId, input.analysisId)
      )
    )
    .returning({ id: costAnalysisItems.id });

  return result.length > 0;
}
