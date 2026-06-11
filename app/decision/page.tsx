import { DecisionCard } from "@/components/decision/DecisionCard";
import { StructuralDecisionCard } from "@/components/decision/StructuralDecisionCard";
import { PageHeader } from "@/components/layout/page-header";
import { getDecisionMetrics } from "@/lib/services/decision.service";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const { payoffItems, structuralItems } = await getDecisionMetrics();

  const hasAnyItems = payoffItems.length > 0 || structuralItems.length > 0;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Decisão"
        description="A tela não decide por você. Ela organiza leituras objetivas para facilitar a priorização."
      />

      {!hasAnyItems ? (
        <div className="rounded-xl border border-border/80 bg-card px-6 py-10 text-sm text-muted-foreground shadow-sm">
          Nenhuma dívida elegível para leitura de decisão no momento.
        </div>
      ) : null}

      {payoffItems.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Oportunidades de quitação</h2>
            <p className="text-sm text-muted-foreground">
              Dívidas que continuam competindo entre si na lógica atual de quitação.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {payoffItems.map((debt) => (
              <DecisionCard key={debt.id} debt={debt} />
            ))}
          </div>
        </div>
      ) : null}

      {structuralItems.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Dívidas estruturantes</h2>
            <p className="text-sm text-muted-foreground">
              Estas dívidas têm alto impacto e devem ser analisadas por parcela, prazo e estratégia
              de renegociação.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {structuralItems.map((debt) => (
              <StructuralDecisionCard key={debt.id} debt={debt} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
