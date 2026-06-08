"use client";

import { useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnlyBR } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { getIncomeCategoryLabel, getIncomePaymentMethodLabel } from "@/lib/incomes";
import type { OneTimeIncomeEntryView } from "@/lib/services/monthly-income-entry.service";

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type OneTimeIncomeEntriesProps = {
  entries: OneTimeIncomeEntryView[];
  deleteAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

export function OneTimeIncomeEntries({
  entries,
  deleteAction,
}: OneTimeIncomeEntriesProps) {
  const router = useRouter();
  const [isPendingDelete, startDelete] = useTransition();

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Entradas avulsas</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Sem entradas avulsas neste mês.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="border-border/70 hover:bg-muted/25">
                    <TableCell>{formatDateOnlyBR(entry.receivedAt)}</TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>{getIncomeCategoryLabel(entry.category)}</TableCell>
                    <TableCell className="font-medium">{formatBRL(entry.amount)}</TableCell>
                    <TableCell>{getIncomePaymentMethodLabel(entry.paymentMethod)}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button type="button" size="sm" variant="ghost">
                              Excluir
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir entrada avulsa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação remove o lançamento recebido do mês selecionado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={isPendingDelete}
                              onClick={() => {
                                startDelete(async () => {
                                  const formData = new FormData();
                                  formData.set("id", entry.id);
                                  const result = await deleteAction(formData);
                                  if (!result.ok) {
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
      </CardContent>
    </Card>
  );
}
