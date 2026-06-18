import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DebtSettlementSimulationClient } from "@/components/debt-simulation/DebtSettlementSimulationClient";
import { listDebtSettlementSimulationDebts } from "@/lib/services/debt-settlement-simulation.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DebtSimulationPage() {
  const debts = await listDebtSettlementSimulationDebts();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Simulador de Quitação"
        description="Monte um cenário com diferentes opções de liquidação e veja o impacto imediato e mensal."
        actions={
          <Link href="/debts" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}>
            Voltar para dívidas
          </Link>
        }
      />

      <DebtSettlementSimulationClient debts={debts} />
    </section>
  );
}
