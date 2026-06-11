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
import { getIncomePaymentMethodLabel } from "@/lib/incomes";
import { formatRecurrencePeriodLabel } from "@/lib/recurrence-period";
import type { MonthlyIncome } from "@/types";
import { IncomeCategoryBadge } from "./IncomeCategoryBadge";
import { IncomeStatusBadge } from "./IncomeStatusBadge";
import { MonthlyIncomeForm } from "./MonthlyIncomeForm";

type IncomeActionResult = {
  ok: boolean;
  error?: string;
};

type MonthlyIncomeRowProps = {
  income: MonthlyIncome;
  updateAction: (formData: FormData) => Promise<IncomeActionResult>;
  deleteAction: (formData: FormData) => Promise<IncomeActionResult>;
  toggleActiveAction: (formData: FormData) => Promise<IncomeActionResult>;
};

function expectedDayLabel(expectedDay: number | null): string {
  if (typeof expectedDay === "number") {
    return `Dia ${expectedDay}`;
  }
  return "-";
}

export function MonthlyIncomeRow({
  income,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: MonthlyIncomeRowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingToggle, startToggle] = useTransition();

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 text-sm text-muted-foreground">
        {expectedDayLabel(income.expectedDay)}
      </TableCell>
      <TableCell className="py-3 font-medium text-foreground">{income.name}</TableCell>
      <TableCell className="py-3">
        <IncomeCategoryBadge category={income.category} />
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {formatRecurrencePeriodLabel(income.startMonth, income.endMonth)}
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(income.amount)}</TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {getIncomePaymentMethodLabel(income.paymentMethod)}
      </TableCell>
      <TableCell className="py-3">
        <IncomeStatusBadge isActive={income.isActive} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <MonthlyIncomeForm mode="edit" income={income} action={updateAction} />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPendingToggle}
            onClick={() => {
              setError(null);
              startToggle(async () => {
                const formData = new FormData();
                formData.set("id", income.id);
                const result = await toggleActiveAction(formData);

                if (!result.ok) {
                  setError(result.error ?? "Não foi possível alterar o status.");
                  return;
                }

                router.refresh();
              });
            }}
          >
            {isPendingToggle
              ? "Atualizando..."
              : income.isActive
                ? "Desativar"
                : "Ativar"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm">
                  Excluir
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir entrada?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove a entrada planejada permanentemente.
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
                      formData.set("id", income.id);
                      const result = await deleteAction(formData);
                      if (!result.ok) {
                        setError(result.error ?? "Falha ao excluir entrada.");
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
      </TableCell>
    </TableRow>
  );
}
