"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/calculations";
import { type CostAnalysisViewModel } from "@/lib/services/cost-analysis.service";
import { CostAnalysisBaseIncomeForm } from "./CostAnalysisBaseIncomeForm";
import { CostAnalysisItemForm } from "./CostAnalysisItemForm";
import { CostAnalysisItemsTable } from "./CostAnalysisItemsTable";
import { CostAnalysisSummaryCards } from "./CostAnalysisSummaryCards";

type CostAnalysisActionResult = {
  ok: boolean;
  error?: string;
};

type CostAnalysesTabsProps = {
  viewModels: CostAnalysisViewModel[];
  createFutureExpenseAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  createCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateCostAnalysisBaseIncomeAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  deleteCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
};

function getAnalysisTabLabel(viewModel: CostAnalysisViewModel): string {
  if (viewModel.analysis.slug === "carro") return "Carro";
  if (viewModel.analysis.slug === "moradia") return "Moradia";
  return viewModel.analysis.name;
}

function CostAnalysisSection({
  viewModel,
  createFutureExpenseAction,
  createCostAnalysisItemAction,
  updateCostAnalysisBaseIncomeAction,
  updateCostAnalysisItemAction,
  deleteCostAnalysisItemAction,
}: {
  viewModel: CostAnalysisViewModel;
  createFutureExpenseAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  createCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateCostAnalysisBaseIncomeAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  updateCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
  deleteCostAnalysisItemAction: (formData: FormData) => Promise<CostAnalysisActionResult>;
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

export function CostAnalysesTabs({
  viewModels,
  createFutureExpenseAction,
  createCostAnalysisItemAction,
  updateCostAnalysisBaseIncomeAction,
  updateCostAnalysisItemAction,
  deleteCostAnalysisItemAction,
}: CostAnalysesTabsProps) {
  const defaultValue = viewModels.find((viewModel) => viewModel.analysis.slug === "carro")?.analysis.slug
    ?? viewModels[0]?.analysis.slug
    ?? "";

  return (
    <Tabs defaultValue={defaultValue} className="space-y-4">
      <TabsList>
        {viewModels.map((viewModel) => (
          <TabsTrigger key={viewModel.analysis.id} value={viewModel.analysis.slug}>
            {getAnalysisTabLabel(viewModel)}
          </TabsTrigger>
        ))}
      </TabsList>

      {viewModels.map((viewModel) => (
        <TabsContent key={viewModel.analysis.id} value={viewModel.analysis.slug}>
          <CostAnalysisSection
            viewModel={viewModel}
            createFutureExpenseAction={createFutureExpenseAction}
            createCostAnalysisItemAction={createCostAnalysisItemAction}
            updateCostAnalysisBaseIncomeAction={updateCostAnalysisBaseIncomeAction}
            updateCostAnalysisItemAction={updateCostAnalysisItemAction}
            deleteCostAnalysisItemAction={deleteCostAnalysisItemAction}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
