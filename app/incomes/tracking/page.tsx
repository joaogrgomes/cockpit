import { MetricCard } from "@/components/dashboard/MetricCard";
import { IncomeTrackingSummaryByCategory } from "@/components/income-tracking/IncomeTrackingSummaryByCategory";
import { IncomeTrackingTable } from "@/components/income-tracking/IncomeTrackingTable";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { normalizePeriodMonth } from "@/lib/income-tracking";
import { getIncomeTrackingByPeriod } from "@/lib/services/monthly-income-entry.service";
import {
  createMonthlyIncomeEntryAction,
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
  const tracking = await getIncomeTrackingByPeriod(selectedPeriod);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Acompanhamento de entradas"
        description="Acompanhe o que já foi recebido no mês selecionado."
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Previsto no mês" value={formatBRL(tracking.summary.totalPlanned)} />
        <MetricCard title="Recebido até agora" value={formatBRL(tracking.summary.totalReceived)} />
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

      <IncomeTrackingSummaryByCategory items={tracking.summaryByCategory} />
    </section>
  );
}
