import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { monthlyExpenses } from "@/lib/db/schema";
import type { MonthlyExpense, NewMonthlyExpense } from "@/types";

export type MonthlyExpenseFilters = {
  category?: string;
  expenseType?: string;
  isActive?: "true" | "false";
  paymentMethod?: string;
  sort?: "due_day" | "amount_desc" | "category";
};

export type MonthlyExpenseSummaryRow = {
  category: string;
  fixed: number;
  variable: number;
  total: number;
};

export type MonthlyExpenseSummary = {
  activeCount: number;
  totalMonthlyActive: number;
  totalFixed: number;
  totalVariable: number;
  nextDue: {
    dueDay: number;
    name: string;
    amount: number;
  } | null;
  byCategory: MonthlyExpenseSummaryRow[];
};

export type MonthlyExpenseCreateInput = Pick<
  NewMonthlyExpense,
  "name" | "category" | "amount" | "expenseType" | "paymentMethod" | "dueDay" | "dueLabel" | "notes" | "isActive"
>;

export type MonthlyExpenseUpdateInput = Partial<MonthlyExpenseCreateInput>;

export async function listMonthlyExpenses(
  filters: MonthlyExpenseFilters = {}
): Promise<MonthlyExpense[]> {
  const db = getDb();
  const whereConditions = [];

  if (filters.category) {
    whereConditions.push(eq(monthlyExpenses.category, filters.category));
  }

  if (filters.expenseType) {
    whereConditions.push(eq(monthlyExpenses.expenseType, filters.expenseType));
  }

  if (filters.paymentMethod) {
    whereConditions.push(eq(monthlyExpenses.paymentMethod, filters.paymentMethod));
  }

  if (filters.isActive === "true") {
    whereConditions.push(eq(monthlyExpenses.isActive, true));
  } else if (filters.isActive === "false") {
    whereConditions.push(eq(monthlyExpenses.isActive, false));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const baseQuery = db.select().from(monthlyExpenses);

  if (filters.sort === "amount_desc") {
    if (!whereClause) {
      return baseQuery.orderBy(desc(monthlyExpenses.amount), asc(monthlyExpenses.name));
    }

    return db
      .select()
      .from(monthlyExpenses)
      .where(whereClause)
      .orderBy(desc(monthlyExpenses.amount), asc(monthlyExpenses.name));
  }

  if (filters.sort === "category") {
    if (!whereClause) {
      return baseQuery.orderBy(asc(monthlyExpenses.category), desc(monthlyExpenses.amount));
    }

    return db
      .select()
      .from(monthlyExpenses)
      .where(whereClause)
      .orderBy(asc(monthlyExpenses.category), desc(monthlyExpenses.amount));
  }

  if (!whereClause) {
    return baseQuery.orderBy(
      sql`case when ${monthlyExpenses.dueDay} is null then 1 else 0 end`,
      asc(monthlyExpenses.dueDay),
      desc(monthlyExpenses.amount)
    );
  }

  return db
    .select()
    .from(monthlyExpenses)
    .where(whereClause)
    .orderBy(
      sql`case when ${monthlyExpenses.dueDay} is null then 1 else 0 end`,
      asc(monthlyExpenses.dueDay),
      desc(monthlyExpenses.amount)
    );
}

export async function getMonthlyExpenseById(id: string): Promise<MonthlyExpense | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createMonthlyExpense(
  input: MonthlyExpenseCreateInput
): Promise<MonthlyExpense> {
  const db = getDb();
  const result = await db
    .insert(monthlyExpenses)
    .values({
      name: input.name,
      category: input.category,
      amount: input.amount,
      expenseType: input.expenseType,
      paymentMethod: input.paymentMethod ?? null,
      dueDay: input.dueDay ?? null,
      dueLabel: input.dueLabel ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();

  return result[0];
}

export async function updateMonthlyExpense(
  id: string,
  input: MonthlyExpenseUpdateInput
): Promise<MonthlyExpense | null> {
  const db = getDb();

  const result = await db
    .update(monthlyExpenses)
    .set({
      ...input,
      updatedAt: sql`now()`,
    })
    .where(eq(monthlyExpenses.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteMonthlyExpense(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(monthlyExpenses)
    .where(eq(monthlyExpenses.id, id))
    .returning({ id: monthlyExpenses.id });

  return result.length > 0;
}

export async function toggleMonthlyExpenseActive(
  id: string
): Promise<MonthlyExpense | null> {
  const db = getDb();

  const current = await getMonthlyExpenseById(id);
  if (!current) return null;

  const result = await db
    .update(monthlyExpenses)
    .set({
      isActive: !current.isActive,
      updatedAt: sql`now()`,
    })
    .where(eq(monthlyExpenses.id, id))
    .returning();

  return result[0] ?? null;
}

export async function getMonthlyExpenseSummary(): Promise<MonthlyExpenseSummary> {
  const db = getDb();

  const activeRows = await db
    .select()
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.isActive, true));

  let totalMonthlyActive = 0;
  let totalFixed = 0;
  let totalVariable = 0;
  let nextDue: MonthlyExpenseSummary["nextDue"] = null;

  const byCategoryMap = new Map<string, MonthlyExpenseSummaryRow>();

  for (const expense of activeRows) {
    totalMonthlyActive += expense.amount;

    if (expense.expenseType === "fixo") {
      totalFixed += expense.amount;
    } else {
      totalVariable += expense.amount;
    }

    if (typeof expense.dueDay === "number") {
      if (!nextDue || expense.dueDay < nextDue.dueDay) {
        nextDue = {
          dueDay: expense.dueDay,
          name: expense.name,
          amount: expense.amount,
        };
      }
    }

    const previous =
      byCategoryMap.get(expense.category) ??
      ({
        category: expense.category,
        fixed: 0,
        variable: 0,
        total: 0,
      } satisfies MonthlyExpenseSummaryRow);

    if (expense.expenseType === "fixo") {
      previous.fixed += expense.amount;
    } else {
      previous.variable += expense.amount;
    }

    previous.total += expense.amount;
    byCategoryMap.set(expense.category, previous);
  }

  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.total - a.total);

  return {
    activeCount: activeRows.length,
    totalMonthlyActive,
    totalFixed,
    totalVariable,
    nextDue,
    byCategory,
  };
}
