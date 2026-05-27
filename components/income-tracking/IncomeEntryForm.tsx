"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  INCOME_PAYMENT_METHOD_VALUES,
  getIncomePaymentMethodLabel,
} from "@/lib/incomes";
import { formatBRL } from "@/lib/calculations";
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

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type IncomeEntryFormProps = {
  monthlyIncomeId: string;
  periodMonth: string;
  triggerLabel?: string;
  defaultAmountCents?: number;
  action: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEntryForm({
  monthlyIncomeId,
  periodMonth,
  triggerLabel = "Registrar recebimento",
  defaultAmountCents,
  action,
}: IncomeEntryFormProps) {
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
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>
            Adicione um lançamento recebido para o mês selecionado.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("monthlyIncomeId", monthlyIncomeId);
            formData.set("periodMonth", periodMonth);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível registrar o recebimento.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="monthlyIncomeId" value={monthlyIncomeId} />
          <input type="hidden" name="periodMonth" value={periodMonth} />

          <div className="space-y-2">
            <Label htmlFor={`amount-${monthlyIncomeId}`}>Valor recebido (BRL)</Label>
            <Input
              id={`amount-${monthlyIncomeId}`}
              name="amount"
              required
              placeholder="Ex.: R$ 2.500,00"
              defaultValue={
                typeof defaultAmountCents === "number" ? formatBRL(defaultAmountCents) : ""
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`receivedAt-${monthlyIncomeId}`}>Data de recebimento</Label>
              <Input
                id={`receivedAt-${monthlyIncomeId}`}
                name="receivedAt"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`paymentMethod-${monthlyIncomeId}`}>Canal de recebimento</Label>
              <select
                id={`paymentMethod-${monthlyIncomeId}`}
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
            <Label htmlFor={`notes-${monthlyIncomeId}`}>Observação</Label>
            <Textarea id={`notes-${monthlyIncomeId}`} name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar recebimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
