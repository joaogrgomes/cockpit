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
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import type { FutureIncomeReceivable } from "@/types";
import { IncomeCategoryBadge } from "./IncomeCategoryBadge";
import { FutureIncomeForm } from "./FutureIncomeForm";
import { FutureIncomeStatusBadge } from "./FutureIncomeStatusBadge";
import { MarkFutureIncomeReceivedForm } from "./MarkFutureIncomeReceivedForm";

type FutureIncomeActionResult = {
  ok: boolean;
  error?: string;
};

type FutureIncomeRowProps = {
  futureIncome: FutureIncomeReceivable;
  updateAction: (formData: FormData) => Promise<FutureIncomeActionResult>;
  cancelAction: (formData: FormData) => Promise<FutureIncomeActionResult>;
  markAsReceivedAction: (formData: FormData) => Promise<FutureIncomeActionResult>;
};

export function FutureIncomeRow({
  futureIncome,
  updateAction,
  cancelAction,
  markAsReceivedAction,
}: FutureIncomeRowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingCancel, startCancel] = useTransition();

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 text-sm text-muted-foreground">
        {formatDateOnlyBR(futureIncome.expectedDate)}
      </TableCell>
      <TableCell className="py-3 font-medium text-foreground">{futureIncome.name}</TableCell>
      <TableCell className="py-3">
        <IncomeCategoryBadge category={futureIncome.category} />
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(futureIncome.expectedAmount)}</TableCell>
      <TableCell className="py-3">
        <FutureIncomeStatusBadge status={futureIncome.status} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FutureIncomeForm
            mode="edit"
            futureIncome={futureIncome}
            action={updateAction}
          />
          <MarkFutureIncomeReceivedForm
            futureIncome={futureIncome}
            action={markAsReceivedAction}
          />

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={futureIncome.status !== "prevista"}
                >
                  Cancelar
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar entrada futura?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação muda o status para cancelada e remove a previsão do fluxo.
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
                      formData.set("id", futureIncome.id);
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
