import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CostAnalysesTabs } from "@/components/cost-analyses/CostAnalysesTabs";
import { getDefaultCostAnalyses } from "@/lib/services/cost-analysis.service";
import {
  createCostAnalysisItemAction,
  deleteCostAnalysisItemAction,
  updateCostAnalysisBaseIncomeAction,
  updateCostAnalysisItemAction,
} from "./actions";
import { createFutureExpenseAction } from "@/app/expenses/future/actions";

export const dynamic = "force-dynamic";

export default async function CostAnalysesPage() {
  const viewModels = await getDefaultCostAnalyses();

  if (viewModels.length === 0) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Análises de Custo"
        description="Avalie o custo mensal e anual de áreas importantes da vida."
      />
      <CostAnalysesTabs
        viewModels={viewModels}
        createFutureExpenseAction={createFutureExpenseAction}
        createCostAnalysisItemAction={createCostAnalysisItemAction}
        updateCostAnalysisBaseIncomeAction={updateCostAnalysisBaseIncomeAction}
        updateCostAnalysisItemAction={updateCostAnalysisItemAction}
        deleteCostAnalysisItemAction={deleteCostAnalysisItemAction}
      />
    </section>
  );
}
