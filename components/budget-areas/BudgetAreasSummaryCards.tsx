import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { BudgetAreasAnalysis } from "@/lib/budget-areas";

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : ""}${formatBRL(value)}`;
}

function formatPct(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function BudgetAreasSummaryCards({
  analysis,
  defaultBaseIncomeCents,
}: {
  analysis: BudgetAreasAnalysis;
  defaultBaseIncomeCents: number;
}) {
  const totalPlannedSentence =
    analysis.baseIncomeCents > 0
      ? `Você planejou ${formatBRL(analysis.totalPlannedAmountCents)} sobre uma renda de ${formatBRL(
          analysis.baseIncomeCents
        )} — ${new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(analysis.totalPlannedPct)}% da renda.`
      : "A renda base está zerada. Ajuste manualmente para simular a distribuição.";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Renda base"
          value={formatBRL(analysis.baseIncomeCents)}
          description={
            analysis.baseIncomeCents === defaultBaseIncomeCents
              ? "Calculada a partir das entradas vigentes."
              : `Base calculada: ${formatBRL(defaultBaseIncomeCents)} • simulação local`
          }
        />
        <MetricCard
          title="Total ideal distribuído"
          value={formatBRL(analysis.totalIdealDistributedCents)}
          description={`Modelo ${analysis.model.name}`}
        />
        <MetricCard
          title="Total planejado atual"
          value={formatBRL(analysis.totalPlannedAmountCents)}
          description={
            analysis.baseIncomeCents > 0
              ? `${formatPct(analysis.totalPlannedPct)}% da renda base`
              : "Sem renda base para calcular percentual"
          }
        />
        <MetricCard
          title="Diferença geral"
          value={formatSignedCurrency(analysis.totalDifferenceCents)}
          description="Planejado atual - renda base"
        />
      </div>

      <p className="text-sm text-muted-foreground">{totalPlannedSentence}</p>
    </div>
  );
}
