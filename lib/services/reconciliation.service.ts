import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getCurrentPeriodMonth } from "@/lib/cash-flow";
import { getDb } from "@/lib/db";
import {
  futureExpensePayables,
  futureIncomeReceivables,
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
} from "@/lib/db/schema";
import { normalizeDateOnly } from "@/lib/date-utils";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import { getIncomeCategoryLabel } from "@/lib/incomes";
import {
  buildReconciliationSummary,
  getReconciliationItemHref,
  getReconciliationOriginLabel,
  type ReconciliationItem,
  type ReconciliationSummary,
} from "@/lib/reconciliation";
import { getCashFlowSettings } from "@/lib/services/cash-flow.service";

type ReconciliationIncomeRow = {
  id: string;
  monthlyIncomeId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  monthlyIncomeName: string | null;
  monthlyIncomeCategory: string | null;
  periodMonth: string;
  amount: number;
  receivedAt: string | Date;
  notes: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  futureIncomeId: string | null;
};

type ReconciliationExpenseRow = {
  id: string;
  monthlyExpenseId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  entryExpenseType: string | null;
  monthlyExpenseName: string | null;
  monthlyExpenseCategory: string | null;
  monthlyExpenseType: string | null;
  periodMonth: string;
  amount: number;
  paidAt: string | Date;
  notes: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  futureExpenseId: string | null;
};

export type ReconciliationInput = {
  periodMonth?: string;
  cutoffDate?: string;
  bankBalanceCents?: number | null;
};

function normalizeReconciliationPeriodMonth(value: string | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  return getCurrentPeriodMonth();
}

function normalizeReconciliationCutoffDate(value: string | undefined): string {
  const normalized = normalizeDateOnly(value ?? null);
  return normalized ?? normalizeDateOnly(new Date()) ?? "";
}

function toDateString(value: string | Date): string {
  return normalizeDateOnly(value) ?? String(value);
}

function mapIncomeRow(row: ReconciliationIncomeRow): ReconciliationItem {
  const hasMonthlyLink = row.monthlyIncomeId !== null;
  const hasFutureLink = row.futureIncomeId !== null;
  const category = hasMonthlyLink
    ? row.monthlyIncomeCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyIncomeCategory ?? "outros";
  const title = hasMonthlyLink
    ? row.monthlyIncomeName ?? row.entryName ?? "Entrada"
    : row.entryName ?? row.monthlyIncomeName ?? "Entrada avulsa";
  const originType = hasFutureLink
    ? "future_income_receivable"
    : hasMonthlyLink
    ? "monthly_income_entry_linked"
    : "monthly_income_entry_one_time";

  return {
    id: row.id,
    type: "income",
    date: toDateString(row.receivedAt),
    periodMonth: row.periodMonth,
    title,
    amountCents: row.amount,
    category,
    categoryLabel: getIncomeCategoryLabel(category),
    originType,
    originLabel: getReconciliationOriginLabel(originType),
    href: getReconciliationItemHref(originType, row.id),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapExpenseRow(row: ReconciliationExpenseRow): ReconciliationItem {
  const hasMonthlyLink = row.monthlyExpenseId !== null;
  const hasFutureLink = row.futureExpenseId !== null;
  const category = hasMonthlyLink
    ? row.monthlyExpenseCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyExpenseCategory ?? "outros";
  const title = hasMonthlyLink
    ? row.entryName ?? row.monthlyExpenseName ?? "Gasto"
    : row.entryName ?? row.monthlyExpenseName ?? "Gasto avulso";
  const originType = hasFutureLink
    ? "future_expense_payable"
    : hasMonthlyLink
    ? "monthly_expense_entry_linked"
    : "monthly_expense_entry_one_time";

  return {
    id: row.id,
    type: "expense",
    date: toDateString(row.paidAt),
    periodMonth: row.periodMonth,
    title,
    amountCents: row.amount,
    category,
    categoryLabel: getExpenseCategoryLabel(category),
    originType,
    originLabel: getReconciliationOriginLabel(originType),
    href: getReconciliationItemHref(originType, row.id),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getReconciliationSummary(
  input: ReconciliationInput = {}
): Promise<ReconciliationSummary> {
  const db = getDb();
  const settings = await getCashFlowSettings();
  const periodMonth = normalizeReconciliationPeriodMonth(input.periodMonth);
  const cutoffDate = normalizeReconciliationCutoffDate(input.cutoffDate);
  const bankBalanceCents = input.bankBalanceCents ?? null;

  const openingBalanceSourceLabel =
    periodMonth === settings.startMonth ? "Configuração inicial" : "Carry-over do mês anterior";

  if (periodMonth < settings.startMonth) {
    return buildReconciliationSummary({
      periodMonth,
      cutoffDate,
      bankBalanceCents,
      openingBalanceCents: settings.initialBalance,
      items: [],
      allItems: [],
      openingBalanceSourceLabel,
    });
  }

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
        notes: monthlyIncomeEntries.notes,
        createdAt: monthlyIncomeEntries.createdAt,
        updatedAt: monthlyIncomeEntries.updatedAt,
        futureIncomeId: futureIncomeReceivables.id,
      })
      .from(monthlyIncomeEntries)
      .leftJoin(monthlyIncomes, eq(monthlyIncomeEntries.monthlyIncomeId, monthlyIncomes.id))
      .leftJoin(
        futureIncomeReceivables,
        eq(futureIncomeReceivables.receivedEntryId, monthlyIncomeEntries.id)
      )
      .where(
        and(
          sql`${monthlyIncomeEntries.periodMonth} >= ${settings.startMonth}`,
          sql`${monthlyIncomeEntries.periodMonth} <= ${periodMonth}`,
          sql`${monthlyIncomeEntries.receivedAt} <= ${cutoffDate}`
        )
      )
      .orderBy(
        asc(monthlyIncomeEntries.periodMonth),
        asc(monthlyIncomeEntries.receivedAt),
        asc(monthlyIncomeEntries.createdAt)
      ),
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
        notes: monthlyExpenseEntries.notes,
        createdAt: monthlyExpenseEntries.createdAt,
        updatedAt: monthlyExpenseEntries.updatedAt,
        futureExpenseId: futureExpensePayables.id,
      })
      .from(monthlyExpenseEntries)
      .leftJoin(monthlyExpenses, eq(monthlyExpenseEntries.monthlyExpenseId, monthlyExpenses.id))
      .leftJoin(
        futureExpensePayables,
        eq(futureExpensePayables.realizedEntryId, monthlyExpenseEntries.id)
      )
      .where(
        and(
          sql`${monthlyExpenseEntries.periodMonth} >= ${settings.startMonth}`,
          sql`${monthlyExpenseEntries.periodMonth} <= ${periodMonth}`,
          sql`${monthlyExpenseEntries.paidAt} <= ${cutoffDate}`
        )
      )
      .orderBy(
        asc(monthlyExpenseEntries.periodMonth),
        asc(monthlyExpenseEntries.paidAt),
        asc(monthlyExpenseEntries.createdAt)
      ),
  ]);

  const allItems = [
    ...incomeRows.map(mapIncomeRow),
    ...expenseRows.map(mapExpenseRow),
  ];

  const selectedItems = allItems
    .filter((item) => item.periodMonth === periodMonth)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightCreatedAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;

      if (leftCreatedAt !== rightCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
      }

      return right.id.localeCompare(left.id);
    });

  const priorIncomeCents = allItems
    .filter((item) => item.type === "income" && item.periodMonth < periodMonth)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const priorExpenseCents = allItems
    .filter((item) => item.type === "expense" && item.periodMonth < periodMonth)
    .reduce((sum, item) => sum + item.amountCents, 0);

  const openingBalanceCents = settings.initialBalance + priorIncomeCents - priorExpenseCents;

  return buildReconciliationSummary({
    periodMonth,
    cutoffDate,
    bankBalanceCents,
    openingBalanceCents,
    items: selectedItems,
    allItems,
    openingBalanceSourceLabel,
  });
}
