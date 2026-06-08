"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { getLocalDateInputValue } from "@/lib/date-utils";
import { getIncomeCategoryLabel } from "@/lib/incomes";
import type { IncomeTrackingItemView } from "@/lib/services/monthly-income-entry.service";
import { IncomeEntryForm } from "./IncomeEntryForm";
import { IncomeEntryHistory } from "./IncomeEntryHistory";
import { IncomeTrackingStatusBadge } from "./IncomeTrackingStatusBadge";

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type IncomeTrackingRowProps = {
  item: IncomeTrackingItemView;
  periodMonth: string;
  createAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
  deleteAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

function expectedLabel(expectedDay: number | null): string {
  if (typeof expectedDay === "number") {
    return `Dia ${expectedDay}`;
  }

  return "-";
}

export function IncomeTrackingRow({
  item,
  periodMonth,
  createAction,
  deleteAction,
}: IncomeTrackingRowProps) {
  const [showEntries, setShowEntries] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isPendingQuick, startQuick] = useTransition();
  const router = useRouter();

  const remainingClassName = useMemo(() => {
    if (item.remainingAmount < 0) return "text-emerald-700 dark:text-emerald-300";
    if (item.remainingAmount === 0) return "text-muted-foreground";
    return "text-foreground";
  }, [item.remainingAmount]);

  return (
    <>
      <TableRow className="border-border/70 hover:bg-muted/25">
        <TableCell className="py-3 text-sm text-muted-foreground">
          {expectedLabel(item.expectedDay)}
        </TableCell>
        <TableCell className="py-3 font-medium text-foreground">{item.name}</TableCell>
        <TableCell className="py-3 text-sm text-muted-foreground">
          {getIncomeCategoryLabel(item.category)}
        </TableCell>
        <TableCell className="py-3 font-medium">{formatBRL(item.plannedAmount)}</TableCell>
        <TableCell className="py-3 font-medium">{formatBRL(item.actualAmount)}</TableCell>
        <TableCell className={`py-3 font-medium ${remainingClassName}`}>
          {formatBRL(item.remainingAmount)}
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <IncomeTrackingStatusBadge status={item.status} />
            {item.isOverdue ? (
              <Badge variant="destructive" title={item.overdueReason ?? undefined}>
                Atrasado
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="py-3">
          <div className="flex flex-wrap gap-2">
            <IncomeEntryForm
              monthlyIncomeId={item.monthlyIncomeId}
              periodMonth={periodMonth}
              action={createAction}
            />

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPendingQuick}
              onClick={() => {
                setQuickError(null);
                startQuick(async () => {
                  const formData = new FormData();
                  formData.set("monthlyIncomeId", item.monthlyIncomeId);
                  formData.set("periodMonth", periodMonth);
                  formData.set("amount", String(item.plannedAmount));
                  formData.set("receivedAt", getLocalDateInputValue());
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

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowEntries((current) => !current)}
            >
              {showEntries ? "Ocultar recebimentos" : `Ver recebimentos (${item.entries.length})`}
            </Button>
          </div>
          {quickError ? <p className="mt-2 text-xs text-destructive">{quickError}</p> : null}
        </TableCell>
      </TableRow>

      {showEntries ? (
        <TableRow className="border-border/50 bg-muted/15">
          <TableCell colSpan={8} className="py-3">
            <IncomeEntryHistory entries={item.entries} deleteAction={deleteAction} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
