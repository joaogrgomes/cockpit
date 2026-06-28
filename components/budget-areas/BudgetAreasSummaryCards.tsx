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
  savedBaseIncomeCents,
  calculatedBaseIncomeCents,
  isDirty,
}: {
  analysis: BudgetAreasAnalysis;
  savedBaseIncomeCents: number;
  calculatedBaseIncomeCents: number;
  isDirty: boolean;
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Renda base"
          value={formatBRL(analysis.baseIncomeCents)}
          description={
            isDirty
              ? `Salva: ${formatBRL(savedBaseIncomeCents)} • simulação local`
              : "Igual à configuração salva."
          }
        />
        <MetricCard
          title="Renda calculada no mês"
          value={formatBRL(calculatedBaseIncomeCents)}
          description={
            calculatedBaseIncomeCents > 0
              ? "Soma das receitas mensais ativas na referência."
              : "Nenhuma receita mensal ativa encontrada."
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
