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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import {
  getExpenseCategoryLabel,
  getExpenseTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/expenses";
import type { ExpenseTrackingOneTimeEntryView } from "@/lib/services/monthly-expense-entry.service";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type OneTimeExpenseEntriesListProps = {
  entries: ExpenseTrackingOneTimeEntryView[];
  deleteAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function OneTimeExpenseEntriesList({
  entries,
  deleteAction,
}: OneTimeExpenseEntriesListProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum gasto avulso registrado neste mês.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="border-border/70 hover:bg-muted/20">
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.paidAt)}
                  </TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getExpenseCategoryLabel(entry.category)}</Badge>
                  </TableCell>
                  <TableCell>{getExpenseTypeLabel(entry.expenseType)}</TableCell>
                  <TableCell className="font-medium">{formatBRL(entry.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getPaymentMethodLabel(entry.paymentMethod)}
                  </TableCell>
                  <TableCell>
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
                          <AlertDialogTitle>Excluir gasto avulso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação remove o lançamento avulso selecionado.
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
                                  setError(result.error ?? "Falha ao excluir gasto avulso.");
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {entries.some((entry) => entry.notes) ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {entries
            .filter((entry) => entry.notes)
            .map((entry) => (
              <p key={`note-${entry.id}`}>
                <span className="font-medium text-foreground">{entry.name}:</span> {entry.notes}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  );
}
