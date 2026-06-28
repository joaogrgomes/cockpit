import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import {
  buildBudgetAreaModelFromSettings,
  calculateBudgetAreasAnalysis,
  getDefaultBudgetAreaSettings,
  sumBudgetAreaBaseIncome,
  type BudgetAreaExpenseItem,
  type BudgetAreaIncomeItem,
  type BudgetAreaModel,
  type BudgetAreaSettingsInput,
  type BudgetAreasAnalysis,
} from "@/lib/budget-areas";
import { getDb } from "@/lib/db";
import { budgetAreaSettings } from "@/lib/db/schema";
import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import { listMonthlyIncomes } from "@/lib/services/monthly-income.service";
import type { BudgetAreaSettings } from "@/types";

export type BudgetAreaSettingsView = BudgetAreaSettingsInput;

export type BudgetAreasViewModel = {
  referenceMonth: string;
  settings: BudgetAreaSettingsView;
  calculatedBaseIncomeCents: number;
  expenseItems: BudgetAreaExpenseItem[];
  model: BudgetAreaModel;
  defaultAnalysis: BudgetAreasAnalysis;
};

function toSettingsView(settings: BudgetAreaSettings | null): BudgetAreaSettingsView {
  if (!settings) {
    return getDefaultBudgetAreaSettings();
  }

  return {
    baseIncomeCents: settings.baseIncomeCents,
    needsPercent: settings.needsPercent,
    debtPaymentPercent: settings.debtPaymentPercent,
    emergencyReservePercent: settings.emergencyReservePercent,
    flexiblePercent: settings.flexiblePercent,
  };
}

async function getFirstBudgetAreaSettingsRow(): Promise<BudgetAreaSettings | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(budgetAreaSettings)
    .orderBy(asc(budgetAreaSettings.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function getBudgetAreaSettings(): Promise<BudgetAreaSettingsView> {
  const db = getDb();
  const current = await getFirstBudgetAreaSettingsRow();
  if (current) {
    return toSettingsView(current);
  }

  const defaults = getDefaultBudgetAreaSettings();
  const created = await db
    .insert(budgetAreaSettings)
    .values({
      scope: "global",
      ...defaults,
    })
    .returning();

  return toSettingsView(created[0] ?? null);
}

export async function upsertBudgetAreaSettings(
  input: BudgetAreaSettingsInput
): Promise<BudgetAreaSettingsView> {
  const db = getDb();
  const current = await getFirstBudgetAreaSettingsRow();

  if (current) {
    const updated = await db
      .update(budgetAreaSettings)
      .set({
        scope: "global",
        baseIncomeCents: input.baseIncomeCents,
        needsPercent: input.needsPercent,
        debtPaymentPercent: input.debtPaymentPercent,
        emergencyReservePercent: input.emergencyReservePercent,
        flexiblePercent: input.flexiblePercent,
        updatedAt: sql`now()`,
      })
      .where(eq(budgetAreaSettings.id, current.id))
      .returning();

    return toSettingsView(updated[0] ?? null);
  }

  const created = await db
    .insert(budgetAreaSettings)
    .values({
      scope: "global",
      baseIncomeCents: input.baseIncomeCents,
      needsPercent: input.needsPercent,
      debtPaymentPercent: input.debtPaymentPercent,
      emergencyReservePercent: input.emergencyReservePercent,
      flexiblePercent: input.flexiblePercent,
    })
    .returning();

  return toSettingsView(created[0] ?? null);
}

export async function getBudgetAreasViewModel(
  referenceMonth: string
): Promise<BudgetAreasViewModel> {
  const [settings, monthlyIncomes, monthlyExpenses] = await Promise.all([
    getBudgetAreaSettings(),
    listMonthlyIncomes({
      periodMonth: referenceMonth,
      isActive: "true",
    }),
    listMonthlyExpenses({
      periodMonth: referenceMonth,
      isActive: "true",
    }),
  ]);

  const incomeItems: BudgetAreaIncomeItem[] = monthlyIncomes.map((income) => ({
    id: income.id,
    name: income.name,
    category: income.category,
    amount: income.amount,
    startMonth: income.startMonth,
    endMonth: income.endMonth,
  }));

  const calculatedBaseIncomeCents = sumBudgetAreaBaseIncome(incomeItems, referenceMonth);
  const expenseItems: BudgetAreaExpenseItem[] = monthlyExpenses.map((expense) => ({
    id: expense.id,
    name: expense.name,
    category: expense.category,
    expenseType: expense.expenseType,
    amount: expense.amount,
    startMonth: expense.startMonth,
    endMonth: expense.endMonth,
  }));

  const model = buildBudgetAreaModelFromSettings(settings);

  return {
    referenceMonth,
    settings,
    calculatedBaseIncomeCents,
    expenseItems,
    model,
    defaultAnalysis: calculateBudgetAreasAnalysis({
      referenceMonth,
      baseIncomeCents: settings.baseIncomeCents,
      expenseItems,
      model,
    }),
  };
}
