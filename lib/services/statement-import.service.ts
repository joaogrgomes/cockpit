import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
  statementImportBatches,
  statementImportRows,
} from "@/lib/db/schema";
import {
  dedupeImportedStatementItems,
  getImportedStatementPeriod,
  parseStatementImportRowStatus,
  type ImportedStatementItem,
  type StatementImportReviewedRow,
  type StatementImportSource,
} from "@/lib/statement-import";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";
import type { StatementImportBatchStatus } from "@/types";

type DbClient = ReturnType<typeof getDb>;
type StatementImportReadExecutor = Pick<DbClient, "select">;

export type StatementImportBatchCreateInput = {
  source: StatementImportSource;
  originalFilename: string | null;
};

export type StatementImportBatchCreateResult =
  | {
      kind: "created_batch";
      batchId: string;
      insertedCount: number;
      duplicateCount: number;
    }
  | {
      kind: "all_duplicates";
      insertedCount: 0;
      duplicateCount: number;
      existingBatchId: string | null;
      existingBatchStatus: StatementImportBatchStatus | null;
    };

export type StatementImportBatchView = Awaited<ReturnType<typeof getStatementImportBatchById>>;

function getPeriodMonthFromDate(dateValue: string): string {
  return dateValue.slice(0, 7);
}

async function getExistingRowHashes(
  db: StatementImportReadExecutor,
  hashes: string[]
): Promise<Set<string>> {
  if (hashes.length === 0) {
    return new Set<string>();
  }

  const rows = await db
    .select({ rowHash: statementImportRows.rowHash })
    .from(statementImportRows)
    .where(inArray(statementImportRows.rowHash, hashes));

  return new Set(rows.map((row) => row.rowHash));
}

type ExistingImportBatchCandidate = {
  batchId: string;
  batchStatus: StatementImportBatchStatus;
  batchCreatedAt: Date;
  pendingCount: number;
  rowCount: number;
};

async function findExistingImportBatch(
  db: StatementImportReadExecutor,
  hashes: string[]
): Promise<ExistingImportBatchCandidate | null> {
  if (hashes.length === 0) {
    return null;
  }

  const rows = await db
    .select({
      batchId: statementImportRows.batchId,
      batchStatus: statementImportBatches.status,
      batchCreatedAt: statementImportBatches.createdAt,
      rowStatus: statementImportRows.status,
    })
    .from(statementImportRows)
    .innerJoin(statementImportBatches, eq(statementImportRows.batchId, statementImportBatches.id))
    .where(inArray(statementImportRows.rowHash, hashes));

  if (rows.length === 0) {
    return null;
  }

  const candidates = new Map<string, ExistingImportBatchCandidate>();

  for (const row of rows) {
    const current = candidates.get(row.batchId);
    const pendingCount = row.rowStatus === "pending" ? 1 : 0;

    if (!current) {
      candidates.set(row.batchId, {
        batchId: row.batchId,
        batchStatus: row.batchStatus as StatementImportBatchStatus,
        batchCreatedAt: row.batchCreatedAt,
        pendingCount,
        rowCount: 1,
      });
      continue;
    }

    candidates.set(row.batchId, {
      ...current,
      pendingCount: current.pendingCount + pendingCount,
      rowCount: current.rowCount + 1,
      batchCreatedAt:
        current.batchCreatedAt.getTime() >= row.batchCreatedAt.getTime()
          ? current.batchCreatedAt
          : row.batchCreatedAt,
    });
  }

  const orderedCandidates = Array.from(candidates.values()).sort((left, right) => {
    if (left.pendingCount !== right.pendingCount) {
      return right.pendingCount - left.pendingCount;
    }

    return right.batchCreatedAt.getTime() - left.batchCreatedAt.getTime();
  });

  return orderedCandidates[0] ?? null;
}

export async function createStatementImportBatchWithRows(
  input: StatementImportBatchCreateInput,
  items: ImportedStatementItem[]
): Promise<StatementImportBatchCreateResult> {
  const db = getDb();
  const { periodStart, periodEnd } = getImportedStatementPeriod(items);
  const hashes = items.map((item) => item.rowHash);
  return db.transaction(async (tx) => {
    const existingHashes = await getExistingRowHashes(tx, hashes);
    const { insertedItems, duplicateItems } = dedupeImportedStatementItems(items, existingHashes);

    if (insertedItems.length === 0) {
      const existingBatch = await findExistingImportBatch(tx, hashes);
      return {
        kind: "all_duplicates",
        insertedCount: 0,
        duplicateCount: duplicateItems.length,
        existingBatchId: existingBatch?.batchId ?? null,
        existingBatchStatus: existingBatch?.batchStatus ?? null,
      };
    }

    const batchRows = await tx
      .insert(statementImportBatches)
      .values({
        source: input.source,
        originalFilename: input.originalFilename,
        periodStart,
        periodEnd,
        status: "parsed",
      })
      .returning({ id: statementImportBatches.id });

    const batchId = batchRows[0].id;

    if (insertedItems.length > 0) {
      await tx.insert(statementImportRows).values(
        insertedItems.map((item) => ({
          batchId,
          source: item.source,
          rowIndex: item.rowIndex,
          rowHash: item.rowHash,
          externalId: item.externalId ?? null,
          transactionDate: item.transactionDate,
          rawHistory: item.rawHistory,
          rawDescription: item.rawDescription,
          description: item.description,
          amountCents: item.amountCents,
          balanceAfterCents: item.balanceAfterCents,
          direction: item.direction,
          status: "pending",
        }))
      );
    }

    return {
      kind: "created_batch",
      batchId,
      insertedCount: insertedItems.length,
      duplicateCount: duplicateItems.length,
    };
  });
}

export async function getStatementImportBatchById(batchId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(statementImportBatches)
    .where(eq(statementImportBatches.id, batchId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getStatementImportRowsByBatchId(batchId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(statementImportRows)
    .where(eq(statementImportRows.batchId, batchId))
    .orderBy(asc(statementImportRows.rowIndex), asc(statementImportRows.createdAt));

  return rows.map((row) => ({
    ...row,
    status: parseStatementImportRowStatus(row.status),
  }));
}

export async function getStatementImportBatchWithRows(batchId: string) {
  const [batch, rows] = await Promise.all([
    getStatementImportBatchById(batchId),
    getStatementImportRowsByBatchId(batchId),
  ]);

  if (!batch) {
    return null;
  }

  return { batch, rows };
}

function getBatchStatus(committedCount: number, ignoredCount: number): "parsed" | "partially_committed" | "committed" | "cancelled" {
  if (committedCount > 0 && ignoredCount > 0) {
    return "partially_committed";
  }

  if (committedCount > 0) {
    return "committed";
  }

  return "cancelled";
}

function assertValidReviewedRow(
  row: StatementImportReviewedRow,
  direction: "income" | "expense"
): void {
  if (row.decision === "ignore") {
    return;
  }

  if (!row.category) {
    throw new Error("Categoria é obrigatória para linhas importadas");
  }

  if (row.mode === "linked") {
    if (!row.monthlyExpenseId && !row.monthlyIncomeId) {
      throw new Error("Selecione um planejamento para a linha vinculada");
    }
    return;
  }

  if (direction === "expense") {
    if (!row.expenseType) {
      throw new Error("Tipo do gasto é obrigatório para despesa avulsa");
    }
    if (!row.occurrenceType) {
      throw new Error("Ocorrência é obrigatória para despesa avulsa");
    }
  }
}

async function validateLinkedExpense(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow,
  transactionDate: string
): Promise<void> {
  if (!row.monthlyExpenseId) {
    throw new Error("Planejamento de gasto não informado");
  }

  const [monthlyExpense] = await db
    .select()
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.id, row.monthlyExpenseId))
    .limit(1);

  if (!monthlyExpense || !monthlyExpense.isActive) {
    throw new Error("Planejamento de gasto não encontrado ou inativo");
  }

  const periodMonth = getPeriodMonthFromDate(transactionDate);
  if (!isMonthWithinPeriod(periodMonth, monthlyExpense.startMonth, monthlyExpense.endMonth)) {
    throw new Error("Planejamento de gasto não está vigente na data informada");
  }

  if (row.category && row.category !== monthlyExpense.category) {
    throw new Error("Categoria não corresponde ao planejamento selecionado");
  }
}

async function validateLinkedIncome(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow,
  transactionDate: string
): Promise<void> {
  if (!row.monthlyIncomeId) {
    throw new Error("Planejamento de entrada não informado");
  }

  const [monthlyIncome] = await db
    .select()
    .from(monthlyIncomes)
    .where(eq(monthlyIncomes.id, row.monthlyIncomeId))
    .limit(1);

  if (!monthlyIncome || !monthlyIncome.isActive) {
    throw new Error("Planejamento de entrada não encontrado ou inativo");
  }

  const periodMonth = getPeriodMonthFromDate(transactionDate);
  if (!isMonthWithinPeriod(periodMonth, monthlyIncome.startMonth, monthlyIncome.endMonth)) {
    throw new Error("Planejamento de entrada não está vigente na data informada");
  }

  if (row.category && row.category !== monthlyIncome.category) {
    throw new Error("Categoria não corresponde ao planejamento selecionado");
  }
}

export async function commitStatementImportBatch(
  batchId: string,
  rows: StatementImportReviewedRow[]
): Promise<{ committedCount: number; ignoredCount: number; batchStatus: string }> {
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(statementImportBatches)
      .where(eq(statementImportBatches.id, batchId))
      .limit(1);

    if (!batch) {
      throw new Error("Lote de importação não encontrado");
    }

    const dbRows = await tx
      .select()
      .from(statementImportRows)
      .where(eq(statementImportRows.batchId, batchId));

    const rowsById = new Map(dbRows.map((row) => [row.id, row]));
    let committedCount = 0;
    let ignoredCount = 0;

    for (const reviewedRow of rows) {
      const dbRow = rowsById.get(reviewedRow.rowId);
      if (!dbRow || dbRow.status !== "pending") {
        throw new Error("Linha da importação inválida ou já processada");
      }

      if (reviewedRow.decision === "ignore") {
        await tx
          .update(statementImportRows)
          .set({ status: "ignored", updatedAt: sql`now()` })
          .where(eq(statementImportRows.id, dbRow.id));
        ignoredCount += 1;
        continue;
      }

      assertValidReviewedRow(reviewedRow, dbRow.direction as "income" | "expense");

      const periodMonth = getPeriodMonthFromDate(dbRow.transactionDate);

      if (dbRow.direction === "expense") {
        if (reviewedRow.mode === "linked") {
          await validateLinkedExpense(tx, reviewedRow, dbRow.transactionDate);

          const inserted = await tx
            .insert(monthlyExpenseEntries)
            .values({
              monthlyExpenseId: reviewedRow.monthlyExpenseId ?? null,
              name: null,
              category: null,
              expenseType: null,
              occurrenceType: null,
              periodMonth,
              amount: dbRow.amountCents,
              paidAt: dbRow.transactionDate,
              paymentMethod: null,
              notes: null,
              updatedAt: sql`now()`,
            })
            .returning({ id: monthlyExpenseEntries.id });

          await tx
            .update(statementImportRows)
            .set({
              status: "committed",
              createdEntryType: "monthly_expense_entry",
              createdEntryId: inserted[0].id,
              updatedAt: sql`now()`,
            })
            .where(eq(statementImportRows.id, dbRow.id));
          committedCount += 1;
          continue;
        }

        if (!reviewedRow.category || !reviewedRow.expenseType || !reviewedRow.occurrenceType) {
          throw new Error("Dados obrigatórios ausentes para despesa avulsa");
        }

        const inserted = await tx
          .insert(monthlyExpenseEntries)
          .values({
            monthlyExpenseId: null,
            name: reviewedRow.description.trim(),
            category: reviewedRow.category,
            expenseType: reviewedRow.expenseType,
            occurrenceType: reviewedRow.occurrenceType,
            periodMonth,
            amount: dbRow.amountCents,
            paidAt: dbRow.transactionDate,
            paymentMethod: null,
            notes: null,
            updatedAt: sql`now()`,
          })
          .returning({ id: monthlyExpenseEntries.id });

        await tx
          .update(statementImportRows)
          .set({
            status: "committed",
            createdEntryType: "monthly_expense_entry",
            createdEntryId: inserted[0].id,
            updatedAt: sql`now()`,
          })
          .where(eq(statementImportRows.id, dbRow.id));
        committedCount += 1;
        continue;
      }

      if (reviewedRow.mode === "linked") {
        await validateLinkedIncome(tx, reviewedRow, dbRow.transactionDate);

        const inserted = await tx
          .insert(monthlyIncomeEntries)
          .values({
            monthlyIncomeId: reviewedRow.monthlyIncomeId ?? null,
            name: null,
            category: null,
            periodMonth,
            amount: dbRow.amountCents,
            receivedAt: dbRow.transactionDate,
            paymentMethod: null,
            notes: null,
            updatedAt: sql`now()`,
          })
          .returning({ id: monthlyIncomeEntries.id });

        await tx
          .update(statementImportRows)
          .set({
            status: "committed",
            createdEntryType: "monthly_income_entry",
            createdEntryId: inserted[0].id,
            updatedAt: sql`now()`,
          })
          .where(eq(statementImportRows.id, dbRow.id));
        committedCount += 1;
        continue;
      }

      if (!reviewedRow.category) {
        throw new Error("Categoria obrigatória para entrada avulsa");
      }

      const inserted = await tx
        .insert(monthlyIncomeEntries)
        .values({
          monthlyIncomeId: null,
          name: reviewedRow.description.trim(),
          category: reviewedRow.category,
          periodMonth,
          amount: dbRow.amountCents,
          receivedAt: dbRow.transactionDate,
          paymentMethod: null,
          notes: null,
          updatedAt: sql`now()`,
        })
        .returning({ id: monthlyIncomeEntries.id });

      await tx
        .update(statementImportRows)
        .set({
          status: "committed",
          createdEntryType: "monthly_income_entry",
          createdEntryId: inserted[0].id,
          updatedAt: sql`now()`,
        })
        .where(eq(statementImportRows.id, dbRow.id));
      committedCount += 1;
    }

    const batchStatus = getBatchStatus(committedCount, ignoredCount);
    await tx
      .update(statementImportBatches)
      .set({ status: batchStatus, updatedAt: sql`now()` })
      .where(eq(statementImportBatches.id, batchId));

    return { committedCount, ignoredCount, batchStatus };
  });

  return result;
}
