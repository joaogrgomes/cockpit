import { MetricCard } from "@/components/dashboard/MetricCard";
import { TopList } from "@/components/dashboard/TopList";
import { PageHeader } from "@/components/layout/page-header";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { getDashboardMetrics } from "@/lib/services/dashboard.service";

export const dynamic = "force-dynamic";

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : ""}${formatBRL(value)}`;
}

function formatSignedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const nextExpiringValue = metrics.nextExpiringProposal
    ? metrics.nextExpiringProposal.debtName
    : "Nenhuma proposta";

  const nextExpiringDescription = metrics.nextExpiringProposal
    ? `Vence em ${metrics.nextExpiringProposal.daysUntilExpiry} dia(s) • ${formatDateOnlyBR(metrics.nextExpiringProposal.expiresAt)}`
    : "Sem proposta ativa com validade futura.";

  return (
    <section className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão consolidada das dívidas ativas, propostas e crescimento." 
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total devido hoje" value={formatBRL(metrics.totalDue)} />
        <MetricCard title="Total original" value={formatBRL(metrics.totalOriginal)} />
        <MetricCard title="Acréscimos acumulados" value={formatBRL(metrics.totalAdditions)} />
        <MetricCard title="Dívidas ativas" value={String(metrics.activeDebts)} />
        <MetricCard title="Dívidas em atraso" value={String(metrics.overdueDebts)} />
        <MetricCard
          title="Dívidas com proposta ativa"
          value={String(metrics.debtsWithActiveProposal)}
        />
        <MetricCard
          title="Valor para quitar (propostas ativas)"
          value={formatBRL(metrics.totalSettlementActiveProposals)}
        />
        <MetricCard title="Economia potencial" value={formatBRL(metrics.totalPotentialSavings)} />
        <MetricCard
          title="Próxima proposta vencendo"
          value={nextExpiringValue}
          description={nextExpiringDescription}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopList
          title="Maiores dívidas (Top 3)"
          emptyMessage="Nenhuma dívida ativa cadastrada."
          items={metrics.topDebts.map((debt) => ({
            id: debt.id,
            title: debt.name,
            subtitle: debt.creditor,
            value: formatBRL(debt.currentValue),
            href: `/debts/${debt.id}`,
          }))}
        />

        <TopList
          title="Melhores oportunidades (Top 3)"
          emptyMessage="Nenhuma proposta ativa válida encontrada."
          items={metrics.bestOpportunities.map((debt) => ({
            id: debt.id,
            title: debt.name,
            subtitle: debt.creditor,
            value: formatSignedPct(debt.discountPct),
            href: `/debts/${debt.id}`,
            meta: `Desconto ${formatSignedCurrency(debt.discountValue)} • Proposta ${formatBRL(debt.proposedValue)}`,
          }))}
        />

        <TopList
          title="Dívidas que mais cresceram (Top 3)"
          emptyMessage="Faltam dívidas com valor original para calcular crescimento."
          items={metrics.fastestGrowingDebts.map((debt) => ({
            id: debt.id,
            title: debt.name,
            subtitle: debt.creditor,
            value: formatSignedPct(debt.growthPct),
            href: `/debts/${debt.id}`,
            meta: `Acréscimo ${formatSignedCurrency(debt.additionsValue)} • Original ${formatBRL(debt.originalValue)}`,
          }))}
        />

        <TopList
          title="Maior risco percebido (Top 3)"
          emptyMessage="Nenhuma dívida ativa para ranquear risco."
          items={metrics.highestRiskDebts.map((debt) => ({
            id: debt.id,
            title: debt.name,
            subtitle: debt.creditor,
            value: formatBRL(debt.currentValue),
            href: `/debts/${debt.id}`,
            meta: `Prioridade: ${debt.priority ?? "-"} • Risco: ${debt.perceivedRisk ?? "-"}`,
          }))}
        />
      </div>
    </section>
  );
}
