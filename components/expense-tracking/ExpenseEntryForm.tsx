"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PAYMENT_METHOD_VALUES,
  getPaymentMethodLabel,
} from "@/lib/expenses";
import { formatBRL } from "@/lib/calculations";
import { getLocalDateInputValue } from "@/lib/date-utils";
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

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type ExpenseEntryFormProps = {
  monthlyExpenseId: string;
  periodMonth: string;
  triggerLabel?: string;
  defaultAmountCents?: number;
  action: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

export function ExpenseEntryForm({
  monthlyExpenseId,
  periodMonth,
  triggerLabel = "Registrar",
  defaultAmountCents,
  action,
}: ExpenseEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar gasto/pagamento</DialogTitle>
          <DialogDescription>
            Adicione um lançamento realizado para o mês selecionado.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("monthlyExpenseId", monthlyExpenseId);
            formData.set("periodMonth", periodMonth);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível registrar o lançamento.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="monthlyExpenseId" value={monthlyExpenseId} />
          <input type="hidden" name="periodMonth" value={periodMonth} />

          <div className="space-y-2">
            <Label htmlFor={`amount-${monthlyExpenseId}`}>Valor realizado (BRL)</Label>
            <Input
              id={`amount-${monthlyExpenseId}`}
              name="amount"
              required
              placeholder="Ex.: R$ 250,00"
              defaultValue={
                typeof defaultAmountCents === "number" ? formatBRL(defaultAmountCents) : ""
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`paidAt-${monthlyExpenseId}`}>Data</Label>
              <Input
                id={`paidAt-${monthlyExpenseId}`}
                name="paidAt"
                type="date"
                required
                defaultValue={getLocalDateInputValue()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`paymentMethod-${monthlyExpenseId}`}>Pagamento</Label>
              <select
                id={`paymentMethod-${monthlyExpenseId}`}
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
            <Label htmlFor={`notes-${monthlyExpenseId}`}>Observação</Label>
            <Textarea id={`notes-${monthlyExpenseId}`} name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
