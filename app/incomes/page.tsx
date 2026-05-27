import { MetricCard } from "@/components/dashboard/MetricCard";
import { MonthlyIncomeForm } from "@/components/income/MonthlyIncomeForm";
import { MonthlyIncomeRow } from "@/components/income/MonthlyIncomeRow";
import { IncomeSummaryByCategory } from "@/components/income/IncomeSummaryByCategory";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import {
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  getIncomeCategoryLabel,
  getIncomePaymentMethodLabel,
} from "@/lib/incomes";
import {
  getMonthlyIncomeSummary,
  listMonthlyIncomes,
} from "@/lib/services/monthly-income.service";
import {
  createMonthlyIncomeAction,
  deleteMonthlyIncomeAction,
  toggleMonthlyIncomeActiveAction,
  updateMonthlyIncomeAction,
} from "./actions";

export const dynamic = "force-dynamic";

type IncomesPageProps = {
  searchParams?: Promise<{
    category?: string;
    isActive?: "true" | "false";
    paymentMethod?: string;
    sort?: "expected_day" | "amount_desc" | "category";
  }>;
};

export default async function IncomesPage({ searchParams }: IncomesPageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    category: params.category ?? "",
    isActive: params.isActive ?? "",
    paymentMethod: params.paymentMethod ?? "",
    sort: params.sort ?? "expected_day",
  };

  const [incomes, summary] = await Promise.all([
    listMonthlyIncomes({
      category: filters.category || undefined,
      isActive:
        filters.isActive === "true" || filters.isActive === "false"
          ? filters.isActive
          : undefined,
      paymentMethod: filters.paymentMethod || undefined,
      sort: filters.sort,
    }),
    getMonthlyIncomeSummary(),
  ]);

  const nextExpectedLabel = summary.nextExpected
    ? `Dia ${summary.nextExpected.expectedDay} • ${summary.nextExpected.name}`
    : "Sem dia previsto";

  const nextExpectedDescription = summary.nextExpected
    ? formatBRL(summary.nextExpected.amount)
    : "Cadastre expected_day para destacar o próximo recebimento.";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Entradas"
        description="Cadastre suas entradas previstas e recorrentes para entender quanto deve entrar por mês."
        actions={<MonthlyIncomeForm mode="create" action={createMonthlyIncomeAction} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total previsto ativo" value={formatBRL(summary.totalPlannedActive)} />
        <MetricCard title="Entradas ativas" value={String(summary.activeCount)} />
        <MetricCard title="Próxima entrada" value={nextExpectedLabel} description={nextExpectedDescription} />
        <MetricCard title="Categorias ativas" value={String(summary.byCategory.length)} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="category">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                defaultValue={filters.category}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {INCOME_CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {getIncomeCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="isActive">
                Situação
              </label>
              <select
                id="isActive"
                name="isActive"
                defaultValue={filters.isActive}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="paymentMethod">
                Recebimento
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={filters.paymentMethod}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {INCOME_PAYMENT_METHOD_VALUES.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {getIncomePaymentMethodLabel(paymentMethod)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sort">
                Ordenação
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={filters.sort}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="expected_day">Por dia previsto</option>
                <option value="amount_desc">Maior valor</option>
                <option value="category">Por categoria</option>
              </select>
            </div>

            <Button type="submit" size="sm">
              Aplicar filtros
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de entradas previstas</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor previsto</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhuma entrada encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  incomes.map((income) => (
                    <MonthlyIncomeRow
                      key={income.id}
                      income={income}
                      updateAction={updateMonthlyIncomeAction}
                      deleteAction={deleteMonthlyIncomeAction}
                      toggleActiveAction={toggleMonthlyIncomeActiveAction}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <IncomeSummaryByCategory
        rows={summary.byCategory}
        totalPlannedActive={summary.totalPlannedActive}
      />
    </section>
  );
}
