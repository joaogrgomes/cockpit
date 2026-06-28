import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatBRL } from "@/lib/calculations";
import type { PatrimonyDashboardView } from "@/lib/patrimony";

export function PatrimonyDashboardCards({ dashboard }: { dashboard: PatrimonyDashboardView }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        title="Patrimônio bruto"
        value={formatBRL(dashboard.grossAssetsCents)}
        description={`${dashboard.assetsCount} ativo(s) ativos no total.`}
      />
      <MetricCard
        title="Passivos"
        value={formatBRL(dashboard.totalLiabilitiesCents)}
        description={`${dashboard.liabilitiesBreakdown.debtsCount} dívida(s) abertas/relevantes.`}
      />
      <MetricCard
        title="Patrimônio líquido"
        value={formatBRL(dashboard.netWorthCents)}
        description="Ativos menos passivos. Pode ficar negativo."
      />
      <MetricCard
        title="Disponível agora"
        value={formatBRL(dashboard.availableNowCents)}
        description="Recursos livres com liquidez imediata ou alta."
      />
      <MetricCard
        title="Reservado/provisionado"
        value={formatBRL(dashboard.reservedCents)}
        description={`${dashboard.reservedAssetsCount} ativo(s) financeiros comprometidos.`}
      />
      <MetricCard
        title="Baixa liquidez"
        value={formatBRL(dashboard.lowLiquidityCents)}
        description="Previdência, bens de uso e posições com liquidez baixa ou muito baixa."
      />
    </div>
  );
}
