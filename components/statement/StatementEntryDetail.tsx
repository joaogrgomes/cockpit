import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatementEntryEditForm } from "./StatementEntryEditForm";
import { DeleteStatementEntryButton } from "./DeleteStatementEntryButton";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { getExpenseTypeLabel, getPaymentMethodLabel } from "@/lib/expenses";
import { getIncomePaymentMethodLabel } from "@/lib/incomes";
import type { StatementEntryDetail } from "@/lib/statement";
import type { StatementEntryActionResult } from "@/app/statement/[originType]/[id]/actions";

type StatementEntryDetailProps = {
  entry: StatementEntryDetail;
  updateAction: (formData: FormData) => Promise<StatementEntryActionResult>;
  deleteAction: (formData: FormData) => Promise<StatementEntryActionResult>;
};

function formatPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  if (!year || !month) return periodMonth;
  return `${month}/${year}`;
}

export function StatementEntryDetail({ entry, updateAction, deleteAction }: StatementEntryDetailProps) {
  const isIncome = entry.kind === "income";
  const paymentMethod = isIncome
    ? getIncomePaymentMethodLabel(entry.paymentMethod)
    : getPaymentMethodLabel(entry.paymentMethod);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isIncome ? "default" : "secondary"} className="rounded-full">
          {isIncome ? "Entrada" : "Gasto"}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {entry.sourceLabel}
        </Badge>
        {entry.kind === "expense" && entry.expenseType ? (
          <Badge variant="outline" className="rounded-full">
            {getExpenseTypeLabel(entry.expenseType)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo do lançamento</CardTitle>
            <CardDescription>Confira os dados que vão para o extrato e o acompanhamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p>
                <p className="font-medium">{entry.description}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Categoria</p>
                <p className="font-medium">{entry.categoryLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor</p>
                <p className="font-medium">{formatBRL(entry.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Data</p>
                <p className="font-medium">{formatDateOnlyBR(entry.date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Período</p>
                <p className="font-medium">{formatPeriodMonth(entry.periodMonth)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isIncome ? "Canal de recebimento" : "Forma de pagamento"}
                </p>
                <p className="font-medium">{paymentMethod}</p>
              </div>
              {entry.expenseType && entry.kind === "expense" ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getExpenseTypeLabel(entry.expenseType)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Origem</p>
                <p className="font-medium">{entry.sourceLabel}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Observações</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {entry.notes ?? "—"}
                </p>
              </div>
            </div>

            {entry.linkedNotice ? (
              <div className="mt-4 rounded-lg border border-dashed border-border/80 bg-muted/30 p-3 text-sm text-muted-foreground">
                {entry.linkedNotice}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Editar lançamento</CardTitle>
            <CardDescription>
              {entry.source === "one_time"
                ? "Atualize descrição, categoria, valor, data e observações."
                : "Atualize valor, data, método de pagamento e observações."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatementEntryEditForm entry={entry} action={updateAction} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div>
          <p className="text-sm font-medium">Excluir lançamento</p>
          <p className="text-sm text-muted-foreground">
            Exclui o registro do extrato, acompanhamento e fluxo de caixa.
          </p>
        </div>
        <DeleteStatementEntryButton
          originType={entry.originType}
          id={entry.id}
          periodMonth={entry.periodMonth}
          action={deleteAction}
        />
      </div>
    </div>
  );
}
