import { DebtForm } from "@/components/debt/DebtForm";
import { DebtRow } from "@/components/debt/DebtRow";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteDebtAction, updateDebtAction, createDebtAction } from "./actions";
import { listDebts } from "@/lib/services/debt.service";

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
  { value: "suspensa", label: "Suspensa" },
];

type DebtsPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    sort?: "current_desc" | "current_asc";
  }>;
};

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    status: params.status ?? "",
    type: params.type ?? "",
    sort: params.sort ?? "current_desc",
  };

  const debts = await listDebts({
    status: filters.status || undefined,
    type: filters.type || undefined,
    sort: filters.sort,
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dívidas</h1>
        <DebtForm mode="create" action={createDebtAction} />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-3" method="get">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status}
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="current_desc">Maior valor atual</option>
            <option value="current_asc">Menor valor atual</option>
          </select>
        </div>

        <Button type="submit" size="sm">
          Aplicar filtros
        </Button>
      </form>

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
              <TableCell colSpan={10} className="text-center text-muted-foreground">
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
    </section>
  );
}
