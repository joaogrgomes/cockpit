"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLocalDateInputValue } from "@/lib/date-utils";
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  EXPENSE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  getExpenseCategoryLabel,
  getExpenseOccurrenceTypeLabel,
  getExpenseTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/expenses";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type OneTimeExpenseEntryFormProps = {
  periodMonth: string;
  action: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

export function OneTimeExpenseEntryForm({
  periodMonth,
  action,
}: OneTimeExpenseEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="default">
            Novo gasto avulso
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo gasto avulso</DialogTitle>
          <DialogDescription>
            Registre uma saída realizada que não faz parte do planejamento recorrente.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("periodMonth", periodMonth);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível registrar o gasto avulso.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="periodMonth" value={periodMonth} />

          <div className="space-y-2">
            <Label htmlFor="one-time-name">Descrição</Label>
            <Input id="one-time-name" name="name" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-time-category">Categoria</Label>
              <select
                id="one-time-category"
                name="category"
                defaultValue="outros"
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
              <Label htmlFor="one-time-occurrenceType">Classificação</Label>
              <select
                id="one-time-occurrenceType"
                name="occurrenceType"
                defaultValue="unexpected"
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
                Esporádico planejado: pontual, mas previsto antes de acontecer. Imprevisto: fora do planejamento.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="one-time-type">Tipo</Label>
              <select
                id="one-time-type"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-time-amount">Valor (BRL)</Label>
              <Input id="one-time-amount" name="amount" required placeholder="Ex.: R$ 250,00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="one-time-paidAt">Data</Label>
              <Input
                id="one-time-paidAt"
                name="paidAt"
                type="date"
                defaultValue={getLocalDateInputValue()}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-time-paymentMethod">Pagamento</Label>
              <select
                id="one-time-paymentMethod"
                name="paymentMethod"
                defaultValue=""
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="one-time-notes">Observações</Label>
            <Textarea id="one-time-notes" name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar gasto avulso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
