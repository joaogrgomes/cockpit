import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { StatementSummary } from "@/lib/statement";

type StatementSummaryCardsProps = {
  summary: StatementSummary;
};

export function StatementSummaryCards({ summary }: StatementSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Entradas" value={formatBRL(summary.totalIncome)} />
      <MetricCard title="Saídas" value={formatBRL(summary.totalExpense)} />
      <MetricCard title="Saldo do período" value={formatBRL(summary.balance)} />
      <MetricCard title="Lançamentos" value={String(summary.count)} />
    </div>
  );
}
