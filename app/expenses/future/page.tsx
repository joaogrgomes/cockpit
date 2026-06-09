import { MetricCard } from "@/components/dashboard/MetricCard";
import { FutureExpenseForm } from "@/components/expense/FutureExpenseForm";
import { FutureExpenseRow } from "@/components/expense/FutureExpenseRow";
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
import { listFutureExpensePayables } from "@/lib/services/future-expense.service";
import {
  cancelFutureExpenseAction,
  createFutureExpenseAction,
  markFutureExpenseAsRealizedAction,
  updateFutureExpenseAction,
} from "./actions";

export const dynamic = "force-dynamic";

type FutureExpensesPageProps = {
  searchParams?: Promise<{
    status?: "previsto" | "realizado" | "cancelado" | "todos";
    sort?: "expected_date_asc" | "expected_date_desc";
  }>;
};

export default async function FutureExpensesPage({
  searchParams,
}: FutureExpensesPageProps) {
  const params = searchParams ? await searchParams : {};
  const status = params.status ?? "previsto";
  const sort = params.sort ?? "expected_date_asc";

  const [futureExpenses, allFutureExpenses] = await Promise.all([
    listFutureExpensePayables({ status, sort }),
    listFutureExpensePayables({ status: "todos", sort: "expected_date_asc" }),
  ]);

  const expectedTotal = allFutureExpenses
    .filter((item) => item.status === "previsto")
    .reduce((sum, item) => sum + item.expectedAmount, 0);
  const plannedCount = allFutureExpenses.filter((item) => item.status === "previsto").length;
  const realizedCount = allFutureExpenses.filter((item) => item.status === "realizado").length;
  const canceledCount = allFutureExpenses.filter((item) => item.status === "cancelado").length;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Gastos futuros"
        description="Cadastre saídas únicas previstas para projetar seu caixa nos próximos meses."
        actions={<FutureExpenseForm mode="create" action={createFutureExpenseAction} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total previsto aberto" value={formatBRL(expectedTotal)} />
        <MetricCard title="Previstos" value={String(plannedCount)} />
        <MetricCard title="Realizados" value={String(realizedCount)} />
        <MetricCard title="Cancelados" value={String(canceledCount)} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="previsto">Previstos</option>
                <option value="realizado">Realizados</option>
                <option value="cancelado">Cancelados</option>
                <option value="todos">Todos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sort">
                Ordenação
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="expected_date_asc">Data prevista (próximas primeiro)</option>
                <option value="expected_date_desc">Data prevista (mais distantes primeiro)</option>
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
          <CardTitle className="text-base">Lista de gastos futuros</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data prevista</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Valor previsto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum gasto futuro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  futureExpenses.map((futureExpense) => (
                    <FutureExpenseRow
                      key={futureExpense.id}
                      futureExpense={futureExpense}
                      updateAction={updateFutureExpenseAction}
                      cancelAction={cancelFutureExpenseAction}
                      markAsRealizedAction={markFutureExpenseAsRealizedAction}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
