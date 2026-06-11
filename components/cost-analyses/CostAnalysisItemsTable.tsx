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
  canScheduleFutureExpenseFromCostKind,
  getCostAnalysisKindBadgeVariant,
  getCostAnalysisKindLabel,
  type CostAnalysisItemView,
} from "@/lib/cost-analyses";
import { CostAnalysisItemForm } from "./CostAnalysisItemForm";
import { CostAnalysisScheduleExpenseForm } from "./CostAnalysisScheduleExpenseForm";

type CostAnalysisActionResult = {
  ok: boolean;
  error?: string;
};

type CostAnalysisItemsTableProps = {
  analysisId: string;
  analysisName: string;
  items: CostAnalysisItemView[];
  scheduledCountsByItemId: Record<string, number>;
  createFutureExpenseAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  deleteAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
};

function CostAnalysisItemRow({
  analysisId,
  analysisName,
  item,
  scheduledCount,
  createFutureExpenseAction,
  updateAction,
  deleteAction,
}: {
  analysisId: string;
  analysisName: string;
  item: CostAnalysisItemView;
  scheduledCount: number;
  createFutureExpenseAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  deleteAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPendingDelete, startDelete] = useTransition();

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 font-medium text-foreground">{item.name}</TableCell>
      <TableCell className="py-3">
        <Badge variant={getCostAnalysisKindBadgeVariant(item.costKind)}>
          {getCostAnalysisKindLabel(item.costKind)}
        </Badge>
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(item.monthlyAmountCents)}</TableCell>
      <TableCell className="py-3 text-muted-foreground">
        {formatBRL(item.annualAmountCents)}
      </TableCell>
      <TableCell className="py-3 text-sm text-muted-foreground">
        <div className="space-y-1">
          <p>{item.notes?.trim() ? item.notes : "—"}</p>
          {item.costKind === "provision" ? (
            <p className="text-xs text-muted-foreground">
              {scheduledCount > 0 ? `${scheduledCount} agendado(s)` : "Nenhum agendado"}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          {canScheduleFutureExpenseFromCostKind(item.costKind) ? (
            <CostAnalysisScheduleExpenseForm
              analysisId={analysisId}
              analysisName={analysisName}
              item={item}
              action={createFutureExpenseAction}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title={
                item.costKind === "cash"
                  ? "Lançar pelo extrato/acompanhamento."
                  : "Custo econômico não gera gasto futuro."
              }
            >
              Agendar gasto
            </Button>
          )}

          <CostAnalysisItemForm mode="edit" analysisId={analysisId} item={item} action={updateAction} />

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
                <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este item será removido da análise. Essa ação não altera o fluxo de caixa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isPendingDelete}
                  onClick={() => {
                    setError(null);
                    startDelete(async () => {
                      const formData = new FormData();
                      formData.set("analysisId", analysisId);
                      formData.set("itemId", item.id);

                      const result = await deleteAction(formData);
                      if (!result.ok) {
                        setError(result.error ?? "Falha ao excluir o item.");
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

export function CostAnalysisItemsTable({
  analysisId,
  analysisName,
  items,
  scheduledCountsByItemId,
  createFutureExpenseAction,
  updateAction,
  deleteAction,
}: CostAnalysisItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor mensal</TableHead>
            <TableHead>Valor anual</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhum item encontrado.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <CostAnalysisItemRow
                key={item.id}
                analysisId={analysisId}
                analysisName={analysisName}
                item={item}
                scheduledCount={scheduledCountsByItemId[item.id] ?? 0}
                createFutureExpenseAction={createFutureExpenseAction}
                updateAction={updateAction}
                deleteAction={deleteAction}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
