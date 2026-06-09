"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/calculations";
import { getLocalDateInputValue } from "@/lib/date-utils";
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  getExpenseCategoryLabel,
  getExpenseTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/expenses";
import {
  INCOME_CATEGORY_VALUES,
  getIncomeCategoryLabel,
  getIncomePaymentMethodLabel,
} from "@/lib/incomes";
import { Badge } from "@/components/ui/badge";
import type { StatementEntryActionResult } from "@/app/statement/[originType]/[id]/actions";
import type { StatementEntryDetail } from "@/lib/statement";

type StatementEntryEditFormProps = {
  entry: StatementEntryDetail;
  action: (formData: FormData) => Promise<StatementEntryActionResult>;
};

function moneyToInput(cents: number): string {
  return formatBRL(cents);
}

export function StatementEntryEditForm({ entry, action }: StatementEntryEditFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isIncome = entry.kind === "income";
  const canEditDetails = entry.source === "one_time";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await action(formData);
          if (!result.ok) {
            setError(result.error ?? "Não foi possível atualizar o lançamento.");
            return;
          }

          router.refresh();
        });
      }}
    >
      <input type="hidden" name="originType" value={entry.originType} />
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="periodMonth" value={entry.periodMonth} />

      {entry.linkedNotice ? (
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
          {entry.linkedNotice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {canEditDetails ? (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={entry.description} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                name="category"
                defaultValue={entry.category}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                required
              >
                {(isIncome ? INCOME_CATEGORY_VALUES : EXPENSE_CATEGORY_VALUES).map((category) => (
                  <option key={category} value={category}>
                    {isIncome ? getIncomeCategoryLabel(category) : getExpenseCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {!isIncome ? (
              <div className="space-y-2">
                <Label htmlFor="expenseType">Tipo</Label>
                <select
                  id="expenseType"
                  name="expenseType"
                  defaultValue={entry.expenseType ?? "variavel"}
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
            ) : null}
          </>
        ) : (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm font-medium">
                {entry.description}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                {entry.categoryLabel}
              </div>
            </div>

            {!isIncome ? (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                  {entry.expenseType ? getExpenseTypeLabel(entry.expenseType) : "—"}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Valor</Label>
          <Input id="amount" name="amount" defaultValue={moneyToInput(entry.amount)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={entry.date || getLocalDateInputValue()}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">
            {isIncome ? "Canal de recebimento" : "Forma de pagamento"}
          </Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={entry.paymentMethod ?? ""}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Sem método definido</option>
            {(isIncome ? ["pix", "transferencia", "deposito", "dinheiro", "outro"] : [
              "pix",
              "boleto",
              "cartao",
              "debito_em_conta",
              "dinheiro",
              "transferencia",
              "outro",
            ]).map((method) => (
              <option key={method} value={method}>
                {isIncome ? getIncomePaymentMethodLabel(method) : getPaymentMethodLabel(method)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" defaultValue={entry.notes ?? ""} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">
          {entry.source === "linked" ? "Planejado" : "Avulso"}
        </Badge>
        <Badge variant={isIncome ? "default" : "secondary"} className="rounded-full">
          {isIncome ? "Entrada" : "Gasto"}
        </Badge>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
