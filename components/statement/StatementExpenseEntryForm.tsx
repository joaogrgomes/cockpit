"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { formatRecurrencePeriodLabel } from "@/lib/recurrence-period";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";
import { shouldShowStatementExpenseOccurrenceTypeField } from "@/lib/statement-expense-entry";
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
    formatRecurrencePeriodLabel(expense.startMonth, expense.endMonth),
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
          isMonthWithinPeriod(periodMonth, expense.startMonth, expense.endMonth) &&
          expense.category === category &&
          expense.expenseType === expenseType
      ),
    [category, expenseType, monthlyExpenses, periodMonth]
  );

  const hasCompatiblePlanning = compatibleMonthlyExpenses.length > 0;
  const selectedMode: EntryMode = hasCompatiblePlanning
    ? modeTouched
      ? mode
      : "linked"
    : "one_time";
  const effectiveIsOneTime = shouldShowStatementExpenseOccurrenceTypeField(
    hasCompatiblePlanning,
    selectedMode
  );
  const effectiveMode = selectedMode;
  const isLinkedMode = effectiveMode === "linked";

  const selectedLinkedExpense = useMemo(
    () =>
      compatibleMonthlyExpenses.find((expense) => expense.id === selectedMonthlyExpenseId) ??
      compatibleMonthlyExpenses[0] ??
      null,
    [compatibleMonthlyExpenses, selectedMonthlyExpenseId]
  );

  const showPlanningModeSelector = hasCompatiblePlanning;
  const showOccurrenceTypeField = effectiveIsOneTime;

  useEffect(() => {
    if (!hasCompatiblePlanning) {
      if (mode !== "one_time") {
        setMode("one_time");
      }

      if (selectedMonthlyExpenseId) {
        setSelectedMonthlyExpenseId("");
      }

      return;
    }

    if (
      !selectedMonthlyExpenseId ||
      !compatibleMonthlyExpenses.some((expense) => expense.id === selectedMonthlyExpenseId)
    ) {
      setSelectedMonthlyExpenseId(compatibleMonthlyExpenses[0]?.id ?? "");
    }
  }, [
    compatibleMonthlyExpenses,
    hasCompatiblePlanning,
    mode,
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="default">
            Novo gasto
          </Button>
        }
      />
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden sm:max-w-2xl">
        <SheetHeader className="border-b border-border/70 px-4 py-4">
          <SheetTitle>Novo gasto</SheetTitle>
          <SheetDescription>
            Registre um gasto no extrato e escolha se ele pertence ao planejamento ou é avulso.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            if (isLinkedMode && !selectedLinkedExpense) {
              setError("Selecione um planejamento compatível para vincular o lançamento.");
              return;
            }

            const formData = new FormData(event.currentTarget);
            formData.set("periodMonth", periodMonth);
            formData.set("category", category);
            formData.set("expenseType", expenseType);

            if (isLinkedMode) {
              formData.set("monthlyExpenseId", selectedLinkedExpense?.id ?? "");
              formData.delete("occurrenceType");
            } else {
              formData.set("monthlyExpenseId", "");
              formData.set("occurrenceType", occurrenceType);
            }

            const action = isLinkedMode ? linkedAction : oneTimeAction;

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
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
            <input type="hidden" name="periodMonth" value={periodMonth} />

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Dados do lançamento</h3>
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
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Vínculo ao planejamento</h3>

              {showPlanningModeSelector ? (
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

                  {isLinkedMode ? (
                    <div className="space-y-2">
                      <Label htmlFor="statement-expense-monthlyExpenseId">
                        Planejamento compatível
                      </Label>
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
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">
                    Não encontramos planejamento compatível para essa categoria e tipo. Este gasto
                    será registrado como avulso.
                  </div>
                </div>
              )}

              {showOccurrenceTypeField ? (
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <Label htmlFor="statement-expense-occurrenceType">
                    Classificação do avulso
                  </Label>
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
              ) : null}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Pagamento e observações</h3>
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
            </section>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <SheetFooter className="border-t border-border/70 bg-background/95 px-4 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <SheetClose
                render={
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                }
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar lançamento"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
