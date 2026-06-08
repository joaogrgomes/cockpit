"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  getIncomeCategoryLabel,
  getIncomePaymentMethodLabel,
} from "@/lib/incomes";
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

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type OneTimeIncomeEntryFormProps = {
  periodMonth: string;
  action: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

export function OneTimeIncomeEntryForm({
  periodMonth,
  action,
}: OneTimeIncomeEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Nova entrada avulsa
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova entrada avulsa</DialogTitle>
          <DialogDescription>
            Registre um recebimento único sem vínculo com o planejamento recorrente.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("periodMonth", periodMonth);
            formData.set("monthlyIncomeId", "");

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível registrar a entrada avulsa.");
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
            <Input
              id="one-time-name"
              name="name"
              required
              placeholder="Ex.: Restituição IR"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-time-category">Categoria</Label>
              <select
                id="one-time-category"
                name="category"
                required
                defaultValue=""
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {INCOME_CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {getIncomeCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="one-time-amount">Valor recebido (BRL)</Label>
              <Input
                id="one-time-amount"
                name="amount"
                required
                placeholder="Ex.: R$ 2.000,00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-time-received-at">Data de recebimento</Label>
              <Input
                id="one-time-received-at"
                name="receivedAt"
                type="date"
                required
                defaultValue={getLocalDateInputValue()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="one-time-payment-method">Canal de recebimento</Label>
              <select
                id="one-time-payment-method"
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
            <Label htmlFor="one-time-notes">Observação</Label>
            <Textarea id="one-time-notes" name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar entrada avulsa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
