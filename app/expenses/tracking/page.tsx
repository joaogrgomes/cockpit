import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExpenseTrackingSummaryByCategory } from "@/components/expense-tracking/ExpenseTrackingSummaryByCategory";
import { ExpenseTrackingTable } from "@/components/expense-tracking/ExpenseTrackingTable";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { normalizePeriodMonth } from "@/lib/expense-tracking";
import { getExpenseTrackingByPeriod } from "@/lib/services/monthly-expense-entry.service";
import {
  createMonthlyExpenseEntryAction,
  deleteMonthlyExpenseEntryAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ExpenseTrackingPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function ExpenseTrackingPage({
  searchParams,
}: ExpenseTrackingPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedPeriod = normalizePeriodMonth(params.month);
  const tracking = await getExpenseTrackingByPeriod(selectedPeriod);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Mês atual"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Planejado no mês"
          value={formatBRL(tracking.summary.totalPlanned)}
        />
        <MetricCard
          title="Realizado até agora"
          value={formatBRL(tracking.summary.totalActual)}
        />
        <MetricCard
          title="Restante"
          value={formatBRL(tracking.summary.totalRemaining)}
        />
        <MetricCard
          title="Estourado"
          value={formatBRL(tracking.summary.totalOverBudget)}
          description={`${tracking.summary.overBudgetCount} item(ns) estourado(s)`}
        />
        <MetricCard
          title="Pendentes"
          value={String(tracking.summary.pendingCount)}
          description={`Parcial: ${tracking.summary.partialCount} • Concluído: ${tracking.summary.completedCount}`}
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acompanhamento do mês</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <ExpenseTrackingTable
              periodMonth={tracking.periodMonth}
              items={tracking.items}
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
