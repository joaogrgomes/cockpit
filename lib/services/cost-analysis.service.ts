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
  buildDefaultCostAnalysisBootstrapPlan,
  calculateCostAnalysisTotals,
  DEFAULT_COST_ANALYSIS_DEFINITIONS,
  DEFAULT_COST_ANALYSIS_SLUG,
  getDefaultCostAnalysisDefinitionBySlug,
  type CostAnalysisItemView,
  type DefaultCostAnalysisDefinition,
} from "@/lib/cost-analyses";
import type {
  CostAnalysis,
  CostAnalysisItem,
  CostAnalysisKind,
} from "@/types";

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

async function seedCostAnalysisDefinitionIfNeeded(definition: DefaultCostAnalysisDefinition) {
  const db = getDb();
  const existing = await db
    .select({ id: costAnalyses.id })
    .from(costAnalyses)
    .where(eq(costAnalyses.slug, definition.analysis.slug))
    .limit(1);

  let analysisId = existing[0]?.id ?? null;

  if (!analysisId) {
    const plan = buildDefaultCostAnalysisBootstrapPlan(definition, false);
    if (!plan) {
      return null;
    }

    const insertedAnalysis = await db
      .insert(costAnalyses)
      .values(plan.analysis)
      .returning({ id: costAnalyses.id });

    analysisId = insertedAnalysis[0]?.id ?? null;
  }

  if (!analysisId) {
    return null;
  }

  if (!existing[0]) {
    await db.insert(costAnalysisItems).values(
      definition.items.map((item) => ({
        ...item,
        costAnalysisId: analysisId,
      }))
    );
  }

  return analysisId;
}

async function ensureDefaultCostAnalysesSeeded() {
  await Promise.all(DEFAULT_COST_ANALYSIS_DEFINITIONS.map((definition) => seedCostAnalysisDefinitionIfNeeded(definition)));
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

async function getSuggestedNetIncomeCents(): Promise<number> {
  const currentMonth = getCurrentPeriodMonth();
  const incomes = await listMonthlyIncomes({
    periodMonth: currentMonth,
    isActive: "true",
  });

  return incomes.reduce((sum, income) => sum + income.amount, 0);
}

export function getDefaultCostAnalysisDefinitions(): DefaultCostAnalysisDefinition[] {
  return DEFAULT_COST_ANALYSIS_DEFINITIONS;
}

async function getCostAnalysisViewModelBySlug(slug: string): Promise<CostAnalysisViewModel | null> {
  const analysis = await getCostAnalysisBySlug(slug);
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

export async function getDefaultCostAnalyses(): Promise<CostAnalysisViewModel[]> {
  await ensureDefaultCostAnalysesSeeded();

  const viewModels = await Promise.all(
    DEFAULT_COST_ANALYSIS_DEFINITIONS.map((definition) =>
      getCostAnalysisViewModelBySlug(definition.analysis.slug)
    )
  );

  return viewModels.filter((viewModel): viewModel is CostAnalysisViewModel => Boolean(viewModel));
}

export async function getDefaultCarCostAnalysis(): Promise<CostAnalysisViewModel | null> {
  await ensureDefaultCostAnalysesSeeded();
  return getCostAnalysisViewModelBySlug(DEFAULT_COST_ANALYSIS_SLUG);
}

export async function getCostAnalysisBySlug(slug: string): Promise<CostAnalysisWithItems | null> {
  const db = getDb();
  let analysisRows = await db
    .select({ id: costAnalyses.id })
    .from(costAnalyses)
    .where(eq(costAnalyses.slug, slug))
    .limit(1);

  if (!analysisRows[0]) {
    const definition = getDefaultCostAnalysisDefinitionBySlug(slug);
    if (!definition) {
      return null;
    }

    const createdId = await seedCostAnalysisDefinitionIfNeeded(definition);
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
