import { MetricCard } from "@/components/dashboard/MetricCard";
import { FutureIncomeForm } from "@/components/income/FutureIncomeForm";
import { FutureIncomeRow } from "@/components/income/FutureIncomeRow";
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
import { listFutureIncomeReceivables } from "@/lib/services/future-income.service";
import {
  cancelFutureIncomeAction,
  createFutureIncomeAction,
  markFutureIncomeAsReceivedAction,
  updateFutureIncomeAction,
} from "./actions";

export const dynamic = "force-dynamic";

type FutureIncomesPageProps = {
  searchParams?: Promise<{
    status?: "prevista" | "recebida" | "cancelada" | "todas";
    sort?: "expected_date_asc" | "expected_date_desc";
  }>;
};

export default async function FutureIncomesPage({
  searchParams,
}: FutureIncomesPageProps) {
  const params = searchParams ? await searchParams : {};
  const status = params.status ?? "prevista";
  const sort = params.sort ?? "expected_date_asc";

  const [futureIncomes, allFutureIncomes] = await Promise.all([
    listFutureIncomeReceivables({ status, sort }),
    listFutureIncomeReceivables({ status: "todas", sort: "expected_date_asc" }),
  ]);

  const expectedTotal = allFutureIncomes
    .filter((item) => item.status === "prevista")
    .reduce((sum, item) => sum + item.expectedAmount, 0);
  const plannedCount = allFutureIncomes.filter((item) => item.status === "prevista").length;
  const receivedCount = allFutureIncomes.filter((item) => item.status === "recebida").length;
  const cancelledCount = allFutureIncomes.filter((item) => item.status === "cancelada").length;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Entradas futuras"
        description="Cadastre receitas únicas previstas para projetar seu caixa nos próximos meses."
        actions={<FutureIncomeForm mode="create" action={createFutureIncomeAction} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total previsto aberto" value={formatBRL(expectedTotal)} />
        <MetricCard title="Previstas" value={String(plannedCount)} />
        <MetricCard title="Recebidas" value={String(receivedCount)} />
        <MetricCard title="Canceladas" value={String(cancelledCount)} />
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
                <option value="prevista">Previstas</option>
                <option value="recebida">Recebidas</option>
                <option value="cancelada">Canceladas</option>
                <option value="todas">Todas</option>
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
          <CardTitle className="text-base">Lista de entradas futuras</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data prevista</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor previsto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureIncomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma entrada futura encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  futureIncomes.map((futureIncome) => (
                    <FutureIncomeRow
                      key={futureIncome.id}
                      futureIncome={futureIncome}
                      updateAction={updateFutureIncomeAction}
                      cancelAction={cancelFutureIncomeAction}
                      markAsReceivedAction={markFutureIncomeAsReceivedAction}
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
