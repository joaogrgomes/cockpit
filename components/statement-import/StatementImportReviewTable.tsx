"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { StatementImportActionResult } from "@/app/statement/import/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  EXPENSE_TYPE_VALUES,
  getExpenseCategoryLabel,
  getExpenseOccurrenceTypeLabel,
  getExpenseTypeLabel,
} from "@/lib/expenses";
import { formatRecurrencePeriodLabel } from "@/lib/recurrence-period";
import { INCOME_CATEGORY_VALUES, getIncomeCategoryLabel } from "@/lib/incomes";
import {
  getAutoSelectedStatementImportMonthlyPlanId,
  getCompatibleStatementImportMonthlyPlans,
  type StatementImportDecision,
} from "@/lib/statement-import";
import type {
  MonthlyExpense,
  MonthlyIncome,
  StatementImportRow,
  StatementImportRowStatus,
} from "@/types";

type ReviewedRowState = {
  rowId: string;
  decision: StatementImportDecision;
  description: string;
  category: string | null;
  mode: "linked" | "one_time";
  monthlyExpenseId: string | null;
  monthlyIncomeId: string | null;
  expenseType: (typeof EXPENSE_TYPE_VALUES)[number] | null;
  occurrenceType: (typeof EXPENSE_OCCURRENCE_TYPE_VALUES)[number] | null;
};

type StatementImportReviewedTableProps = {
  batchId: string;
  rows: StatementImportRow[];
  monthlyExpenses: MonthlyExpense[];
  monthlyIncomes: MonthlyIncome[];
  action: (
    prevState: StatementImportActionResult,
    formData: FormData
  ) => Promise<StatementImportActionResult>;
};

const initialState: StatementImportActionResult = { ok: false };

function buildReviewedRowState(row: StatementImportRow): ReviewedRowState {
  const isLinkedSuggestion = Boolean(row.suggestedMonthlyExpenseId || row.suggestedMonthlyIncomeId);

  return {
    rowId: row.id,
    decision: row.status === "pending" ? "import" : "ignore",
    description: row.description,
    category: row.suggestedCategory ?? null,
    mode: isLinkedSuggestion ? "linked" : "one_time",
    monthlyExpenseId: row.suggestedMonthlyExpenseId ?? null,
    monthlyIncomeId: row.suggestedMonthlyIncomeId ?? null,
    expenseType: row.suggestedExpenseType ?? null,
    occurrenceType: row.suggestedOccurrenceType ?? null,
  };
}

function getRowMonth(row: StatementImportRow): string {
  return row.transactionDate.slice(0, 7);
}

function formatRowStatus(status: StatementImportRowStatus): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "ignored":
      return "Ignorada";
    case "committed":
      return "Importada";
    case "skipped_duplicate":
      return "Duplicada";
  }
}

function formatExpensePlanLabel(expense: MonthlyExpense): string {
  return [
    expense.name,
    getExpenseCategoryLabel(expense.category),
    getExpenseTypeLabel(expense.expenseType),
    formatRecurrencePeriodLabel(expense.startMonth, expense.endMonth),
    formatBRL(expense.amount),
  ].join(" · ");
}

function formatIncomePlanLabel(income: MonthlyIncome): string {
  return [
    income.name,
    getIncomeCategoryLabel(income.category),
    formatRecurrencePeriodLabel(income.startMonth, income.endMonth),
    formatBRL(income.amount),
  ].join(" · ");
}

export function StatementImportReviewTable({
  batchId,
  rows,
  monthlyExpenses,
  monthlyIncomes,
  action,
}: StatementImportReviewedTableProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [rowStates, setRowStates] = useState<Record<string, ReviewedRowState>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, buildReviewedRowState(row)]))
  );
  const [rowErrorsById, setRowErrorsById] = useState<Record<string, string[]>>({});

  const pendingRows = useMemo(() => rows.filter((row) => row.status === "pending"), [rows]);
  const hasPendingRows = pendingRows.length > 0;
  const rowsSignature = useMemo(
    () =>
      rows
        .map(
          (row) =>
            [
              row.id,
              row.status,
              row.isSuggested ? "1" : "0",
              row.suggestedCategory ?? "",
              row.suggestedMonthlyExpenseId ?? "",
              row.suggestedMonthlyIncomeId ?? "",
            ].join(":")
        )
        .join("|"),
    [rows]
  );

  useEffect(() => {
    setRowStates(Object.fromEntries(rows.map((row) => [row.id, buildReviewedRowState(row)])));
    setRowErrorsById({});
  }, [rowsSignature]);

  useEffect(() => {
    if (!state.ok && state.fieldErrorsByRowId) {
      setRowErrorsById(state.fieldErrorsByRowId);
      return;
    }

    setRowErrorsById({});
  }, [state]);

  function updateRow(rowId: string, updater: (current: ReviewedRowState) => ReviewedRowState) {
    setRowStates((current) => {
      const existing = current[rowId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [rowId]: updater(existing),
      };
    });
  }

  function syncPlanSelection(
    row: StatementImportRow,
    nextCategory: string | null,
    nextMode: ReviewedRowState["mode"],
    currentState: ReviewedRowState
  ) {
    const rowMonth = getRowMonth(row);

    return {
      monthlyExpenseId:
        row.direction === "expense" && nextMode === "linked"
          ? getAutoSelectedStatementImportMonthlyPlanId(
              rowMonth,
              nextCategory,
              monthlyExpenses,
              currentState.monthlyExpenseId
            )
          : null,
      monthlyIncomeId:
        row.direction === "income" && nextMode === "linked"
          ? getAutoSelectedStatementImportMonthlyPlanId(
              rowMonth,
              nextCategory,
              monthlyIncomes,
              currentState.monthlyIncomeId
            )
          : null,
    };
  }

  const reviewedRows = rows
    .map((row) => rowStates[row.id])
    .filter((row): row is ReviewedRowState => Boolean(row));

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Revisão das linhas</CardTitle>
        <CardDescription>
          Escolha o que entra no Cockpit e o que será ignorado antes de confirmar a importação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="batchId" value={batchId} />
          <input type="hidden" name="rowsJson" value={JSON.stringify(reviewedRows)} />

          {Object.keys(rowErrorsById).length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Existem linhas com erro. Corrija os itens destacados e tente novamente.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Saldo após</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Decisão</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Tipo avulso</TableHead>
                  <TableHead>Ocorrência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const rowState = rowStates[row.id];
                  const rowMonth = getRowMonth(row);
                  const isExpense = row.direction === "expense";
                  const categoryValues = isExpense ? EXPENSE_CATEGORY_VALUES : INCOME_CATEGORY_VALUES;
                  const compatibleExpensePlans = getCompatibleStatementImportMonthlyPlans(
                    rowMonth,
                    rowState?.category ?? null,
                    monthlyExpenses
                  );
                  const compatibleIncomePlans = getCompatibleStatementImportMonthlyPlans(
                    rowMonth,
                    rowState?.category ?? null,
                    monthlyIncomes
                  );
                  const isPending = row.status === "pending";
                  const isIgnored = rowState?.decision === "ignore";
                  const isLinked = rowState?.mode === "linked";
                  const rowErrors = rowErrorsById[row.id] ?? [];

                  return (
                    <TableRow
                      key={row.id}
                      className={[
                        isIgnored ? "opacity-60" : "",
                        rowErrors.length > 0 ? "bg-red-50/60 dark:bg-red-950/20" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <TableCell className="align-top whitespace-nowrap">
                        {formatDateOnlyBR(row.transactionDate)}
                      </TableCell>
                      <TableCell className="min-w-72 align-top">
                        <div className="space-y-2">
                          {row.isSuggested ? (
                            <Badge variant="secondary" className="w-fit rounded-full px-2 py-0.5 text-[11px]">
                              Sugerido
                            </Badge>
                          ) : null}
                          <Input
                            value={rowState?.description ?? row.description}
                            disabled={!isPending}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                          {row.rawHistory ? (
                            <p className="text-xs text-muted-foreground">{row.rawHistory}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        {formatBRL(row.amountCents)}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        {row.balanceAfterCents === null ? "-" : formatBRL(row.balanceAfterCents)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={row.direction === "income" ? "default" : "secondary"}>
                          {row.direction === "income" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <select
                          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                          disabled={!isPending}
                          value={rowState?.decision ?? "import"}
                          onChange={(event) =>
                            updateRow(row.id, (current) => ({
                              ...current,
                              decision: event.target.value as StatementImportDecision,
                            }))
                          }
                        >
                          <option value="import">Importar</option>
                          <option value="ignore">Ignorar</option>
                        </select>
                      </TableCell>
                      <TableCell className="align-top min-w-40">
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                            disabled={!isPending || isIgnored}
                            value={rowState?.category ?? ""}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                category: event.target.value || null,
                                ...syncPlanSelection(row, event.target.value || null, current.mode, current),
                              }))
                            }
                          >
                          <option value="">Selecione</option>
                          {categoryValues.map((category) => (
                            <option key={category} value={category}>
                              {isExpense
                                ? getExpenseCategoryLabel(category)
                                : getIncomeCategoryLabel(category)}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="align-top min-w-64">
                        <div className="space-y-2">
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                            disabled={!isPending || isIgnored}
                            value={rowState?.mode ?? "one_time"}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                mode: event.target.value as ReviewedRowState["mode"],
                                ...syncPlanSelection(
                                  row,
                                  current.category,
                                  event.target.value as ReviewedRowState["mode"],
                                  current
                                ),
                              }))
                            }
                          >
                            <option value="one_time">Avulso</option>
                            <option value="linked">Planejamento</option>
                          </select>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                            disabled={!isPending || isIgnored || rowState?.mode !== "linked" || !rowState?.category}
                            value={
                              isExpense
                                ? rowState?.monthlyExpenseId ?? ""
                                : rowState?.monthlyIncomeId ?? ""
                            }
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                monthlyExpenseId: isExpense ? event.target.value || null : null,
                                monthlyIncomeId: !isExpense ? event.target.value || null : null,
                              }))
                            }
                          >
                            {rowState?.mode !== "linked" ? (
                              <option value="">Escolha “Planejamento” acima</option>
                            ) : rowState?.category ? (
                              <>
                                <option value="">
                                  Selecione o planejamento
                                </option>
                                {isExpense
                                  ? compatibleExpensePlans.map((expense) => (
                                      <option key={expense.id} value={expense.id}>
                                        {formatExpensePlanLabel(expense)}
                                      </option>
                                    ))
                                  : compatibleIncomePlans.map((income) => (
                                      <option key={income.id} value={income.id}>
                                        {formatIncomePlanLabel(income)}
                                      </option>
                                    ))}
                              </>
                            ) : (
                              <option value="">Escolha a categoria acima</option>
                            )}
                          </select>
                          {rowState?.category ? (
                            <p className="text-xs text-muted-foreground">
                              {isExpense
                                ? compatibleExpensePlans.length > 0
                                  ? `${compatibleExpensePlans.length} planejamento(s) compatível(eis) para ${rowMonth}.`
                                  : "Sem planejamento compatível para esta categoria e mês."
                                : compatibleIncomePlans.length > 0
                                  ? `${compatibleIncomePlans.length} planejamento(s) compatível(eis) para ${rowMonth}.`
                                  : "Sem planejamento compatível para esta categoria e mês."}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Escolha a categoria para ver os planejamentos compatíveis.
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top min-w-40">
                        {isExpense ? (
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                            disabled={!isPending || isIgnored || isLinked}
                            value={rowState?.expenseType ?? ""}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                expenseType: (event.target.value as ReviewedRowState["expenseType"]) || null,
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {EXPENSE_TYPE_VALUES.map((value) => (
                              <option key={value} value={value}>
                                {getExpenseTypeLabel(value)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top min-w-48">
                        {isExpense ? (
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                            disabled={!isPending || isIgnored || isLinked}
                            value={rowState?.occurrenceType ?? ""}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                occurrenceType: (event.target.value as ReviewedRowState["occurrenceType"]) || null,
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {EXPENSE_OCCURRENCE_TYPE_VALUES.map((value) => (
                              <option key={value} value={value}>
                                {getExpenseOccurrenceTypeLabel(value)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <Badge
                          variant={
                            row.status === "pending"
                              ? "secondary"
                              : row.status === "committed"
                                ? "default"
                                : row.status === "ignored"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {formatRowStatus(row.status)}
                        </Badge>
                        {rowErrors.length > 0 ? (
                          <div className="mt-2 space-y-1 text-xs text-destructive">
                            {rowErrors.map((error, index) => (
                              <p key={`${row.id}:${index}`}>{error}</p>
                            ))}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {hasPendingRows
                ? "As linhas importadas serão gravadas apenas após confirmação."
                : "Todas as linhas deste lote já foram processadas."}
            </p>
            {hasPendingRows ? (
              <Button type="submit" disabled={!hasPendingRows}>
                Confirmar importação
              </Button>
            ) : null}
          </div>

          {state.error && Object.keys(rowErrorsById).length === 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
