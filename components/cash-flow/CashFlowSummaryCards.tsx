import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { CashFlowSummary } from "@/lib/cash-flow";

type CashFlowSummaryCardsProps = {
  summary: CashFlowSummary;
};

export function CashFlowSummaryCards({ summary }: CashFlowSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard title="Saldo final projetado" value={formatBRL(summary.finalBalance)} />
      <MetricCard title="Resultado anual" value={formatBRL(summary.totalResult)} />
      <MetricCard title="Entradas consideradas" value={formatBRL(summary.totalIncomeUsed)} />
      <MetricCard title="Saídas consideradas" value={formatBRL(summary.totalExpensesUsed)} />
      <MetricCard title="Menor saldo projetado" value={formatBRL(summary.lowestBalance)} />
      <MetricCard title="Meses negativos" value={String(summary.negativeMonthsCount)} />
    </div>
  );
}
