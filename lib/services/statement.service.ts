import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getCashFlowProjection } from "@/lib/services/cash-flow.service";
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
  statementImportRows,
} from "@/lib/db/schema";
import { getProjectionOpeningBalance } from "@/lib/cash-flow";
import {
  buildStatementResult,
  mapExpenseEntryRowToStatementItem,
  mapIncomeEntryRowToStatementItem,
  normalizeStatementPeriodMonth,
  type StatementResult,
  type StatementTypeFilter,
} from "@/lib/statement";
import type { StatementImportRowEntryType } from "@/types";

const STATEMENT_IMPORT_CREATED_ENTRY_TYPES: StatementImportRowEntryType[] = [
  "monthly_income_entry",
  "monthly_expense_entry",
];

export type StatementByPeriodInput = {
  periodMonth: string;
  type?: StatementTypeFilter;
  category?: string | null;
  query?: string | null;
};

export async function getStatementOpeningBalance(periodMonth: string): Promise<number> {
  const normalizedPeriodMonth = normalizeStatementPeriodMonth(periodMonth);
  const projection = await getCashFlowProjection(Number(normalizedPeriodMonth.slice(0, 4)));

  return getProjectionOpeningBalance(
    projection.months,
    normalizedPeriodMonth,
    projection.settings.initialBalance
  );
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

  const entryIds = [...incomeRows.map((row) => row.id), ...expenseRows.map((row) => row.id)];
  const importRowIndexByEntryKey = new Map<string, number>();

  if (entryIds.length > 0) {
    const importRows = await db
      .select({
        createdEntryType: statementImportRows.createdEntryType,
        createdEntryId: statementImportRows.createdEntryId,
        rowIndex: statementImportRows.rowIndex,
      })
      .from(statementImportRows)
      .where(
        and(
          inArray(statementImportRows.createdEntryId, entryIds),
          inArray(statementImportRows.createdEntryType, STATEMENT_IMPORT_CREATED_ENTRY_TYPES)
        )
      );

    for (const row of importRows) {
      if (!row.createdEntryId || !row.createdEntryType) {
        continue;
      }

      importRowIndexByEntryKey.set(`${row.createdEntryType}:${row.createdEntryId}`, row.rowIndex);
    }
  }

  const items = [
    ...incomeRows.map((row) => ({
      ...mapIncomeEntryRowToStatementItem(row),
      importRowIndex: importRowIndexByEntryKey.get(`monthly_income_entry:${row.id}`) ?? null,
    })),
    ...expenseRows.map((row) => ({
      ...mapExpenseEntryRowToStatementItem(row),
      importRowIndex: importRowIndexByEntryKey.get(`monthly_expense_entry:${row.id}`) ?? null,
    })),
  ];

  return buildStatementResult({
    periodMonth,
    items,
    type: input.type,
    category: input.category,
    query: input.query,
  });
}
