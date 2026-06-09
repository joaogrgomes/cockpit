import { DebtForm } from "@/components/debt/DebtForm";
import { DebtRow } from "@/components/debt/DebtRow";
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
import { listDebts } from "@/lib/services/debt.service";
import { createDebtAction, deleteDebtAction, updateDebtAction } from "./actions";

const DEBT_TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "renegociacao", label: "Renegociação" },
  { value: "loja", label: "Loja" },
  { value: "cheque_especial", label: "Cheque especial" },
  { value: "outro", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "em_atraso", label: "Em atraso" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "parcelada", label: "Parcelada" },
  { value: "quitada", label: "Quitada" },
  { value: "aguardando_baixa", label: "Aguardando baixa" },
  { value: "baixada", label: "Baixada" },
  { value: "arquivada", label: "Arquivada" },
  { value: "suspensa", label: "Suspensa" },
];

type DebtsPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    sort?: "current_desc" | "current_asc";
    showArchived?: string;
  }>;
};

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    status: params.status ?? "",
    type: params.type ?? "",
    sort: params.sort ?? "current_desc",
    showArchived: params.showArchived === "true",
  };

  const debts = await listDebts({
    status: filters.status || undefined,
    type: filters.type || undefined,
    sort: filters.sort,
    showArchived: filters.showArchived,
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dívidas"
        description="Gerencie suas dívidas, acompanhe evolução e mantenha prioridades visíveis."
        actions={<DebtForm mode="create" action={createDebtAction} />}
      />

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
                defaultValue={filters.status}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="type">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                defaultValue={filters.type}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {DEBT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
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
                <option value="current_desc">Maior valor atual</option>
                <option value="current_asc">Menor valor atual</option>
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="showArchived"
                value="true"
                defaultChecked={filters.showArchived}
                className="h-4 w-4 rounded border-input"
              />
              Mostrar arquivadas
            </label>

            <Button type="submit" size="sm">
              Aplicar filtros
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Dívidas arquivadas ficam ocultas por padrão para reduzir ruído na leitura diária.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de dívidas</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Credor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor atual</TableHead>
                  <TableHead>Acréscimos</TableHead>
                  <TableHead>Crescimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      Nenhuma dívida encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  debts.map((debt) => (
                    <DebtRow
                      key={debt.id}
                      debt={debt}
                      updateAction={updateDebtAction}
                      deleteAction={deleteDebtAction}
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
