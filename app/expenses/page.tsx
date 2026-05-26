import { ExpenseSummaryByCategory } from "@/components/expense/ExpenseSummaryByCategory";
import { MonthlyExpenseForm } from "@/components/expense/MonthlyExpenseForm";
import { MonthlyExpenseRow } from "@/components/expense/MonthlyExpenseRow";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/dashboard/MetricCard";
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
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  getExpenseCategoryLabel,
  getExpenseTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/expenses";
import {
  getMonthlyExpenseSummary,
  listMonthlyExpenses,
} from "@/lib/services/monthly-expense.service";
import {
  createMonthlyExpenseAction,
  deleteMonthlyExpenseAction,
  toggleMonthlyExpenseActiveAction,
  updateMonthlyExpenseAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ExpensesPageProps = {
  searchParams?: Promise<{
    category?: string;
    expenseType?: string;
    isActive?: "true" | "false";
    paymentMethod?: string;
    sort?: "due_day" | "amount_desc" | "category";
  }>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = {
    category: params.category ?? "",
    expenseType: params.expenseType ?? "",
    isActive: params.isActive ?? "",
    paymentMethod: params.paymentMethod ?? "",
    sort: params.sort ?? "due_day",
  };

  const [expenses, summary] = await Promise.all([
    listMonthlyExpenses({
      category: filters.category || undefined,
      expenseType: filters.expenseType || undefined,
      isActive:
        filters.isActive === "true" || filters.isActive === "false"
          ? filters.isActive
          : undefined,
      paymentMethod: filters.paymentMethod || undefined,
      sort: filters.sort,
    }),
    getMonthlyExpenseSummary(),
  ]);

  const nextDueLabel = summary.nextDue
    ? `Dia ${summary.nextDue.dueDay} • ${summary.nextDue.name}`
    : "Sem vencimento definido";

  const nextDueDescription = summary.nextDue
    ? formatBRL(summary.nextDue.amount)
    : "Cadastre due_day para acompanhar o próximo compromisso.";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Gastos mensais"
        description="Controle seus compromissos mensais e entenda quanto sua vida custa por mês."
        actions={<MonthlyExpenseForm mode="create" action={createMonthlyExpenseAction} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total mensal ativo" value={formatBRL(summary.totalMonthlyActive)} />
        <MetricCard title="Total fixo" value={formatBRL(summary.totalFixed)} />
        <MetricCard title="Total variável" value={formatBRL(summary.totalVariable)} />
        <MetricCard title="Gastos ativos" value={String(summary.activeCount)} />
        <MetricCard
          title="Próximo vencimento"
          value={nextDueLabel}
          description={nextDueDescription}
        />
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
                {EXPENSE_CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {getExpenseCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="expenseType">
                Tipo
              </label>
              <select
                id="expenseType"
                name="expenseType"
                defaultValue={filters.expenseType}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {EXPENSE_TYPE_VALUES.map((expenseType) => (
                  <option key={expenseType} value={expenseType}>
                    {getExpenseTypeLabel(expenseType)}
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
                Pagamento
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={filters.paymentMethod}
                className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {PAYMENT_METHOD_VALUES.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {getPaymentMethodLabel(paymentMethod)}
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
                <option value="due_day">Por vencimento</option>
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
          <CardTitle className="text-base">Lista de gastos mensais</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum gasto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <MonthlyExpenseRow
                      key={expense.id}
                      expense={expense}
                      updateAction={updateMonthlyExpenseAction}
                      deleteAction={deleteMonthlyExpenseAction}
                      toggleActiveAction={toggleMonthlyExpenseActiveAction}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExpenseSummaryByCategory
        rows={summary.byCategory}
        totalFixed={summary.totalFixed}
        totalVariable={summary.totalVariable}
        totalMonthlyActive={summary.totalMonthlyActive}
      />
    </section>
  );
}
