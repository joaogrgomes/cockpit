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

type CashFlowActionResult = {
  ok: boolean;
  error?: string;
};

type MonthClosingActionsProps = {
  periodMonth: string;
  isClosed: boolean;
  canClose: boolean;
  closeAction: (formData: FormData) => Promise<CashFlowActionResult>;
  reopenAction: (formData: FormData) => Promise<CashFlowActionResult>;
};

export function MonthClosingActions({
  periodMonth,
  isClosed,
  canClose,
  closeAction,
  reopenAction,
}: MonthClosingActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isClosed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900">
          Fechado
        </Badge>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" variant="outline" disabled={isPending}>
                Reabrir
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir mês?</AlertDialogTitle>
              <AlertDialogDescription>
                Reabrir este mês fará o fluxo voltar à regra dinâmica de planejado vs realizado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.set("periodMonth", periodMonth);
                    const result = await reopenAction(formData);
                    if (!result.ok) {
                      setError(result.error ?? "Falha ao reabrir mês.");
                      return;
                    }

                    router.refresh();
                  });
                }}
              >
                {isPending ? "Reabrindo..." : "Confirmar reabertura"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="outline" disabled={!canClose || isPending}>
              Fechar mês
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar este mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Fechar este mês fará o fluxo usar apenas os valores realizados. Valores planejados deixarão de contar neste mês. Você poderá reabrir depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canClose || isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const formData = new FormData();
                  formData.set("periodMonth", periodMonth);
                  const result = await closeAction(formData);
                  if (!result.ok) {
                    setError(result.error ?? "Falha ao fechar mês.");
                    return;
                  }

                  router.refresh();
                });
              }}
            >
              {isPending ? "Fechando..." : "Confirmar fechamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!canClose ? (
        <span className="text-xs text-muted-foreground">Mês futuro não pode ser fechado</span>
      ) : null}
    </div>
  );
}
