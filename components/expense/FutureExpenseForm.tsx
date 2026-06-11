"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  EXPENSE_TYPE_VALUES,
  getExpenseCategoryLabel,
  getExpenseOccurrenceTypeLabel,
  getExpenseTypeLabel,
} from "@/lib/expenses";
import { normalizeDateOnly } from "@/lib/date-utils";
import type { FutureExpensePayable } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type FutureExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type FutureExpenseFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<FutureExpenseActionResult>;
  futureExpense?: FutureExpensePayable;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

function dateToInput(dateValue: string | Date): string {
  return normalizeDateOnly(dateValue) ?? "";
}

export function FutureExpenseForm({
  mode,
  action,
  futureExpense,
}: FutureExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditMode = mode === "edit";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={isEditMode ? "outline" : "default"}
            size="sm"
            disabled={isEditMode && futureExpense?.status !== "previsto"}
          >
            {isEditMode ? "Editar" : "Novo gasto futuro"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Editar gasto futuro" : "Novo gasto futuro"}
          </SheetTitle>
          <SheetDescription>
            Cadastre saídas únicas previstas para projetar seu caixa nos próximos meses.
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-6 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar o gasto futuro.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          {isEditMode && futureExpense?.id ? (
            <input type="hidden" name="id" value={futureExpense.id} />
          ) : null}
          {futureExpense?.costAnalysisItemId ? (
            <input type="hidden" name="costAnalysisItemId" value={futureExpense.costAnalysisItemId} />
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos obrigatórios</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Descrição</Label>
                <Input id="name" name="name" defaultValue={futureExpense?.name ?? ""} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={futureExpense?.category ?? "outros"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {EXPENSE_CATEGORY_VALUES.map((category) => (
                    <option key={category} value={category}>
                      {getExpenseCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseType">Tipo</Label>
                <select
                  id="expenseType"
                  name="expenseType"
                  defaultValue={futureExpense?.expenseType ?? "variavel"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {EXPENSE_TYPE_VALUES.map((expenseType) => (
                    <option key={expenseType} value={expenseType}>
                      {getExpenseTypeLabel(expenseType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occurrenceType">Classificação</Label>
                <select
                  id="occurrenceType"
                  name="occurrenceType"
                  defaultValue={futureExpense?.occurrenceType ?? "planned_one_off"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {EXPENSE_OCCURRENCE_TYPE_VALUES.map((occurrenceType) => (
                    <option key={occurrenceType} value={occurrenceType}>
                      {getExpenseOccurrenceTypeLabel(occurrenceType)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Esporádico planejado: pontual, mas previsto antes de acontecer.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedAmount">Valor previsto (BRL)</Label>
                <Input
                  id="expectedAmount"
                  name="expectedAmount"
                  placeholder="Ex.: R$ 3.000,00"
                  defaultValue={moneyToInput(futureExpense?.expectedAmount)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDate">Data prevista</Label>
                <Input
                  id="expectedDate"
                  name="expectedDate"
                  type="date"
                  defaultValue={
                    futureExpense?.expectedDate ? dateToInput(futureExpense.expectedDate) : ""
                  }
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Observações</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" defaultValue={futureExpense?.notes ?? ""} />
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditMode ? "Salvar alterações" : "Criar previsão"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
