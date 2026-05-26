import { DecisionCard } from "@/components/decision/DecisionCard";
import { PageHeader } from "@/components/layout/page-header";
import { getDecisionMetrics } from "@/lib/services/decision.service";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const { items } = await getDecisionMetrics();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Decisão"
        description="A tela não decide por você. Ela organiza leituras objetivas para facilitar a priorização."
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card px-6 py-10 text-sm text-muted-foreground shadow-sm">
          Nenhuma dívida elegível para leitura de decisão no momento.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((debt) => (
            <DecisionCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}
    </section>
  );
}
