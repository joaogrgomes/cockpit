"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import { INCOME_CATEGORY_VALUES, getIncomeCategoryLabel } from "@/lib/incomes";
import type { FutureIncomeReceivable } from "@/types";
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

type FutureIncomeActionResult = {
  ok: boolean;
  error?: string;
};

type FutureIncomeFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<FutureIncomeActionResult>;
  futureIncome?: FutureIncomeReceivable;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

function dateToInput(dateValue: string | Date): string {
  if (typeof dateValue === "string") return dateValue;
  return dateValue.toISOString().slice(0, 10);
}

export function FutureIncomeForm({
  mode,
  action,
  futureIncome,
}: FutureIncomeFormProps) {
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
            disabled={isEditMode && futureIncome?.status !== "prevista"}
          >
            {isEditMode ? "Editar" : "Nova entrada futura"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Editar entrada futura" : "Nova entrada futura"}
          </SheetTitle>
          <SheetDescription>
            Cadastre receitas únicas previstas para projetar seu caixa nos próximos meses.
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
                setError(result.error ?? "Não foi possível salvar a entrada futura.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          {isEditMode && futureIncome?.id ? (
            <input type="hidden" name="id" value={futureIncome.id} />
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos obrigatórios</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Descrição</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={futureIncome?.name ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={futureIncome?.category ?? "salario"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {INCOME_CATEGORY_VALUES.map((category) => (
                    <option key={category} value={category}>
                      {getIncomeCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedAmount">Valor previsto (BRL)</Label>
                <Input
                  id="expectedAmount"
                  name="expectedAmount"
                  placeholder="Ex.: R$ 3.000,00"
                  defaultValue={moneyToInput(futureIncome?.expectedAmount)}
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
                    futureIncome?.expectedDate
                      ? dateToInput(futureIncome.expectedDate)
                      : ""
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
              <Textarea id="notes" name="notes" defaultValue={futureIncome?.notes ?? ""} />
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
