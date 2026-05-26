import { MetricCard } from "@/components/dashboard/MetricCard";
import { TopList } from "@/components/dashboard/TopList";
import { formatBRL } from "@/lib/calculations";
import { getDashboardMetrics } from "@/lib/services/dashboard.service";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total devido hoje" value={formatBRL(metrics.totalDue)} />
        <MetricCard title="Total original" value={formatBRL(metrics.totalOriginal)} />
        <MetricCard title="Acréscimos acumulados" value={formatBRL(metrics.totalAdditions)} />
        <MetricCard title="Dívidas ativas" value={String(metrics.activeDebts)} />
        <MetricCard title="Dívidas em atraso" value={String(metrics.overdueDebts)} />
      </div>

      <TopList debts={metrics.topDebts} />
    </section>
  );
}
