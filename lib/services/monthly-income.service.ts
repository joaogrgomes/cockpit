import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { monthlyIncomes } from "@/lib/db/schema";
import type { MonthlyIncome, NewMonthlyIncome } from "@/types";

export type MonthlyIncomeFilters = {
  category?: string;
  isActive?: "true" | "false";
  paymentMethod?: string;
  sort?: "expected_day" | "amount_desc" | "category";
};

export type MonthlyIncomeSummaryRow = {
  category: string;
  total: number;
};

export type MonthlyIncomeSummary = {
  activeCount: number;
  totalPlannedActive: number;
  nextExpected: {
    expectedDay: number;
    name: string;
    amount: number;
  } | null;
  byCategory: MonthlyIncomeSummaryRow[];
};

export type MonthlyIncomeCreateInput = Pick<
  NewMonthlyIncome,
  "name" | "category" | "amount" | "expectedDay" | "paymentMethod" | "notes" | "isActive"
>;

export type MonthlyIncomeUpdateInput = Partial<MonthlyIncomeCreateInput>;

export async function listMonthlyIncomes(
  filters: MonthlyIncomeFilters = {}
): Promise<MonthlyIncome[]> {
  const db = getDb();
  const whereConditions = [];

  if (filters.category) {
    whereConditions.push(eq(monthlyIncomes.category, filters.category));
  }

  if (filters.paymentMethod) {
    whereConditions.push(eq(monthlyIncomes.paymentMethod, filters.paymentMethod));
  }

  if (filters.isActive === "true") {
    whereConditions.push(eq(monthlyIncomes.isActive, true));
  } else if (filters.isActive === "false") {
    whereConditions.push(eq(monthlyIncomes.isActive, false));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const baseQuery = db.select().from(monthlyIncomes);

  if (filters.sort === "amount_desc") {
    if (!whereClause) {
      return baseQuery.orderBy(desc(monthlyIncomes.amount), asc(monthlyIncomes.name));
    }

    return db
      .select()
      .from(monthlyIncomes)
      .where(whereClause)
      .orderBy(desc(monthlyIncomes.amount), asc(monthlyIncomes.name));
  }

  if (filters.sort === "category") {
    if (!whereClause) {
      return baseQuery.orderBy(asc(monthlyIncomes.category), desc(monthlyIncomes.amount));
    }

    return db
      .select()
      .from(monthlyIncomes)
      .where(whereClause)
      .orderBy(asc(monthlyIncomes.category), desc(monthlyIncomes.amount));
  }

  if (!whereClause) {
    return baseQuery.orderBy(
      sql`case when ${monthlyIncomes.expectedDay} is null then 1 else 0 end`,
      asc(monthlyIncomes.expectedDay),
      desc(monthlyIncomes.amount)
    );
  }

  return db
    .select()
    .from(monthlyIncomes)
    .where(whereClause)
    .orderBy(
      sql`case when ${monthlyIncomes.expectedDay} is null then 1 else 0 end`,
      asc(monthlyIncomes.expectedDay),
      desc(monthlyIncomes.amount)
    );
}

export async function getMonthlyIncomeById(id: string): Promise<MonthlyIncome | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(monthlyIncomes)
    .where(eq(monthlyIncomes.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createMonthlyIncome(
  input: MonthlyIncomeCreateInput
): Promise<MonthlyIncome> {
  const db = getDb();
  const result = await db
    .insert(monthlyIncomes)
    .values({
      name: input.name,
      category: input.category,
      amount: input.amount,
      expectedDay: input.expectedDay ?? null,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();

  return result[0];
}

export async function updateMonthlyIncome(
  id: string,
  input: MonthlyIncomeUpdateInput
): Promise<MonthlyIncome | null> {
  const db = getDb();
  const result = await db
    .update(monthlyIncomes)
    .set({
      ...input,
      updatedAt: sql`now()`,
    })
    .where(eq(monthlyIncomes.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteMonthlyIncome(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(monthlyIncomes)
    .where(eq(monthlyIncomes.id, id))
    .returning({ id: monthlyIncomes.id });
  return result.length > 0;
}

export async function toggleMonthlyIncomeActive(
  id: string
): Promise<MonthlyIncome | null> {
  const db = getDb();
  const current = await getMonthlyIncomeById(id);
  if (!current) return null;

  const result = await db
    .update(monthlyIncomes)
    .set({
      isActive: !current.isActive,
      updatedAt: sql`now()`,
    })
    .where(eq(monthlyIncomes.id, id))
    .returning();

  return result[0] ?? null;
}

export async function getMonthlyIncomeSummary(): Promise<MonthlyIncomeSummary> {
  const db = getDb();
  const activeRows = await db
    .select()
    .from(monthlyIncomes)
    .where(eq(monthlyIncomes.isActive, true));

  let totalPlannedActive = 0;
  let nextExpected: MonthlyIncomeSummary["nextExpected"] = null;
  const byCategoryMap = new Map<string, MonthlyIncomeSummaryRow>();

  for (const income of activeRows) {
    totalPlannedActive += income.amount;

    if (typeof income.expectedDay === "number") {
      if (!nextExpected || income.expectedDay < nextExpected.expectedDay) {
        nextExpected = {
          expectedDay: income.expectedDay,
          name: income.name,
          amount: income.amount,
        };
      }
    }

    const current = byCategoryMap.get(income.category) ?? {
      category: income.category,
      total: 0,
    };
    current.total += income.amount;
    byCategoryMap.set(income.category, current);
  }

  return {
    activeCount: activeRows.length,
    totalPlannedActive,
    nextExpected,
    byCategory: [...byCategoryMap.values()].sort((a, b) => b.total - a.total),
  };
}
