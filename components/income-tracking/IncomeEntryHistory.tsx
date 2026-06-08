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
import { getIncomePaymentMethodLabel } from "@/lib/incomes";
import type { IncomeTrackingEntryView } from "@/lib/services/monthly-income-entry.service";

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type IncomeEntryHistoryProps = {
  entries: IncomeTrackingEntryView[];
  deleteAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

export function IncomeEntryHistory({ entries, deleteAction }: IncomeEntryHistoryProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const router = useRouter();

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem recebimentos neste mês.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{formatBRL(entry.amount)}</p>
              <Badge variant="outline">{formatDateOnlyBR(entry.receivedAt)}</Badge>
              {entry.paymentMethod ? (
                <Badge variant="outline">{getIncomePaymentMethodLabel(entry.paymentMethod)}</Badge>
              ) : null}
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
                  <AlertDialogTitle>Excluir recebimento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove o lançamento recebido deste mês.
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
                          setError(result.error ?? "Falha ao excluir recebimento.");
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
