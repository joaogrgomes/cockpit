import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExpenseTrackingSummaryByCategory } from "@/components/expense-tracking/ExpenseTrackingSummaryByCategory";
import { ExpenseTrackingTable } from "@/components/expense-tracking/ExpenseTrackingTable";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { normalizePeriodMonth, type ExpenseTrackingSummary } from "@/lib/expense-tracking";
import { isMonthClosed } from "@/lib/services/monthly-closing.service";
import { getExpenseTrackingByPeriod } from "@/lib/services/monthly-expense-entry.service";
import {
  createMonthlyExpenseEntryAction,
  deleteMonthlyExpenseEntryAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ExpenseTrackingPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

function SummaryGrid({
  summary,
  mode = "general",
}: {
  summary: ExpenseTrackingSummary;
  mode?: "general" | "fixed" | "variable";
}) {
  const pendingDescription =
    mode === "fixed"
      ? `Pagos: ${summary.completedCount}`
      : `Parcial: ${summary.partialCount} • Concluído: ${summary.completedCount}`;

  const baseCards = [
    <MetricCard
      key="planned"
      title="Planejado"
      value={formatBRL(summary.totalPlanned)}
    />,
    <MetricCard
      key="actual"
      title="Realizado"
      value={formatBRL(summary.totalActual)}
    />,
    <MetricCard
      key="remaining"
      title="Restante"
      value={formatBRL(summary.totalRemaining)}
    />,
    <MetricCard
      key="over"
      title="Estourado"
      value={formatBRL(summary.totalOverBudget)}
      description={`${summary.overBudgetCount} item(ns) estourado(s)`}
    />,
    <MetricCard
      key="pending"
      title="Pendentes"
      value={String(summary.pendingCount)}
      description={pendingDescription}
    />,
  ];

  if (mode === "fixed") {
    baseCards.push(
      <MetricCard
        key="overdue"
        title="Atrasados"
        value={String(summary.overdueCount)}
      />
    );
  }

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{baseCards}</div>;
}

export default async function ExpenseTrackingPage({
  searchParams,
}: ExpenseTrackingPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedPeriod = normalizePeriodMonth(params.month);
  const [tracking, monthClosed] = await Promise.all([
    getExpenseTrackingByPeriod(selectedPeriod),
    isMonthClosed(selectedPeriod),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Acompanhamento"
        description="Acompanhe o que já foi pago ou gasto no mês selecionado."
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mês de referência</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="month">
                Selecione o mês
              </label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedPeriod}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button type="submit" size="sm">
              Aplicar
            </Button>
          </form>
        </CardContent>
      </Card>

      {monthClosed ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 dark:text-amber-100">
              Mês fechado
            </CardTitle>
            <CardDescription className="text-amber-800/90 dark:text-amber-200/80">
              Este mês está fechado. Se precisar alterar lançamentos, reabra o mês no Fluxo de caixa.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consolidado total</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryGrid summary={tracking.summary} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gastos fixos</CardTitle>
          <CardDescription>
            Contas e compromissos previstos para o mês.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SummaryGrid summary={tracking.fixedSummary} mode="fixed" />
          <div className="overflow-x-auto">
            <ExpenseTrackingTable
              periodMonth={tracking.periodMonth}
              items={tracking.fixedItems}
              emptyMessage="Nenhum gasto fixo ativo para este mês."
              createAction={createMonthlyExpenseEntryAction}
              deleteAction={deleteMonthlyExpenseEntryAction}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gastos variáveis</CardTitle>
          <CardDescription>
            Limites e consumos acompanhados ao longo do mês.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SummaryGrid summary={tracking.variableSummary} mode="variable" />
          <div className="overflow-x-auto">
            <ExpenseTrackingTable
              periodMonth={tracking.periodMonth}
              items={tracking.variableItems}
              emptyMessage="Nenhum gasto variável ativo para este mês."
              createAction={createMonthlyExpenseEntryAction}
              deleteAction={deleteMonthlyExpenseEntryAction}
            />
          </div>
        </CardContent>
      </Card>

      <ExpenseTrackingSummaryByCategory items={tracking.summaryByCategory} />
    </section>
  );
}
