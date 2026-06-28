"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentPeriodMonth } from "@/lib/recurrence-period";
import {
  getMonthlyExpenseActivePause,
  getMonthlyExpensePausePeriodLabel,
  type MonthlyExpensePauseLike,
} from "@/lib/monthly-expense-pauses";
import type { MonthlyExpense } from "@/types";

type MonthlyExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type MonthlyExpensePauseFormState = {
  startMonth: string;
  endMonth: string;
  reason: string;
};

type MonthlyExpensePauseSectionProps = {
  expense: MonthlyExpense;
  pauses: MonthlyExpensePauseLike[];
  createAction: (formData: FormData) => Promise<MonthlyExpenseActionResult>;
  updateAction: (formData: FormData) => Promise<MonthlyExpenseActionResult>;
  deleteAction: (formData: FormData) => Promise<MonthlyExpenseActionResult>;
};

function createPauseFormState(pause?: MonthlyExpensePauseLike | null): MonthlyExpensePauseFormState {
  return {
    startMonth: pause?.startMonth ?? getCurrentPeriodMonth(),
    endMonth: pause?.endMonth ?? "",
    reason: pause?.reason ?? "",
  };
}

function PauseDeleteButton({
  pause,
  deleteAction,
}: {
  pause: MonthlyExpensePauseLike;
  deleteAction: (formData: FormData) => Promise<MonthlyExpenseActionResult>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm">
            Excluir
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pausa?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove a pausa do histórico, mas não altera o planejamento mensal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const formData = new FormData();
                  formData.set("pauseId", pause.id ?? "");
                  const result = await deleteAction(formData);
                  if (!result.ok) {
                    setError(result.error ?? "Não foi possível excluir a pausa.");
                    return;
                  }

                  router.refresh();
                } catch {
                  setError("Não foi possível excluir a pausa.");
                }
              });
            }}
          >
            {isPending ? "Excluindo..." : "Confirmar exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MonthlyExpensePauseSection({
  expense,
  pauses,
  createAction,
  updateAction,
  deleteAction,
}: MonthlyExpensePauseSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingPause, setEditingPause] = useState<MonthlyExpensePauseLike | null>(null);
  const [formValues, setFormValues] = useState<MonthlyExpensePauseFormState>(
    createPauseFormState()
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues(createPauseFormState(editingPause));
    setError(null);
  }, [editingPause?.id, open]);

  const currentPause = getMonthlyExpenseActivePause(pauses, getCurrentPeriodMonth());

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            {pauses.length > 0 ? "Pausas" : "Pausar"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Pausas de {expense.name}</SheetTitle>
          <SheetDescription>
            Suspenda este planejamento por um intervalo de meses. A pausa não altera os valores
            do gasto, apenas a vigência nas telas de conferência e projeção.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {currentPause ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Pausa ativa</Badge>
                <span className="font-medium">
                  {getMonthlyExpensePausePeriodLabel(currentPause)}
                </span>
              </div>
              {currentPause.reason ? (
                <p className="mt-2 text-muted-foreground">{currentPause.reason}</p>
              ) : null}
            </div>
          ) : null}

          <form
            className="space-y-4 rounded-lg border border-border/70 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);

              const formData = new FormData(event.currentTarget);
              formData.set("monthlyExpenseId", expense.id);
              if (editingPause?.id) {
                formData.set("pauseId", editingPause.id);
              }

              startTransition(async () => {
                try {
                  const result = editingPause?.id
                    ? await updateAction(formData)
                    : await createAction(formData);

                  if (!result.ok) {
                    setError(result.error ?? "Não foi possível salvar a pausa.");
                    return;
                  }

                  setEditingPause(null);
                  setFormValues(createPauseFormState());
                  setOpen(false);
                  router.refresh();
                } catch {
                  setError("Não foi possível salvar a pausa.");
                }
              });
            }}
          >
            {editingPause?.id ? <input type="hidden" name="pauseId" value={editingPause.id} /> : null}
            <input type="hidden" name="monthlyExpenseId" value={expense.id} />

            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {editingPause ? "Editar pausa" : "Nova pausa"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {editingPause ? "Ajuste as datas ou a justificativa." : "Crie uma pausa para este planejamento."}
                </p>
              </div>

              {editingPause ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingPause(null);
                    setFormValues(createPauseFormState());
                  }}
                >
                  Nova pausa
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`startMonth-${expense.id}`}>Início</Label>
                <Input
                  id={`startMonth-${expense.id}`}
                  name="startMonth"
                  type="month"
                  value={formValues.startMonth}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      startMonth: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`endMonth-${expense.id}`}>Fim (opcional)</Label>
                <Input
                  id={`endMonth-${expense.id}`}
                  name="endMonth"
                  type="month"
                  value={formValues.endMonth}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      endMonth: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`reason-${expense.id}`}>Motivo</Label>
                <Textarea
                  id={`reason-${expense.id}`}
                  name="reason"
                  value={formValues.reason}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <SheetFooter className="px-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Salvando..."
                  : editingPause
                    ? "Salvar pausa"
                    : "Criar pausa"}
              </Button>
            </SheetFooter>
          </form>

          <Separator />

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Histórico de pausas</h3>
              <p className="text-xs text-muted-foreground">
                Veja as pausas já cadastradas e edite ou remova quando necessário.
              </p>
            </div>

            {pauses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Nenhuma pausa cadastrada para este planejamento.
              </div>
            ) : (
              <div className="space-y-3">
                {pauses.map((pause) => (
                  <article key={pause.id} className="rounded-lg border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {getMonthlyExpensePausePeriodLabel(pause)}
                          </Badge>
                          {pause.endMonth ? null : (
                            <Badge variant="secondary">Sem previsão de retorno</Badge>
                          )}
                        </div>
                        {pause.reason ? (
                          <p className="text-sm text-muted-foreground">{pause.reason}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem motivo informado.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPause(pause);
                            setFormValues(createPauseFormState(pause));
                          }}
                        >
                          Editar
                        </Button>
                        <PauseDeleteButton pause={pause} deleteAction={deleteAction} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
