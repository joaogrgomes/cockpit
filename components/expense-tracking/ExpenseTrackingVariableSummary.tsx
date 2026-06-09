import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { ExpenseTrackingVariableBreakdown } from "@/lib/expense-tracking";

type ExpenseTrackingVariableSummaryProps = {
  breakdown: ExpenseTrackingVariableBreakdown;
};

export function ExpenseTrackingVariableSummary({
  breakdown,
}: ExpenseTrackingVariableSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard
        title="Planejado"
        value={formatBRL(breakdown.plannedAmount)}
        description="Orçamento variável do mês"
      />
      <MetricCard
        title="Consumo planejado"
        value={formatBRL(breakdown.linkedActualAmount)}
        description="Lançamentos vinculados ao orçamento"
      />
      <MetricCard
        title="Restante do planejado"
        value={formatBRL(breakdown.remainingPlannedAmount)}
        description="Planejado - consumo planejado"
      />
      <MetricCard
        title="Avulsos"
        value={formatBRL(breakdown.oneTimeActualAmount)}
        description="Fora do planejamento normal"
      />
      <MetricCard
        title="Total realizado"
        value={formatBRL(breakdown.totalActualAmount)}
        description="Planejado + avulsos"
      />
      <MetricCard
        title="Estouro total"
        value={formatBRL(breakdown.overBudgetAmount)}
        description="Excesso sobre o orçamento"
      />
    </div>
  );
}
