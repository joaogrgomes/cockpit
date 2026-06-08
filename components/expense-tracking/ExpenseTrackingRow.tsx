"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { getLocalDateInputValue } from "@/lib/date-utils";
import {
  getExpenseCategoryLabel,
  getExpenseTypeLabel,
} from "@/lib/expenses";
import type { ExpenseTrackingItemView } from "@/lib/services/monthly-expense-entry.service";
import { ExpenseEntryForm } from "./ExpenseEntryForm";
import { ExpenseEntryHistory } from "./ExpenseEntryHistory";
import { ExpenseTrackingStatusBadge } from "./ExpenseTrackingStatusBadge";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type ExpenseTrackingRowProps = {
  item: ExpenseTrackingItemView;
  periodMonth: string;
  createAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
  deleteAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

function dueLabel(dueDay: number | null): string {
  if (typeof dueDay === "number") {
    return `Dia ${dueDay}`;
  }

  return "-";
}

export function ExpenseTrackingRow({
  item,
  periodMonth,
  createAction,
  deleteAction,
}: ExpenseTrackingRowProps) {
  const [showEntries, setShowEntries] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isPendingQuick, startQuick] = useTransition();
  const router = useRouter();
  const remainingClassName = useMemo(() => {
    if (item.remainingAmount < 0) return "text-destructive";
    if (item.remainingAmount === 0) return "text-emerald-700 dark:text-emerald-300";
    return "text-foreground";
  }, [item.remainingAmount]);

  return (
    <>
      <TableRow className="border-border/70 hover:bg-muted/25">
        <TableCell className="py-3 text-sm text-muted-foreground">
          {dueLabel(item.dueDay)}
        </TableCell>
        <TableCell className="py-3 font-medium text-foreground">{item.name}</TableCell>
        <TableCell className="py-3 text-sm text-muted-foreground">
          {getExpenseCategoryLabel(item.category)}
        </TableCell>
        <TableCell className="py-3 text-sm text-muted-foreground">
          {getExpenseTypeLabel(item.expenseType)}
        </TableCell>
        <TableCell className="py-3 font-medium">{formatBRL(item.plannedAmount)}</TableCell>
        <TableCell className="py-3 font-medium">{formatBRL(item.actualAmount)}</TableCell>
        <TableCell className={`py-3 font-medium ${remainingClassName}`}>
          {formatBRL(item.remainingAmount)}
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <ExpenseTrackingStatusBadge status={item.displayStatus} />
            {item.isOverdue ? (
              <Badge variant="destructive" title={item.overdueReason ?? undefined}>
                Atrasado
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-wrap gap-2">
            <ExpenseEntryForm
              monthlyExpenseId={item.monthlyExpenseId}
              periodMonth={periodMonth}
              action={createAction}
            />

            {item.expenseType === "fixo" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPendingQuick}
                onClick={() => {
                  setQuickError(null);
                  startQuick(async () => {
                    const formData = new FormData();
                    formData.set("monthlyExpenseId", item.monthlyExpenseId);
                    formData.set("periodMonth", periodMonth);
                    formData.set("amount", String(item.plannedAmount));
                    formData.set("paidAt", getLocalDateInputValue());
                    formData.set("paymentMethod", "");
                    formData.set("notes", "");

                    const result = await createAction(formData);
                    if (!result.ok) {
                      setQuickError(result.error ?? "Não foi possível registrar valor previsto.");
                      return;
                    }

                    router.refresh();
                  });
                }}
              >
                {isPendingQuick ? "Salvando..." : "Registrar valor previsto"}
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowEntries((current) => !current)}
            >
              {showEntries ? "Ocultar lançamentos" : `Ver lançamentos (${item.entries.length})`}
            </Button>
          </div>
          {quickError ? <p className="mt-2 text-xs text-destructive">{quickError}</p> : null}
        </TableCell>
      </TableRow>

      {showEntries ? (
        <TableRow className="border-border/50 bg-muted/15">
          <TableCell colSpan={9} className="py-3">
            <ExpenseEntryHistory entries={item.entries} deleteAction={deleteAction} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
