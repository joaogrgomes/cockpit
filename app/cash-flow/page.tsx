import { CashFlowSettingsForm } from "@/components/cash-flow/CashFlowSettingsForm";
import { CashFlowSummaryCards } from "@/components/cash-flow/CashFlowSummaryCards";
import { CashFlowTable } from "@/components/cash-flow/CashFlowTable";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentPeriodMonth } from "@/lib/cash-flow";
import { getCashFlowProjection } from "@/lib/services/cash-flow.service";
import {
  closeMonthAction,
  reopenMonthAction,
  upsertCashFlowSettingsAction,
} from "./actions";

export const dynamic = "force-dynamic";

type CashFlowPageProps = {
  searchParams?: Promise<{ year?: string }>;
};

function getCurrentYear(): number {
  return Number.parseInt(getCurrentPeriodMonth().slice(0, 4), 10);
}

function parseYear(value: string | undefined): number {
  if (!value) return getCurrentYear();

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1900 || parsed > 3000) {
    return getCurrentYear();
  }

  return parsed;
}

export default async function CashFlowPage({ searchParams }: CashFlowPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedYear = parseYear(params.year);
  const projection = await getCashFlowProjection(selectedYear);

  return (
    <section className="w-full max-w-none space-y-6">
      <PageHeader
        title="Fluxo de caixa"
        description="Acompanhe o resultado e o saldo mês a mês com leitura prevista e realizada."
        actions={
          <CashFlowSettingsForm
            startMonth={projection.settings.startMonth}
            initialBalance={projection.settings.initialBalance}
            action={upsertCashFlowSettingsAction}
          />
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ano de referência</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="year">
                Selecione o ano
              </label>
              <input
                id="year"
                name="year"
                type="number"
                min={1900}
                max={3000}
                defaultValue={selectedYear}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button type="submit" size="sm">
              Aplicar
            </Button>
          </form>
        </CardContent>
      </Card>

      {projection.settings.isFallback ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 dark:text-amber-100">
              Configure o saldo inicial para começar a projeção
            </CardTitle>
            <CardDescription className="text-amber-800/90 dark:text-amber-200/80">
              Ainda não existe configuração salva. O fluxo está usando fallback com mês atual e saldo inicial de R$ 0,00.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p>Resultado é o movimento do mês. Saldo é o acumulado após esse movimento.</p>
        <p>Previsto considera planejamento e valores futuros. Realizado considera apenas entradas e gastos já lançados.</p>
      </div>

      <CashFlowSummaryCards summary={projection.summary} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projeção mensal ({projection.year})</CardTitle>
          <CardDescription>
            O mês atual aparece em destaque. Meses fechados anteriores começam recolhidos para reduzir ruído visual.
            Projetado considera o melhor valor atual do mês: planejado ou realizado, o que for maior quando o mês ainda está aberto.
            Entradas futuras previstas somam no mês esperado. Gastos futuros previstos também somam no mês esperado.
            Parcial considera apenas entradas e gastos já realizados.
            Meses fechados usam valores realizados como verdade final.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full px-4 sm:px-6">
          <CashFlowTable
            months={projection.months}
            currentPeriodMonth={getCurrentPeriodMonth()}
            closeMonthAction={closeMonthAction}
            reopenMonthAction={reopenMonthAction}
          />
        </CardContent>
      </Card>
    </section>
  );
}
