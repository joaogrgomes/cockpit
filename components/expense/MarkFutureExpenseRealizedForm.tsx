"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import { PAYMENT_METHOD_VALUES, getPaymentMethodLabel } from "@/lib/expenses";
import type { FutureExpensePayable } from "@/types";
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

type FutureExpenseActionResult = {
  ok: boolean;
  error?: string;
};

type MarkFutureExpenseRealizedFormProps = {
  futureExpense: FutureExpensePayable;
  action: (formData: FormData) => Promise<FutureExpenseActionResult>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function MarkFutureExpenseRealizedForm({
  futureExpense,
  action,
}: MarkFutureExpenseRealizedFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={futureExpense.status !== "previsto"}>
            Marcar como realizado
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar gasto realizado</DialogTitle>
          <DialogDescription>
            Isso criará um gasto avulso no acompanhamento e marcará esta previsão como realizada.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("futureExpenseId", futureExpense.id);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível confirmar o gasto realizado.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="futureExpenseId" value={futureExpense.id} />

          <div className="space-y-2">
            <Label htmlFor={`realizedAmount-${futureExpense.id}`}>Valor realizado (BRL)</Label>
            <Input
              id={`realizedAmount-${futureExpense.id}`}
              name="realizedAmount"
              defaultValue={formatBRL(futureExpense.expectedAmount)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`paidAt-${futureExpense.id}`}>Data</Label>
              <Input
                id={`paidAt-${futureExpense.id}`}
                name="paidAt"
                type="date"
                defaultValue={todayIsoDate()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`paymentMethod-${futureExpense.id}`}>Pagamento</Label>
              <select
                id={`paymentMethod-${futureExpense.id}`}
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
            <Label htmlFor={`notes-${futureExpense.id}`}>Observações</Label>
            <Textarea id={`notes-${futureExpense.id}`} name="notes" defaultValue={futureExpense.notes ?? ""} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirmando..." : "Confirmar realizado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
