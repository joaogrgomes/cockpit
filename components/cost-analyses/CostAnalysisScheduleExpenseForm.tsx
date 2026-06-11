"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import { EXPENSE_CATEGORY_VALUES, EXPENSE_TYPE_VALUES, getExpenseCategoryLabel, getExpenseTypeLabel } from "@/lib/expenses";
import type { CostAnalysisItemView } from "@/lib/cost-analyses";
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

type CostAnalysisScheduleExpenseFormProps = {
  analysisId: string;
  analysisName: string;
  item: CostAnalysisItemView;
  action: (formData: FormData) => Promise<FutureExpenseActionResult>;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

export function CostAnalysisScheduleExpenseForm({
  analysisId,
  analysisName,
  item,
  action,
}: CostAnalysisScheduleExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            Agendar gasto
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Agendar gasto</SheetTitle>
          <SheetDescription>
            Crie um gasto futuro a partir de {item.name} sem misturar isso com o fluxo de caixa.
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
                setError(result.error ?? "Não foi possível agendar o gasto.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="analysisId" value={analysisId} />
          <input type="hidden" name="costAnalysisItemId" value={item.id} />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos do gasto futuro</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`scheduled-name-${item.id}`}>Descrição</Label>
                <Input
                  id={`scheduled-name-${item.id}`}
                  name="name"
                  defaultValue={item.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`scheduled-expectedAmount-${item.id}`}>Valor previsto (BRL)</Label>
                <Input
                  id={`scheduled-expectedAmount-${item.id}`}
                  name="expectedAmount"
                  defaultValue={moneyToInput(item.monthlyAmountCents)}
                  placeholder="Ex.: R$ 180,00"
                  inputMode="decimal"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Sugestão baseada na provisão mensal do item.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`scheduled-expectedDate-${item.id}`}>Data prevista</Label>
                <Input id={`scheduled-expectedDate-${item.id}`} name="expectedDate" type="date" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`scheduled-category-${item.id}`}>Categoria</Label>
                <select
                  id={`scheduled-category-${item.id}`}
                  name="category"
                  defaultValue="transporte"
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
                <Label htmlFor={`scheduled-expenseType-${item.id}`}>Tipo do gasto</Label>
                <select
                  id={`scheduled-expenseType-${item.id}`}
                  name="expenseType"
                  defaultValue="variavel"
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
                <Label htmlFor={`scheduled-occurrenceType-${item.id}`}>Classificação</Label>
                <select
                  id={`scheduled-occurrenceType-${item.id}`}
                  name="occurrenceType"
                  defaultValue="planned_one_off"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  <option value="planned_one_off">Esporádico planejado</option>
                  <option value="unexpected">Imprevisto</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`scheduled-notes-${item.id}`}>Observações</Label>
                <Textarea
                  id={`scheduled-notes-${item.id}`}
                  name="notes"
                  defaultValue={`Criado a partir da análise de custo: ${analysisName} / ${item.name}`}
                />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Criar gasto futuro"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
