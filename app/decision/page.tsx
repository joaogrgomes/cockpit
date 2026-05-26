import { DecisionCard } from "@/components/decision/DecisionCard";
import { getDecisionMetrics } from "@/lib/services/decision.service";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const { items } = await getDecisionMetrics();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Decisão</h1>
        <p className="text-sm text-muted-foreground">
          Esta tela não decide por você. Ela organiza leituras objetivas para facilitar sua
          priorização.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Nenhuma dívida elegível para leitura de decisão no momento.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((debt) => (
            <DecisionCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}
    </section>
  );
}
