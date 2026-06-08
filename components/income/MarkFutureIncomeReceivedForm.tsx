"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import { getLocalDateInputValue } from "@/lib/date-utils";
import { INCOME_PAYMENT_METHOD_VALUES, getIncomePaymentMethodLabel } from "@/lib/incomes";
import type { FutureIncomeReceivable } from "@/types";
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

type FutureIncomeActionResult = {
  ok: boolean;
  error?: string;
};

type MarkFutureIncomeReceivedFormProps = {
  futureIncome: FutureIncomeReceivable;
  action: (formData: FormData) => Promise<FutureIncomeActionResult>;
};

export function MarkFutureIncomeReceivedForm({
  futureIncome,
  action,
}: MarkFutureIncomeReceivedFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={futureIncome.status !== "prevista"}
          >
            Marcar como recebida
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar recebimento</DialogTitle>
          <DialogDescription>
            Isso criará uma entrada avulsa no acompanhamento e marcará esta previsão como recebida.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("futureIncomeId", futureIncome.id);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível confirmar recebimento.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="futureIncomeId" value={futureIncome.id} />

          <div className="space-y-2">
            <Label htmlFor={`receivedAmount-${futureIncome.id}`}>Valor recebido (BRL)</Label>
            <Input
              id={`receivedAmount-${futureIncome.id}`}
              name="receivedAmount"
              defaultValue={formatBRL(futureIncome.expectedAmount)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`receivedAt-${futureIncome.id}`}>Data de recebimento</Label>
              <Input
                id={`receivedAt-${futureIncome.id}`}
                name="receivedAt"
                type="date"
                defaultValue={getLocalDateInputValue()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`paymentMethod-${futureIncome.id}`}>Canal</Label>
              <select
                id={`paymentMethod-${futureIncome.id}`}
                name="paymentMethod"
                defaultValue=""
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
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${futureIncome.id}`}>Observação</Label>
            <Textarea
              id={`notes-${futureIncome.id}`}
              name="notes"
              defaultValue={futureIncome.notes ?? ""}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirmando..." : "Confirmar recebimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
