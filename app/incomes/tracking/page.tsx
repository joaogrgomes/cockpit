import { MetricCard } from "@/components/dashboard/MetricCard";
import { IncomeTrackingSummaryByCategory } from "@/components/income-tracking/IncomeTrackingSummaryByCategory";
import { IncomeTrackingTable } from "@/components/income-tracking/IncomeTrackingTable";
import { OneTimeIncomeEntries } from "@/components/income-tracking/OneTimeIncomeEntries";
import { OneTimeIncomeEntryForm } from "@/components/income-tracking/OneTimeIncomeEntryForm";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { normalizePeriodMonth } from "@/lib/income-tracking";
import { isMonthClosed } from "@/lib/services/monthly-closing.service";
import { getIncomeTrackingByPeriod } from "@/lib/services/monthly-income-entry.service";
import {
  createMonthlyIncomeEntryAction,
  createOneTimeIncomeEntryAction,
  deleteMonthlyIncomeEntryAction,
} from "./actions";

export const dynamic = "force-dynamic";

type IncomeTrackingPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function IncomeTrackingPage({
  searchParams,
}: IncomeTrackingPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedPeriod = normalizePeriodMonth(params.month);
  const [tracking, monthClosed] = await Promise.all([
    getIncomeTrackingByPeriod(selectedPeriod),
    isMonthClosed(selectedPeriod),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Acompanhamento de entradas"
        description="Acompanhe o que já foi recebido no mês selecionado."
        actions={
          <OneTimeIncomeEntryForm
            periodMonth={tracking.periodMonth}
            action={createOneTimeIncomeEntryAction}
          />
        }
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
            <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
              Este mês está fechado. Se precisar alterar lançamentos, reabra o mês no Fluxo de caixa.
            </p>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard title="Previsto no mês" value={formatBRL(tracking.summary.totalPlanned)} />
        <MetricCard title="Recebido até agora" value={formatBRL(tracking.summary.totalReceived)} />
        <MetricCard
          title="Entradas avulsas"
          value={formatBRL(tracking.summary.totalOneTimeReceived)}
        />
        <MetricCard title="A receber" value={formatBRL(tracking.summary.totalRemaining)} />
        <MetricCard
          title="Acima do previsto"
          value={formatBRL(tracking.summary.totalAbovePlanned)}
        />
        <MetricCard title="Pendentes" value={String(tracking.summary.pendingCount)} />
        <MetricCard title="Atrasadas" value={String(tracking.summary.overdueCount)} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entradas do mês</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <IncomeTrackingTable
              periodMonth={tracking.periodMonth}
              items={tracking.items}
              createAction={createMonthlyIncomeEntryAction}
              deleteAction={deleteMonthlyIncomeEntryAction}
            />
          </div>
        </CardContent>
      </Card>

      <OneTimeIncomeEntries
        entries={tracking.oneTimeEntries}
        deleteAction={deleteMonthlyIncomeEntryAction}
      />

      <IncomeTrackingSummaryByCategory items={tracking.summaryByCategory} />
    </section>
  );
}
