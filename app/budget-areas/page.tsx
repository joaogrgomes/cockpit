import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPeriodMonthShort, getCurrentPeriodMonth, normalizePeriodMonth } from "@/lib/recurrence-period";
import { getBudgetAreasViewModel } from "@/lib/services/budget-areas.service";
import { BudgetAreasClient } from "@/components/budget-areas/BudgetAreasClient";

export const dynamic = "force-dynamic";

type BudgetAreasPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function BudgetAreasPage({ searchParams }: BudgetAreasPageProps) {
  const params = searchParams ? await searchParams : {};
  const referenceMonth = normalizePeriodMonth(params.month, new Date());
  const viewModel = await getBudgetAreasViewModel(referenceMonth);
  const currentMonth = getCurrentPeriodMonth();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Planejamento por Áreas"
        description="Compare sua distribuição ideal de renda com o planejamento mensal atual."
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Mês de referência</CardTitle>
              <CardDescription>
                O planejamento mostrado respeita a vigência dos itens ativos no mês selecionado.
              </CardDescription>
            </div>
            <Badge variant={referenceMonth === currentMonth ? "default" : "outline"}>
              {referenceMonth === currentMonth ? "Mês atual" : "Referência"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="month">
                Selecionar mês
              </label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={referenceMonth}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>

            <Button type="submit" size="sm">
              Aplicar
            </Button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            Período exibido: {formatPeriodMonthShort(referenceMonth)}
          </p>
        </CardContent>
      </Card>

      <BudgetAreasClient
        referenceMonth={viewModel.referenceMonth}
        defaultBaseIncomeCents={viewModel.defaultBaseIncomeCents}
        expenseItems={viewModel.expenseItems}
        model={viewModel.model}
      />
    </section>
  );
}
