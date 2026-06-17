import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { statementCategorizationRules } from "@/lib/db/schema";
import {
  findBestStatementCategorizationRule,
  normalizeStatementCategorizationPattern,
  parseStatementCategorizationRuleMatchType,
  type StatementCategorizationRuleMatchCandidate,
} from "@/lib/statement-categorization-rules";
import { type StatementImportDirection } from "@/lib/statement-import";
import { parseStatementImportDirection } from "@/lib/statement-import";
import type {
  ExpenseOccurrenceType,
  ExpenseType,
  StatementCategorizationRule,
  StatementCategorizationRuleMatchType,
  StatementImportRow,
} from "@/types";

type DbClient = ReturnType<typeof getDb>;
type StatementCategorizationRuleExecutor = Pick<DbClient, "select" | "insert" | "update">;

export type StatementImportSuggestion = {
  suggestedRuleId: string | null;
  suggestedMatchType: StatementCategorizationRuleMatchType | null;
  suggestedCategory: string | null;
  suggestedExpenseType: ExpenseType | null;
  suggestedOccurrenceType: ExpenseOccurrenceType | null;
  suggestedMonthlyExpenseId: string | null;
  suggestedMonthlyIncomeId: string | null;
  isSuggested: boolean;
};

export type StatementCategorizationRuleUpsertInput = {
  direction: StatementImportDirection;
  description: string;
  category: string;
  mode: "linked" | "one_time";
  monthlyExpenseId?: string | null;
  monthlyIncomeId?: string | null;
  expenseType?: ExpenseType | null;
  occurrenceType?: ExpenseOccurrenceType | null;
};

export async function listStatementCategorizationRules(): Promise<
  StatementCategorizationRuleMatchCandidate[]
> {
  const db = getDb();
  const rows = await db.select().from(statementCategorizationRules);
  return rows.map((row) => ({
    ...row,
    matchType: parseStatementCategorizationRuleMatchType(row.matchType),
  }));
}

export function applyStatementImportSuggestions(
  rows: StatementImportRow[],
  rules: StatementCategorizationRuleMatchCandidate[]
): StatementImportRow[] {
  return rows.map((row) => {
    const direction = parseStatementImportDirection(row.direction);
    const match = findBestStatementCategorizationRule({
      description: row.description,
      direction,
      rules,
    });

    if (!match) {
      return {
        ...row,
        suggestedRuleId: null,
        suggestedMatchType: null,
        suggestedCategory: null,
        suggestedExpenseType: null,
        suggestedOccurrenceType: null,
        suggestedMonthlyExpenseId: null,
        suggestedMonthlyIncomeId: null,
        isSuggested: false,
      };
    }

    return {
      ...row,
      suggestedRuleId: match.id,
      suggestedMatchType: match.matchType,
      suggestedCategory: match.category,
      suggestedExpenseType: match.expenseType as ExpenseType | null,
      suggestedOccurrenceType: match.occurrenceType as ExpenseOccurrenceType | null,
      suggestedMonthlyExpenseId: match.monthlyExpenseId,
      suggestedMonthlyIncomeId: match.monthlyIncomeId,
      isSuggested: true,
    };
  });
}

function buildRuleLookupPredicate(input: {
  direction: StatementImportDirection;
  normalizedPattern: string;
}) {
  return and(
    eq(statementCategorizationRules.direction, input.direction),
    eq(statementCategorizationRules.matchType, "exact"),
    eq(statementCategorizationRules.normalizedPattern, input.normalizedPattern)
  );
}

export async function upsertStatementCategorizationRuleFromReview(
  db: StatementCategorizationRuleExecutor,
  input: StatementCategorizationRuleUpsertInput
): Promise<StatementCategorizationRule | null> {
  const normalizedPattern = normalizeStatementCategorizationPattern(input.description);
  if (!normalizedPattern || !input.category.trim()) {
    return null;
  }

  if (input.mode === "linked") {
    if (!input.monthlyExpenseId && !input.monthlyIncomeId) {
      return null;
    }
  } else if (input.direction === "expense") {
    if (!input.expenseType || !input.occurrenceType) {
      return null;
    }
  }

  const [existing] = await db
    .select()
    .from(statementCategorizationRules)
    .where(buildRuleLookupPredicate({ direction: input.direction, normalizedPattern }))
    .limit(1);

  const nextValues = {
    pattern: input.description.trim(),
    normalizedPattern,
    matchType: "exact" as const,
    direction: input.direction,
    category: input.category,
    expenseType: input.mode === "linked" ? null : input.direction === "expense" ? input.expenseType ?? null : null,
    occurrenceType:
      input.mode === "linked" ? null : input.direction === "expense" ? input.occurrenceType ?? null : null,
    monthlyExpenseId: input.direction === "expense" && input.mode === "linked" ? input.monthlyExpenseId ?? null : null,
    monthlyIncomeId: input.direction === "income" && input.mode === "linked" ? input.monthlyIncomeId ?? null : null,
    usageCount: 1,
    lastUsedAt: sql`now()`,
  };

  if (!existing) {
    const inserted = await db
      .insert(statementCategorizationRules)
      .values(nextValues)
      .returning();

    return inserted[0] ?? null;
  }

  const updated = await db
    .update(statementCategorizationRules)
    .set({
      ...nextValues,
      usageCount: sql`${statementCategorizationRules.usageCount} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(statementCategorizationRules.id, existing.id))
    .returning();

  return updated[0] ?? null;
}
