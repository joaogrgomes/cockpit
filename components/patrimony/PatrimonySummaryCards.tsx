import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { PatrimonyTotals } from "@/lib/patrimony";

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function PatrimonySummaryCards({ totals }: { totals: PatrimonyTotals }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        title="Patrimônio total"
        value={formatBRL(totals.totalPatrimonyCents)}
        description="Soma dos ativos em status ativo."
      />
      <MetricCard
        title="Dinheiro livre"
        value={formatBRL(totals.freePatrimonyCents)}
        description="Parte sem destinação comprometida."
      />
      <MetricCard
        title="Dinheiro comprometido"
        value={formatBRL(totals.reservedPatrimonyCents)}
        description="Parte vinculada a objetivos."
      />
      <MetricCard
        title="Objetivos"
        value={formatCount(totals.objectiveCount)}
        description="Quantos objetivos estão em uso agora."
      />
      <MetricCard
        title="Instituições"
        value={formatCount(totals.institutionCount)}
        description="Quantas instituições concentram os ativos."
      />
    </div>
  );
}

