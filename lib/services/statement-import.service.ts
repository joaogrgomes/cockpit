import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  monthlyExpenseEntries,
  monthlyExpenses,
  monthlyIncomeEntries,
  monthlyIncomes,
  futureExpensePayables,
  futureIncomeReceivables,
  statementImportBatches,
  statementImportRows,
} from "@/lib/db/schema";
import {
  dedupeImportedStatementItems,
  getImportedStatementPeriod,
  parseStatementImportDirection,
  parseStatementImportExpenseType,
  parseStatementImportOccurrenceType,
  parseStatementImportRowStatus,
  type ImportedStatementItem,
  type StatementImportReviewedRow,
  type StatementImportSource,
} from "@/lib/statement-import";
import {
  applyStatementImportSuggestions,
  listStatementCategorizationRules,
  upsertStatementCategorizationRuleFromReview,
} from "@/lib/services/statement-categorization-rules.service";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";
import type { StatementImportBatchStatus } from "@/types";
import type {
  FutureExpensePayable,
  FutureIncomeReceivable,
} from "@/types";

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
export type StatementImportCommitResult =
  | {
      ok: true;
      committedCount: number;
      ignoredCount: number;
      batchStatus: string;
    }
  | {
      ok: false;
      error: string;
      fieldErrorsByRowId: Record<string, string[]>;
    };

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
  const [rows, rules] = await Promise.all([
    db
      .select()
      .from(statementImportRows)
      .where(eq(statementImportRows.batchId, batchId))
      .orderBy(asc(statementImportRows.rowIndex), asc(statementImportRows.createdAt)),
    listStatementCategorizationRules(),
  ]);

  return applyStatementImportSuggestions(
    rows.map((row) => ({
      ...row,
      status: parseStatementImportRowStatus(row.status),
    })),
    rules
  );
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
): string[] {
  const errors: string[] = [];

  if (row.decision === "ignore") {
    return errors;
  }

  if (!row.category) {
    errors.push("Selecione a categoria desta linha.");
  }

  if (row.mode === "linked") {
    if (!row.monthlyExpenseId && !row.monthlyIncomeId) {
      errors.push("Selecione o planejamento desta linha.");
    }
    return errors;
  }

  if (row.mode === "future") {
    if (!row.futureExpensePayableId && !row.futureIncomeReceivableId) {
      errors.push("Selecione o futuro previsto desta linha.");
    }
    return errors;
  }

  if (direction === "expense") {
    if (!row.expenseType) {
      errors.push("Selecione o tipo do gasto.");
    }
    if (!row.occurrenceType) {
      errors.push("Selecione a ocorrência desta linha.");
    }
  }

  return errors;
}

async function resolveLinkedMonthlyExpense(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow,
  transactionDate: string
): Promise<string | null> {
  if (!row.monthlyExpenseId) {
    return "Selecione o planejamento desta linha.";
  }

  const [monthlyExpense] = await db
    .select()
    .from(monthlyExpenses)
    .where(eq(monthlyExpenses.id, row.monthlyExpenseId))
    .limit(1);

  if (!monthlyExpense || !monthlyExpense.isActive) {
    return "Planejamento de gasto não encontrado ou inativo.";
  }

  const periodMonth = getPeriodMonthFromDate(transactionDate);
  if (!isMonthWithinPeriod(periodMonth, monthlyExpense.startMonth, monthlyExpense.endMonth)) {
    return "Planejamento de gasto não está vigente na data informada.";
  }

  if (row.category && row.category !== monthlyExpense.category) {
    return "Categoria não corresponde ao planejamento selecionado.";
  }

  return null;
}

async function resolveLinkedMonthlyIncome(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow,
  transactionDate: string
): Promise<string | null> {
  if (!row.monthlyIncomeId) {
    return "Selecione o planejamento desta linha.";
  }

  const [monthlyIncome] = await db
    .select()
    .from(monthlyIncomes)
    .where(eq(monthlyIncomes.id, row.monthlyIncomeId))
    .limit(1);

  if (!monthlyIncome || !monthlyIncome.isActive) {
    return "Planejamento de entrada não encontrado ou inativo.";
  }

  const periodMonth = getPeriodMonthFromDate(transactionDate);
  if (!isMonthWithinPeriod(periodMonth, monthlyIncome.startMonth, monthlyIncome.endMonth)) {
    return "Planejamento de entrada não está vigente na data informada.";
  }

  if (row.category && row.category !== monthlyIncome.category) {
    return "Categoria não corresponde ao planejamento selecionado.";
  }

  return null;
}

async function resolveLinkedFutureExpense(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow
): Promise<{ futureExpense: FutureExpensePayable | null; error: string | null }> {
  if (!row.futureExpensePayableId) {
    return { futureExpense: null, error: "Selecione o futuro previsto desta linha." };
  }

  const [futureExpense] = await db
    .select()
    .from(futureExpensePayables)
    .where(eq(futureExpensePayables.id, row.futureExpensePayableId))
    .for("update")
    .limit(1);

  if (!futureExpense) {
    return { futureExpense: null, error: "Futuro de gasto não encontrado." };
  }

  if (futureExpense.status !== "previsto") {
    return { futureExpense: null, error: "O futuro de gasto selecionado já foi realizado." };
  }

  return { futureExpense, error: null };
}

async function resolveLinkedFutureIncome(
  db: StatementImportReadExecutor,
  row: StatementImportReviewedRow
): Promise<{ futureIncome: FutureIncomeReceivable | null; error: string | null }> {
  if (!row.futureIncomeReceivableId) {
    return { futureIncome: null, error: "Selecione o futuro previsto desta linha." };
  }

  const [futureIncome] = await db
    .select()
    .from(futureIncomeReceivables)
    .where(eq(futureIncomeReceivables.id, row.futureIncomeReceivableId))
    .for("update")
    .limit(1);

  if (!futureIncome) {
    return { futureIncome: null, error: "Futuro de entrada não encontrado." };
  }

  if (futureIncome.status !== "prevista") {
    return { futureIncome: null, error: "O futuro de entrada selecionado já foi realizado." };
  }

  return { futureIncome, error: null };
}

async function upsertReviewedImportRule(
  db: Pick<DbClient, "select" | "insert" | "update">,
  direction: "income" | "expense",
  reviewedRow: StatementImportReviewedRow
): Promise<void> {
  const expenseType = reviewedRow.expenseType
    ? parseStatementImportExpenseType(reviewedRow.expenseType)
    : null;
  const occurrenceType = reviewedRow.occurrenceType
    ? parseStatementImportOccurrenceType(reviewedRow.occurrenceType)
    : null;

  await upsertStatementCategorizationRuleFromReview(db, {
    direction: parseStatementImportDirection(direction),
    description: reviewedRow.description,
    category: reviewedRow.category ?? "",
    mode: reviewedRow.mode === "linked" ? "linked" : "one_time",
    monthlyExpenseId: reviewedRow.monthlyExpenseId ?? null,
    monthlyIncomeId: reviewedRow.monthlyIncomeId ?? null,
    expenseType,
    occurrenceType,
  });
}

export async function commitStatementImportBatch(
  batchId: string,
  rows: StatementImportReviewedRow[]
): Promise<StatementImportCommitResult> {
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
    const fieldErrorsByRowId: Record<string, string[]> = {};
    let committedCount = 0;
    let ignoredCount = 0;
    const validRows: Array<{
      reviewedRow: StatementImportReviewedRow;
      dbRow: (typeof dbRows)[number];
      direction: "income" | "expense";
      futureExpense: FutureExpensePayable | null;
      futureIncome: FutureIncomeReceivable | null;
    }> = [];

    for (const reviewedRow of rows) {
      const dbRow = rowsById.get(reviewedRow.rowId);
      if (!dbRow || dbRow.status !== "pending") {
        fieldErrorsByRowId[reviewedRow.rowId] = [
          ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
          "Linha da importação inválida ou já processada.",
        ];
        continue;
      }

      if (reviewedRow.decision === "ignore") {
        validRows.push({
          reviewedRow,
          dbRow,
          direction: parseStatementImportDirection(dbRow.direction),
          futureExpense: null,
          futureIncome: null,
        });
        continue;
      }

      const direction = parseStatementImportDirection(dbRow.direction);
      const rowErrors = assertValidReviewedRow(reviewedRow, direction);
      if (rowErrors.length > 0) {
        fieldErrorsByRowId[reviewedRow.rowId] = [
          ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
          ...rowErrors,
        ];
        continue;
      }

      if (direction === "expense" && reviewedRow.mode === "linked") {
        const linkedError = await resolveLinkedMonthlyExpense(tx, reviewedRow, dbRow.transactionDate);
        if (linkedError) {
          fieldErrorsByRowId[reviewedRow.rowId] = [
            ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
            linkedError,
          ];
          continue;
        }
      }

      if (direction === "income" && reviewedRow.mode === "linked") {
        const linkedError = await resolveLinkedMonthlyIncome(tx, reviewedRow, dbRow.transactionDate);
        if (linkedError) {
          fieldErrorsByRowId[reviewedRow.rowId] = [
            ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
            linkedError,
          ];
          continue;
        }
      }

      if (direction === "expense" && reviewedRow.mode === "future") {
        const futureResolution = await resolveLinkedFutureExpense(tx, reviewedRow);
        if (futureResolution.error) {
          fieldErrorsByRowId[reviewedRow.rowId] = [
            ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
            futureResolution.error,
          ];
          continue;
        }

        validRows.push({
          reviewedRow,
          dbRow,
          direction,
          futureExpense: futureResolution.futureExpense,
          futureIncome: null,
        });
        continue;
      }

      if (direction === "income" && reviewedRow.mode === "future") {
        const futureResolution = await resolveLinkedFutureIncome(tx, reviewedRow);
        if (futureResolution.error) {
          fieldErrorsByRowId[reviewedRow.rowId] = [
            ...(fieldErrorsByRowId[reviewedRow.rowId] ?? []),
            futureResolution.error,
          ];
          continue;
        }

        validRows.push({
          reviewedRow,
          dbRow,
          direction,
          futureExpense: null,
          futureIncome: futureResolution.futureIncome,
        });
        continue;
      }

      validRows.push({
        reviewedRow,
        dbRow,
        direction,
        futureExpense: null,
        futureIncome: null,
      });
    }

    if (Object.keys(fieldErrorsByRowId).length > 0) {
      return {
        ok: false as const,
        error: "Existem linhas com erro. Corrija os itens destacados e tente novamente.",
        fieldErrorsByRowId,
      };
    }

    for (const { reviewedRow, dbRow, direction, futureExpense, futureIncome } of validRows) {
      const periodMonth = getPeriodMonthFromDate(dbRow.transactionDate);

      if (reviewedRow.decision === "ignore") {
        await tx
          .update(statementImportRows)
          .set({ status: "ignored", updatedAt: sql`now()` })
          .where(eq(statementImportRows.id, dbRow.id));
        ignoredCount += 1;
        continue;
      }

      if (direction === "expense") {
        if (reviewedRow.mode === "linked") {
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
          await upsertReviewedImportRule(tx, "expense", reviewedRow);
          continue;
        }

        if (reviewedRow.mode === "future") {
          const futureExpenseCategory = reviewedRow.category ?? futureExpense?.category ?? null;
          const futureExpenseType = reviewedRow.expenseType ?? futureExpense?.expenseType ?? null;
          const futureExpenseOccurrenceType =
            reviewedRow.occurrenceType ?? futureExpense?.occurrenceType ?? null;

          const inserted = await tx
            .insert(monthlyExpenseEntries)
            .values({
              monthlyExpenseId: null,
              name: reviewedRow.description.trim(),
              category: futureExpenseCategory,
              expenseType: futureExpenseType,
              occurrenceType: futureExpenseOccurrenceType,
              periodMonth,
              amount: dbRow.amountCents,
              paidAt: dbRow.transactionDate,
              paymentMethod: null,
              notes: null,
              updatedAt: sql`now()`,
            })
            .returning({ id: monthlyExpenseEntries.id });

          await tx
            .update(futureExpensePayables)
            .set({
              status: "realizado",
              realizedEntryId: inserted[0].id,
              updatedAt: sql`now()`,
            })
            .where(eq(futureExpensePayables.id, futureExpense?.id ?? reviewedRow.futureExpensePayableId ?? ""));

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
          await upsertReviewedImportRule(tx, "expense", reviewedRow);
          continue;
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
        await upsertReviewedImportRule(tx, "expense", reviewedRow);
        continue;
      }

      if (reviewedRow.mode === "linked") {
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
        await upsertReviewedImportRule(tx, "income", reviewedRow);
        continue;
      }

      if (reviewedRow.mode === "future") {
        const futureIncomeCategory = reviewedRow.category ?? futureIncome?.category ?? null;

        const inserted = await tx
          .insert(monthlyIncomeEntries)
          .values({
            monthlyIncomeId: null,
            name: reviewedRow.description.trim(),
            category: futureIncomeCategory,
            periodMonth,
            amount: dbRow.amountCents,
            receivedAt: dbRow.transactionDate,
            paymentMethod: null,
            notes: null,
            updatedAt: sql`now()`,
          })
          .returning({ id: monthlyIncomeEntries.id });

        await tx
          .update(futureIncomeReceivables)
          .set({
            status: "recebida",
            receivedEntryId: inserted[0].id,
            updatedAt: sql`now()`,
          })
          .where(
            eq(futureIncomeReceivables.id, futureIncome?.id ?? reviewedRow.futureIncomeReceivableId ?? "")
          );

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
        await upsertReviewedImportRule(tx, "income", reviewedRow);
        continue;
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
      await upsertReviewedImportRule(tx, "income", reviewedRow);
    }

    const batchStatus = getBatchStatus(committedCount, ignoredCount);
    await tx
      .update(statementImportBatches)
      .set({ status: batchStatus, updatedAt: sql`now()` })
      .where(eq(statementImportBatches.id, batchId));

    return { ok: true as const, committedCount, ignoredCount, batchStatus };
  });

  return result;
}
