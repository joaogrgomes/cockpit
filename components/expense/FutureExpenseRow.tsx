"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import {
  getExpenseCategoryLabel,
  getExpenseOccurrenceTypeLabel,
  getExpenseTypeLabel,
} from "@/lib/expenses";
import type { FutureExpensePayable } from "@/types";
import { FutureExpenseForm } from "./FutureExpenseForm";
import { FutureExpenseStatusBadge } from "./FutureExpenseStatusBadge";
import { MarkFutureExpenseRealizedForm } from "./MarkFutureExpenseRealizedForm";

type FutureExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type FutureExpenseRowProps = {
  futureExpense: FutureExpensePayable;
  updateAction: (formData: FormData) => Promise<FutureExpenseActionResult>;
  cancelAction: (formData: FormData) => Promise<FutureExpenseActionResult>;
  markAsRealizedAction: (formData: FormData) => Promise<FutureExpenseActionResult>;
};

export function FutureExpenseRow({
  futureExpense,
  updateAction,
  cancelAction,
  markAsRealizedAction,
}: FutureExpenseRowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingCancel, startCancel] = useTransition();

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 text-sm text-muted-foreground">
        {formatDateOnlyBR(futureExpense.expectedDate)}
      </TableCell>
      <TableCell className="py-3 font-medium text-foreground">{futureExpense.name}</TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {getExpenseCategoryLabel(futureExpense.category)}
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {getExpenseTypeLabel(futureExpense.expenseType)}
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        <div className="flex flex-col gap-1">
          <Badge variant="secondary">
            {getExpenseOccurrenceTypeLabel(futureExpense.occurrenceType)}
          </Badge>
          {futureExpense.costAnalysisItemId ? (
            <Badge variant="outline" className="w-fit">
              Origem: Análise de Custo
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(futureExpense.expectedAmount)}</TableCell>
      <TableCell className="py-3">
        <FutureExpenseStatusBadge status={futureExpense.status} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FutureExpenseForm mode="edit" futureExpense={futureExpense} action={updateAction} />
          <MarkFutureExpenseRealizedForm
            futureExpense={futureExpense}
            action={markAsRealizedAction}
          />

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm" disabled={futureExpense.status !== "previsto"}>
                  Cancelar
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar gasto futuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação muda o status para cancelado e remove a previsão do fluxo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isPendingCancel}
                  onClick={() => {
                    setError(null);
                    startCancel(async () => {
                      const formData = new FormData();
                      formData.set("id", futureExpense.id);
                      const result = await cancelAction(formData);
                      if (!result.ok) {
                        setError(result.error ?? "Falha ao cancelar.");
                        return;
                      }

                      router.refresh();
                    });
                  }}
                >
                  {isPendingCancel ? "Cancelando..." : "Confirmar cancelamento"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
