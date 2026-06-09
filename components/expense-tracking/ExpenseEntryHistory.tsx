"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { getPaymentMethodLabel } from "@/lib/expenses";
import type { ExpenseTrackingEntryView } from "@/lib/services/monthly-expense-entry.service";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type ExpenseEntryHistoryProps = {
  entries: ExpenseTrackingEntryView[];
  expenseName: string;
  deleteAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

export function ExpenseEntryHistory({
  entries,
  expenseName,
  deleteAction,
}: ExpenseEntryHistoryProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const router = useRouter();

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem lançamentos neste mês.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate font-medium text-foreground">
                {entry.name ?? expenseName}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{formatBRL(entry.amount)}</p>
                <Badge variant="outline">{formatDateOnlyBR(entry.paidAt)}</Badge>
                {entry.paymentMethod ? (
                <Badge variant="outline">{getPaymentMethodLabel(entry.paymentMethod)}</Badge>
                ) : null}
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="ghost" size="sm">
                    Excluir
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove o lançamento selecionado deste mês.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isPendingDelete}
                    onClick={() => {
                      setError(null);
                      startDelete(async () => {
                        const formData = new FormData();
                        formData.set("id", entry.id);
                        const result = await deleteAction(formData);
                        if (!result.ok) {
                          setError(result.error ?? "Falha ao excluir lançamento.");
                          return;
                        }

                        router.refresh();
                      });
                    }}
                  >
                    {isPendingDelete ? "Excluindo..." : "Confirmar exclusão"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {entry.notes ? <p className="mt-1 text-muted-foreground">{entry.notes}</p> : null}
        </div>
      ))}
    </div>
  );
}
