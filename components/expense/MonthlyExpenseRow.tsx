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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { getPaymentMethodLabel } from "@/lib/expenses";
import { formatRecurrencePeriodLabel } from "@/lib/recurrence-period";
import type { MonthlyExpense } from "@/types";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseTypeBadge } from "./ExpenseTypeBadge";
import { MonthlyExpenseForm } from "./MonthlyExpenseForm";

type ExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type MonthlyExpenseRowProps = {
  expense: MonthlyExpense;
  updateAction: (formData: FormData) => Promise<ExpenseActionResult>;
  deleteAction: (formData: FormData) => Promise<ExpenseActionResult>;
  toggleActiveAction: (formData: FormData) => Promise<ExpenseActionResult>;
};

function dueLabel(expense: MonthlyExpense): string {
  if (typeof expense.dueDay === "number") {
    return `Dia ${expense.dueDay}`;
  }

  if (expense.dueLabel) {
    return expense.dueLabel;
  }

  return "-";
}

export function MonthlyExpenseRow({
  expense,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: MonthlyExpenseRowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingToggle, startToggle] = useTransition();

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 text-sm text-muted-foreground">{dueLabel(expense)}</TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{expense.name}</span>
          {expense.isActive ? null : <Badge variant="outline">Inativo</Badge>}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <ExpenseCategoryBadge category={expense.category} />
      </TableCell>
      <TableCell className="py-3">
        <ExpenseTypeBadge expenseType={expense.expenseType} />
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {formatRecurrencePeriodLabel(expense.startMonth, expense.endMonth)}
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(expense.amount)}</TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        {getPaymentMethodLabel(expense.paymentMethod)}
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <MonthlyExpenseForm mode="edit" expense={expense} action={updateAction} />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPendingToggle}
            onClick={() => {
              setError(null);
              startToggle(async () => {
                const formData = new FormData();
                formData.set("id", expense.id);
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
              : expense.isActive
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
                <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove o gasto mensal permanentemente.
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
                      formData.set("id", expense.id);
                      const result = await deleteAction(formData);
                      if (!result.ok) {
                        setError(result.error ?? "Falha ao excluir gasto.");
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
