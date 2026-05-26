"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  getExpenseCategoryLabel,
  getExpenseTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/expenses";
import type { MonthlyExpense } from "@/types";
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

type ExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type MonthlyExpenseFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<ExpenseActionResult>;
  expense?: MonthlyExpense;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

export function MonthlyExpenseForm({ mode, action, expense }: MonthlyExpenseFormProps) {
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
            {isEditMode ? "Editar" : "Novo gasto"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar gasto mensal" : "Novo gasto mensal"}</SheetTitle>
          <SheetDescription>
            Registre compromissos recorrentes para entender quanto custa seu mês.
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
                setError(result.error ?? "Não foi possível salvar o gasto.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          {isEditMode && expense?.id ? <input type="hidden" name="id" value={expense.id} /> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos obrigatórios</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Descrição</Label>
                <Input id="name" name="name" defaultValue={expense?.name ?? ""} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={expense?.category ?? "moradia"}
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
                  defaultValue={expense?.expenseType ?? "fixo"}
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

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="amount">Valor mensal (BRL)</Label>
                <Input
                  id="amount"
                  name="amount"
                  placeholder="Ex.: R$ 1.250,00"
                  defaultValue={moneyToInput(expense?.amount)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos opcionais</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDay">Dia do vencimento</Label>
                <Input
                  id="dueDay"
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={expense?.dueDay ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  defaultValue={expense?.paymentMethod ?? ""}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Sem método definido</option>
                  {PAYMENT_METHOD_VALUES.map((paymentMethod) => (
                    <option key={paymentMethod} value={paymentMethod}>
                      {getPaymentMethodLabel(paymentMethod)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="dueLabel">Rótulo do vencimento</Label>
                <Input
                  id="dueLabel"
                  name="dueLabel"
                  defaultValue={expense?.dueLabel ?? ""}
                  placeholder="Ex.: Todo dia 5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Situação</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={expense?.isActive === false ? "false" : "true"}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" defaultValue={expense?.notes ?? ""} />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditMode ? "Salvar alterações" : "Criar gasto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
