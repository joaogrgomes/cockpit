"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import {
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  getIncomeCategoryLabel,
  getIncomePaymentMethodLabel,
} from "@/lib/incomes";
import type { MonthlyIncome } from "@/types";
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

type IncomeActionResult = {
  ok: boolean;
  error?: string;
};

type MonthlyIncomeFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<IncomeActionResult>;
  income?: MonthlyIncome;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

export function MonthlyIncomeForm({ mode, action, income }: MonthlyIncomeFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditMode = mode === "edit";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant={isEditMode ? "outline" : "default"} size="sm">
            {isEditMode ? "Editar" : "Nova entrada"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar entrada" : "Nova entrada"}</SheetTitle>
          <SheetDescription>
            Cadastre valores previstos para acompanhar seus recebimentos mensais.
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
                setError(result.error ?? "Não foi possível salvar a entrada.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          {isEditMode && income?.id ? <input type="hidden" name="id" value={income.id} /> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos obrigatórios</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Descrição</Label>
                <Input id="name" name="name" defaultValue={income?.name ?? ""} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={income?.category ?? "salario"}
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
                <Label htmlFor="amount">Valor previsto (BRL)</Label>
                <Input
                  id="amount"
                  name="amount"
                  placeholder="Ex.: R$ 3.500,00"
                  defaultValue={moneyToInput(income?.amount)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos opcionais</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expectedDay">Dia previsto</Label>
                <Input
                  id="expectedDay"
                  name="expectedDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={income?.expectedDay ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Recebimento</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  defaultValue={income?.paymentMethod ?? ""}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Sem método definido</option>
                  {INCOME_PAYMENT_METHOD_VALUES.map((paymentMethod) => (
                    <option key={paymentMethod} value={paymentMethod}>
                      {getIncomePaymentMethodLabel(paymentMethod)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Situação</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={income?.isActive === false ? "false" : "true"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" defaultValue={income?.notes ?? ""} />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditMode ? "Salvar alterações" : "Criar entrada"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
