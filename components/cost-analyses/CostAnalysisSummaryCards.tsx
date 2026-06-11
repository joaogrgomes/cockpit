import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import type { CostAnalysisViewModel } from "@/lib/services/cost-analysis.service";

function formatPercent(value: number | null) {
  if (value === null) return "—";

  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function CostAnalysisSummaryCards({
  viewModel,
}: {
  viewModel: CostAnalysisViewModel;
}) {
  const { analysis, totals } = viewModel;

  const plannedSentence =
    analysis.baseNetIncomeCents > 0
      ? `Você está analisando ${formatBRL(totals.totalMonthlyCents)} sobre uma renda líquida de ${formatBRL(analysis.baseNetIncomeCents)} — ${formatPercent(totals.netIncomePercentage)} da renda.`
      : "Defina a renda líquida base para comparar o custo total com a sua realidade.";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total mensal"
          value={formatBRL(totals.totalMonthlyCents)}
          description="Soma de todos os itens mensais."
        />
        <MetricCard
          title="Total anual"
          value={formatBRL(totals.totalAnnualCents)}
          description="Total mensal multiplicado por 12."
        />
        <MetricCard
          title="% da renda líquida"
          value={formatPercent(totals.netIncomePercentage)}
          description="Comparação com a renda líquida base."
        />
        <MetricCard
          title="% da renda bruta"
          value={formatPercent(totals.grossIncomePercentage)}
          description="Comparação com a renda bruta base."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Saída de caixa mensal"
          value={formatBRL(totals.totalCashMonthlyCents)}
          description="O que costuma sair diretamente do bolso."
        />
        <MetricCard
          title="Provisões mensais"
          value={formatBRL(totals.totalProvisionMonthlyCents)}
          description="Custos mensalizados de períodos maiores."
        />
        <MetricCard
          title="Custo econômico mensal"
          value={formatBRL(totals.totalEconomicMonthlyCents)}
          description="Custos reais que nem sempre aparecem como boleto."
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leitura rápida</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{plannedSentence}</p>
        </CardContent>
      </Card>
    </div>
  );
}
