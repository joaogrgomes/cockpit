import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { getDefaultCostAnalyses } from "@/lib/services/cost-analysis.service";
import { CostAnalysisBaseIncomeForm } from "@/components/cost-analyses/CostAnalysisBaseIncomeForm";
import { CostAnalysisItemForm } from "@/components/cost-analyses/CostAnalysisItemForm";
import { CostAnalysisItemsTable } from "@/components/cost-analyses/CostAnalysisItemsTable";
import { CostAnalysisSummaryCards } from "@/components/cost-analyses/CostAnalysisSummaryCards";
import {
  createCostAnalysisItemAction,
  deleteCostAnalysisItemAction,
  updateCostAnalysisBaseIncomeAction,
  updateCostAnalysisItemAction,
} from "./actions";
import { createFutureExpenseAction } from "@/app/expenses/future/actions";

export const dynamic = "force-dynamic";

function CostAnalysisSection({
  viewModel,
}: {
  viewModel: Awaited<ReturnType<typeof getDefaultCostAnalyses>>[number];
}) {
  const { analysis, suggestedNetIncomeCents } = viewModel;

  return (
    <section className="space-y-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{analysis.name}</CardTitle>
              <CardDescription>{analysis.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{analysis.slug}</Badge>
              <CardAction>
                <CostAnalysisItemForm
                  mode="create"
                  analysisId={analysis.id}
                  action={createCostAnalysisItemAction}
                />
              </CardAction>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este diagnóstico ajuda a enxergar o custo anual e mensal de {analysis.name.toLowerCase()},
            separando o que sai do caixa, o que é provisão e o que é custo econômico.
          </p>
        </CardContent>
      </Card>

      <CostAnalysisSummaryCards viewModel={viewModel} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Rendas base</CardTitle>
              <CardDescription>
                Ajuste a renda líquida e bruta para simular o peso do custo sobre sua realidade.
              </CardDescription>
            </div>
            <CardAction>
              <CostAnalysisBaseIncomeForm
                analysisId={analysis.id}
                baseNetIncomeCents={analysis.baseNetIncomeCents}
                baseGrossIncomeCents={analysis.baseGrossIncomeCents}
                suggestedNetIncomeCents={suggestedNetIncomeCents}
                action={updateCostAnalysisBaseIncomeAction}
              />
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Renda líquida base
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatBRL(analysis.baseNetIncomeCents)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sugestão atual do planejamento: {formatBRL(suggestedNetIncomeCents)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Renda bruta base
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatBRL(analysis.baseGrossIncomeCents)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use para medir o esforço do custo total sobre a renda bruta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Itens da análise</CardTitle>
          <CardDescription>
            Cadastre ou ajuste os custos mensais que compõem {analysis.name.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-4">
            <CostAnalysisItemsTable
              analysisId={analysis.id}
              analysisName={analysis.name}
              items={viewModel.items}
              scheduledCountsByItemId={viewModel.scheduledCountsByItemId}
              createFutureExpenseAction={createFutureExpenseAction}
              updateAction={updateCostAnalysisItemAction}
              deleteAction={deleteCostAnalysisItemAction}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como interpretar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Saída de caixa é o que normalmente sai do bolso no mês. Provisão é o valor
            mensalizado de custos periódicos. Custo econômico representa perda ou custo real sem
            boleto mensal, como depreciação.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default async function CostAnalysesPage() {
  const viewModels = await getDefaultCostAnalyses();

  if (viewModels.length === 0) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Análises de Custo"
        description="Entenda custos importantes sem confundir tudo com o fluxo de caixa."
      />

      {viewModels.map((viewModel) => (
        <CostAnalysisSection key={viewModel.analysis.id} viewModel={viewModel} />
      ))}
    </section>
  );
}
