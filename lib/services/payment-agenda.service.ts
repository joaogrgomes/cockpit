import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { normalizeDateOnly } from "@/lib/date-utils";
import {
  buildMonthlyExpenseAgendaItem,
  computeDebtNextDueDate,
  getPaymentAgendaCategoryLabel,
  getPaymentAgendaItemHref,
  getPaymentAgendaReferenceDate,
  groupPaymentAgendaItems,
  type PaymentAgendaItem,
  type PaymentAgendaViewModel,
} from "@/lib/payment-agenda";
import { getDb } from "@/lib/db";
import { debtProposals, debts, futureExpensePayables } from "@/lib/db/schema";
import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import { listEntriesByPeriod } from "@/lib/services/monthly-expense-entry.service";

type FutureExpenseAgendaRow = {
  id: string;
  name: string;
  category: string;
  expenseType: string;
  occurrenceType: string;
  expectedAmount: number;
  expectedDate: string;
  status: string;
  notes: string | null;
  costAnalysisItemId: string | null;
};

type DebtProposalAgendaRow = {
  proposalId: string;
  debtId: string;
  debtName: string;
  creditor: string;
  debtType: string;
  currentValue: number;
  monthlyPayment: number | null;
  paymentMethod: string | null;
  debtNotes: string | null;
  proposalValue: number;
  proposedAt: string;
  expiresAt: string | null;
  origin: string | null;
  proposalNotes: string | null;
  proposalStatus: string;
};

type DebtAgendaRow = {
  id: string;
  name: string;
  creditor: string;
  debtType: string;
  status: string;
  currentValue: number;
  monthlyPayment: number | null;
  dueDay: number | null;
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  clearanceDueDate: string | null;
  paymentNotes: string | null;
  notes: string | null;
};

function formatNotes(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" • ") : null;
}

function mapFutureExpenseRowToItem(row: FutureExpenseAgendaRow): PaymentAgendaItem | null {
  const dueDate = normalizeDateOnly(row.expectedDate);
  if (!dueDate) return null;

  return {
    id: row.id,
    sourceType: "future_expense",
    title: row.name,
    amountCents: row.expectedAmount,
    dueDate,
    status: row.status,
    category: getPaymentAgendaCategoryLabel("future_expense", row.category),
    paymentMethod: null,
    paymentCode: null,
    notes: formatNotes([row.notes, row.costAnalysisItemId ? "Origem: Análise de Custo" : null]),
    href: getPaymentAgendaItemHref("future_expense", row.id),
  };
}

function mapDebtProposalRowToItem(row: DebtProposalAgendaRow): PaymentAgendaItem | null {
  if (!row.expiresAt) return null;
  const dueDate = normalizeDateOnly(row.expiresAt);
  if (!dueDate) return null;

  return {
    id: row.proposalId,
    sourceType: "debt_proposal",
    title: `${row.debtName} • proposta`,
    amountCents: row.proposalValue,
    dueDate,
    status: row.proposalStatus,
    category: getPaymentAgendaCategoryLabel("debt_proposal", row.debtType),
    paymentMethod: row.paymentMethod,
    paymentCode: null,
    notes: formatNotes([
      `Credor: ${row.creditor}`,
      row.origin,
      row.proposalNotes,
      row.debtNotes,
    ]),
    href: getPaymentAgendaItemHref("debt_proposal", row.debtId),
  };
}

function mapDebtRowToItem(
  row: DebtAgendaRow,
  referenceDate: string
): PaymentAgendaItem | null {
  const dueDate =
    row.status === "aguardando_baixa"
      ? normalizeDateOnly(row.clearanceDueDate ?? row.paidAt ?? null)
      : normalizeDateOnly(row.dueDate ?? null) ?? (row.dueDay ? computeDebtNextDueDate(row.dueDay, referenceDate) : null);

  if (!dueDate) return null;

  const amountCents =
    row.status === "aguardando_baixa"
      ? row.paidAmount ?? row.currentValue
      : row.monthlyPayment ?? row.currentValue;

  const notes =
    row.status === "aguardando_baixa"
      ? formatNotes([`Credor: ${row.creditor}`, row.paymentNotes, row.notes])
      : formatNotes([`Credor: ${row.creditor}`, row.notes]);

  return {
    id: row.id,
    sourceType: row.status === "aguardando_baixa" ? "debt_clearance" : "debt_due",
    title: row.name,
    amountCents,
    dueDate,
    status: row.status,
    category: getPaymentAgendaCategoryLabel(
      row.status === "aguardando_baixa" ? "debt_clearance" : "debt_due",
      row.debtType
    ),
    paymentMethod: row.paymentMethod,
    paymentCode: null,
    notes,
    href: getPaymentAgendaItemHref(
      row.status === "aguardando_baixa" ? "debt_clearance" : "debt_due",
      row.id
    ),
  };
}

export async function getPaymentAgenda(): Promise<PaymentAgendaViewModel> {
  const db = getDb();
  const referenceDate = getPaymentAgendaReferenceDate();
  const referencePeriodMonth = referenceDate.slice(0, 7);

  const [futureExpenseRows, debtProposalRows, debtRows, monthlyExpenseRows, periodExpenseEntries] = await Promise.all([
    db
      .select({
        id: futureExpensePayables.id,
        name: futureExpensePayables.name,
        category: futureExpensePayables.category,
        expenseType: futureExpensePayables.expenseType,
        occurrenceType: futureExpensePayables.occurrenceType,
        expectedAmount: futureExpensePayables.expectedAmount,
        expectedDate: futureExpensePayables.expectedDate,
        status: futureExpensePayables.status,
        notes: futureExpensePayables.notes,
        costAnalysisItemId: futureExpensePayables.costAnalysisItemId,
      })
      .from(futureExpensePayables)
      .where(eq(futureExpensePayables.status, "previsto"))
      .orderBy(asc(futureExpensePayables.expectedDate), asc(futureExpensePayables.createdAt)),
    db
      .select({
        proposalId: debtProposals.id,
        debtId: debtProposals.debtId,
        debtName: debts.name,
        creditor: debts.creditor,
        debtType: debts.debtType,
        currentValue: debts.currentValue,
        monthlyPayment: debts.monthlyPayment,
        paymentMethod: debts.paymentMethod,
        debtNotes: debts.notes,
        proposalValue: debtProposals.proposedValue,
        proposedAt: debtProposals.proposedAt,
        expiresAt: debtProposals.expiresAt,
        origin: debtProposals.origin,
        proposalNotes: debtProposals.notes,
        proposalStatus: debtProposals.status,
      })
      .from(debtProposals)
      .innerJoin(debts, eq(debtProposals.debtId, debts.id))
      .where(
        and(
          eq(debtProposals.status, "ativa"),
          sql`${debtProposals.expiresAt} IS NOT NULL`,
          sql`${debts.status} NOT IN ('quitada','baixada','arquivada')`
        )
      )
      .orderBy(asc(debtProposals.expiresAt), asc(debtProposals.proposedAt), asc(debtProposals.createdAt)),
    db
      .select({
        id: debts.id,
        name: debts.name,
        creditor: debts.creditor,
        debtType: debts.debtType,
        status: debts.status,
        currentValue: debts.currentValue,
        monthlyPayment: debts.monthlyPayment,
        dueDay: debts.dueDay,
        dueDate: debts.dueDate,
        paidAt: debts.paidAt,
        paidAmount: debts.paidAmount,
        paymentMethod: debts.paymentMethod,
        clearanceDueDate: debts.clearanceDueDate,
        paymentNotes: debts.paymentNotes,
        notes: debts.notes,
      })
      .from(debts)
      .where(
        inArray(debts.status, [
          "em_aberto",
          "em_atraso",
          "em_negociacao",
          "parcelada",
          "suspensa",
          "aguardando_baixa",
        ])
      )
      .orderBy(asc(debts.status), asc(debts.dueDate), asc(debts.createdAt)),
    listMonthlyExpenses({
      periodMonth: referencePeriodMonth,
      isActive: "true",
      sort: "due_day",
    }),
    listEntriesByPeriod(referencePeriodMonth),
  ]);

  const realizedMonthlyExpenseIds = new Set(
    periodExpenseEntries
      .filter((entry) => entry.monthlyExpenseId !== null)
      .map((entry) => entry.monthlyExpenseId as string)
  );

  const items = [
    ...futureExpenseRows.map(mapFutureExpenseRowToItem),
    ...monthlyExpenseRows
      .filter((expense) => !realizedMonthlyExpenseIds.has(expense.id))
      .map((expense) =>
        buildMonthlyExpenseAgendaItem({
          monthlyExpenseId: expense.id,
          name: expense.name,
          category: expense.category,
          expenseType: expense.expenseType,
          dueDay: expense.dueDay,
          amount: expense.amount,
          startMonth: expense.startMonth,
          endMonth: expense.endMonth,
          isActive: expense.isActive,
          periodMonth: referencePeriodMonth,
          actualAmount: 0,
          referenceDate,
        })
      ),
    ...debtProposalRows.map(mapDebtProposalRowToItem),
    ...debtRows.map((row) => mapDebtRowToItem(row, referenceDate)),
  ].filter((item): item is PaymentAgendaItem => Boolean(item));

  return groupPaymentAgendaItems(items, referenceDate);
}
