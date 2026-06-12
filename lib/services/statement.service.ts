import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getCashFlowProjection, getCashFlowSettings } from "@/lib/services/cash-flow.service";
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
} from "@/lib/db/schema";
import { getMonthlyClosing } from "@/lib/services/monthly-closing.service";
import { getPreviousPeriodMonth } from "@/lib/cash-flow";
import {
  buildStatementResult,
  mapExpenseEntryRowToStatementItem,
  mapIncomeEntryRowToStatementItem,
  normalizeStatementPeriodMonth,
  type StatementResult,
  type StatementTypeFilter,
} from "@/lib/statement";

export type StatementByPeriodInput = {
  periodMonth: string;
  type?: StatementTypeFilter;
  category?: string | null;
  query?: string | null;
};

export async function getStatementOpeningBalance(periodMonth: string): Promise<number> {
  const settings = await getCashFlowSettings();
  const normalizedPeriodMonth = normalizeStatementPeriodMonth(periodMonth);
  const previousMonth = getPreviousPeriodMonth(normalizedPeriodMonth);

  if (previousMonth && (await getMonthlyClosing(previousMonth))) {
    const projection = await getCashFlowProjection(Number(normalizedPeriodMonth.slice(0, 4)));
    const previousMonthProjection = projection.months.find(
      (month) => month.periodMonth === previousMonth
    );

    if (previousMonthProjection) {
      return previousMonthProjection.closingBalance;
    }
  }

  const db = getDb();
  const periodStartDate = `${normalizedPeriodMonth}-01`;
  const settingsStartDate = `${settings.startMonth}-01`;

  if (normalizedPeriodMonth <= settings.startMonth) {
    return settings.initialBalance;
  }

  const [incomeRows, expenseRows] = await Promise.all([
    db
      .select({
        totalAmount: sql<number>`coalesce(sum(${monthlyIncomeEntries.amount}), 0)`,
      })
      .from(monthlyIncomeEntries)
      .where(
        and(
          sql`${monthlyIncomeEntries.receivedAt} >= ${settingsStartDate}`,
          sql`${monthlyIncomeEntries.receivedAt} < ${periodStartDate}`
        )
      ),
    db
      .select({
        totalAmount: sql<number>`coalesce(sum(${monthlyExpenseEntries.amount}), 0)`,
      })
      .from(monthlyExpenseEntries)
      .where(
        and(
          sql`${monthlyExpenseEntries.paidAt} >= ${settingsStartDate}`,
          sql`${monthlyExpenseEntries.paidAt} < ${periodStartDate}`
        )
      ),
  ]);

  const totalIncome = Number(incomeRows[0]?.totalAmount ?? 0);
  const totalExpense = Number(expenseRows[0]?.totalAmount ?? 0);

  return settings.initialBalance + totalIncome - totalExpense;
}

export async function getStatementByPeriod(
  input: StatementByPeriodInput
): Promise<StatementResult> {
  const db = getDb();
  const periodMonth = normalizeStatementPeriodMonth(input.periodMonth);

  const [incomeRows, expenseRows] = await Promise.all([
    db
      .select({
        id: monthlyIncomeEntries.id,
        monthlyIncomeId: monthlyIncomeEntries.monthlyIncomeId,
        entryName: monthlyIncomeEntries.name,
        entryCategory: monthlyIncomeEntries.category,
        monthlyIncomeName: monthlyIncomes.name,
        monthlyIncomeCategory: monthlyIncomes.category,
        periodMonth: monthlyIncomeEntries.periodMonth,
        amount: monthlyIncomeEntries.amount,
        receivedAt: monthlyIncomeEntries.receivedAt,
        paymentMethod: monthlyIncomeEntries.paymentMethod,
        notes: monthlyIncomeEntries.notes,
        createdAt: monthlyIncomeEntries.createdAt,
      })
      .from(monthlyIncomeEntries)
      .leftJoin(monthlyIncomes, eq(monthlyIncomeEntries.monthlyIncomeId, monthlyIncomes.id))
      .where(eq(monthlyIncomeEntries.periodMonth, periodMonth))
      .orderBy(desc(monthlyIncomeEntries.receivedAt), desc(monthlyIncomeEntries.createdAt)),
    db
      .select({
        id: monthlyExpenseEntries.id,
        monthlyExpenseId: monthlyExpenseEntries.monthlyExpenseId,
        entryName: monthlyExpenseEntries.name,
        entryCategory: monthlyExpenseEntries.category,
        entryExpenseType: monthlyExpenseEntries.expenseType,
        monthlyExpenseName: monthlyExpenses.name,
        monthlyExpenseCategory: monthlyExpenses.category,
        monthlyExpenseType: monthlyExpenses.expenseType,
        periodMonth: monthlyExpenseEntries.periodMonth,
        amount: monthlyExpenseEntries.amount,
        paidAt: monthlyExpenseEntries.paidAt,
        paymentMethod: monthlyExpenseEntries.paymentMethod,
        notes: monthlyExpenseEntries.notes,
        createdAt: monthlyExpenseEntries.createdAt,
      })
      .from(monthlyExpenseEntries)
      .leftJoin(monthlyExpenses, eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id))
      .where(eq(monthlyExpenseEntries.periodMonth, periodMonth))
      .orderBy(desc(monthlyExpenseEntries.paidAt), desc(monthlyExpenseEntries.createdAt)),
  ]);

  const items = [
    ...incomeRows.map((row) => mapIncomeEntryRowToStatementItem(row)),
    ...expenseRows.map((row) => mapExpenseEntryRowToStatementItem(row)),
  ];

  return buildStatementResult({
    periodMonth,
    items,
    type: input.type,
    category: input.category,
    query: input.query,
  });
}
