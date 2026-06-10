"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { formatBRL } from "@/lib/calculations";
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
import type { MonthlyExpense, ExpenseCategory, ExpenseOccurrenceType, ExpenseType } from "@/types";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type EntryMode = "linked" | "one_time";

type StatementExpenseEntryFormProps = {
  periodMonth: string;
  monthlyExpenses: MonthlyExpense[];
  linkedAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
  oneTimeAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

function formatPlanLabel(expense: MonthlyExpense): string {
  return [
    expense.name,
    getExpenseCategoryLabel(expense.category),
    getExpenseTypeLabel(expense.expenseType),
    formatBRL(expense.amount),
  ].join(" · ");
}

export function StatementExpenseEntryForm({
  periodMonth,
  monthlyExpenses,
  linkedAction,
  oneTimeAction,
}: StatementExpenseEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [mode, setMode] = useState<EntryMode>("one_time");
  const [modeTouched, setModeTouched] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("outros");
  const [expenseType, setExpenseType] = useState<ExpenseType>("variavel");
  const [selectedMonthlyExpenseId, setSelectedMonthlyExpenseId] = useState("");
  const [occurrenceType, setOccurrenceType] = useState<ExpenseOccurrenceType>("unexpected");

  const compatibleMonthlyExpenses = useMemo(
    () =>
      monthlyExpenses.filter(
        (expense) =>
          expense.isActive &&
          expense.category === category &&
          expense.expenseType === expenseType
      ),
    [category, expenseType, monthlyExpenses]
  );

  const selectedLinkedExpense = useMemo(
    () =>
      compatibleMonthlyExpenses.find((expense) => expense.id === selectedMonthlyExpenseId) ??
      compatibleMonthlyExpenses[0] ??
      null,
    [compatibleMonthlyExpenses, selectedMonthlyExpenseId]
  );

  useEffect(() => {
    if (compatibleMonthlyExpenses.length === 0) {
      if (mode !== "one_time") {
        setMode("one_time");
      }

      if (selectedMonthlyExpenseId) {
        setSelectedMonthlyExpenseId("");
      }

      return;
    }

    if (!modeTouched) {
      if (mode !== "linked") {
        setMode("linked");
      }
    } else if (mode === "linked") {
      if (
        !selectedMonthlyExpenseId ||
        !compatibleMonthlyExpenses.some((expense) => expense.id === selectedMonthlyExpenseId)
      ) {
        setSelectedMonthlyExpenseId(compatibleMonthlyExpenses[0]?.id ?? "");
      }
    }
  }, [
    compatibleMonthlyExpenses,
    mode,
    modeTouched,
    selectedMonthlyExpenseId,
  ]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setModeTouched(false);
      setMode("one_time");
      setCategory("outros");
      setExpenseType("variavel");
      setSelectedMonthlyExpenseId("");
      setOccurrenceType("unexpected");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="default">
            Novo gasto
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo gasto pelo extrato</DialogTitle>
          <DialogDescription>
            Registre um lançamento real como vínculo do planejamento ou como gasto avulso.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            if (mode === "linked" && !selectedLinkedExpense) {
              setError("Selecione um planejamento compatível para vincular o lançamento.");
              return;
            }

            const formData = new FormData(event.currentTarget);
            formData.set("periodMonth", periodMonth);
            formData.set("category", category);
            formData.set("expenseType", expenseType);

            if (mode === "linked") {
              formData.set("monthlyExpenseId", selectedLinkedExpense?.id ?? "");
              formData.delete("occurrenceType");
            } else {
              formData.set("monthlyExpenseId", "");
              formData.set("occurrenceType", occurrenceType);
            }

            const action = mode === "linked" ? linkedAction : oneTimeAction;

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível registrar o gasto.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="periodMonth" value={periodMonth} />
          <input
            type="hidden"
            name="monthlyExpenseId"
            value={mode === "linked" ? selectedLinkedExpense?.id ?? "" : ""}
          />

          <div className="space-y-2">
            <Label htmlFor="statement-expense-name">Descrição</Label>
            <Input id="statement-expense-name" name="name" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statement-expense-category">Categoria</Label>
              <select
                id="statement-expense-category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                required
              >
                {EXPENSE_CATEGORY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {getExpenseCategoryLabel(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement-expense-type">Tipo</Label>
              <select
                id="statement-expense-type"
                name="expenseType"
                value={expenseType}
                onChange={(event) => setExpenseType(event.target.value as ExpenseType)}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                required
              >
                {EXPENSE_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {getExpenseTypeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compatibleMonthlyExpenses.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">Este gasto pertence ao planejamento?</p>
                <p className="text-xs text-muted-foreground">
                  Selecione um item planejado compatível ou registre como avulso.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="entryMode"
                    checked={mode === "linked"}
                    onChange={() => {
                      setMode("linked");
                      setModeTouched(true);
                      if (!selectedMonthlyExpenseId && compatibleMonthlyExpenses[0]) {
                        setSelectedMonthlyExpenseId(compatibleMonthlyExpenses[0].id);
                      }
                    }}
                  />
                  Vincular ao planejamento mensal
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="entryMode"
                    checked={mode === "one_time"}
                    onChange={() => {
                      setMode("one_time");
                      setModeTouched(true);
                    }}
                  />
                  Registrar como avulso
                </label>
              </div>

              {mode === "linked" ? (
                <div className="space-y-2">
                  <Label htmlFor="statement-expense-monthlyExpenseId">Planejamento compatível</Label>
                  <select
                    id="statement-expense-monthlyExpenseId"
                    name="monthlyExpenseId"
                    value={selectedMonthlyExpenseId}
                    onChange={(event) => setSelectedMonthlyExpenseId(event.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                    required
                  >
                    {compatibleMonthlyExpenses.map((expense) => (
                      <option key={expense.id} value={expense.id}>
                        {formatPlanLabel(expense)}
                      </option>
                    ))}
                  </select>

                  {selectedLinkedExpense ? (
                    <p className="text-xs text-muted-foreground">
                      Lançamento será vinculado a{" "}
                      <span className="font-medium text-foreground">
                        {selectedLinkedExpense.name}
                      </span>
                      , reduzindo o restante do planejamento.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="statement-expense-occurrenceType">Classificação</Label>
                  <select
                    id="statement-expense-occurrenceType"
                    name="occurrenceType"
                    value={occurrenceType}
                    onChange={(event) =>
                      setOccurrenceType(event.target.value as ExpenseOccurrenceType)
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                    required
                  >
                    {EXPENSE_OCCURRENCE_TYPE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {getExpenseOccurrenceTypeLabel(value)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Esporádico planejado: pontual, mas previsto antes de acontecer. Imprevisto:
                    fora do planejamento.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              Não encontramos planejamento compatível para essa categoria e tipo. Este gasto será
              registrado como avulso.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statement-expense-amount">Valor (BRL)</Label>
              <Input
                id="statement-expense-amount"
                name="amount"
                required
                placeholder="Ex.: R$ 250,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement-expense-paidAt">Data</Label>
              <Input
                id="statement-expense-paidAt"
                name="paidAt"
                type="date"
                defaultValue={getLocalDateInputValue()}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statement-expense-paymentMethod">Pagamento</Label>
              <select
                id="statement-expense-paymentMethod"
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
            <Label htmlFor="statement-expense-notes">Observações</Label>
            <Textarea id="statement-expense-notes" name="notes" />
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
