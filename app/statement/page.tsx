import Link from "next/link";
import { OneTimeIncomeEntryForm } from "@/components/income-tracking/OneTimeIncomeEntryForm";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatementExpenseEntryForm } from "@/components/statement/StatementExpenseEntryForm";
import {
  getStatementByPeriod,
  getStatementOpeningBalance,
} from "@/lib/services/statement.service";
import { listMonthlyExpenses } from "@/lib/services/monthly-expense.service";
import {
  getStatementCategoryGroups,
  normalizeStatementCategory,
  normalizeStatementPeriodMonth,
  normalizeStatementQuery,
  normalizeStatementType,
} from "@/lib/statement";
import { createMonthlyExpenseEntryAction, createOneTimeExpenseEntryAction } from "@/app/expenses/tracking/actions";
import { createOneTimeIncomeEntryAction } from "@/app/incomes/tracking/actions";
import { StatementFilters } from "@/components/statement/StatementFilters";
import { StatementSummaryCards } from "@/components/statement/StatementSummaryCards";
import { StatementTimeline } from "@/components/statement/StatementTimeline";

export const dynamic = "force-dynamic";

type StatementPageProps = {
  searchParams?: Promise<{
    month?: string;
    type?: string;
    category?: string;
    q?: string;
  }>;
};

export default async function StatementPage({ searchParams }: StatementPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedPeriod = normalizeStatementPeriodMonth(params.month);
  const selectedType = normalizeStatementType(params.type);
  const selectedCategory = normalizeStatementCategory(params.category);
  const selectedQuery = normalizeStatementQuery(params.q);

  const [statement, monthlyExpenses, openingBalanceCents] = await Promise.all([
    getStatementByPeriod({
      periodMonth: selectedPeriod,
      type: selectedType,
      category: selectedCategory,
      query: selectedQuery,
    }),
    listMonthlyExpenses({
      isActive: "true",
      sort: "category",
      periodMonth: selectedPeriod,
    }),
    getStatementOpeningBalance(selectedPeriod),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Extrato"
        description="Acompanhe todos os lançamentos realizados em ordem cronológica para bater com seu extrato bancário."
        actions={
          <>
            <OneTimeIncomeEntryForm
              periodMonth={statement.periodMonth}
              action={createOneTimeIncomeEntryAction}
            />
            <Link
              href="/statement/import"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Importar extrato
            </Link>
            <StatementExpenseEntryForm
              periodMonth={statement.periodMonth}
              monthlyExpenses={monthlyExpenses}
              linkedAction={createMonthlyExpenseEntryAction}
              oneTimeAction={createOneTimeExpenseEntryAction}
            />
          </>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <StatementFilters
            periodMonth={statement.periodMonth}
            type={selectedType}
            category={selectedCategory ?? "all"}
            query={selectedQuery ?? ""}
            categoryGroups={getStatementCategoryGroups()}
          />
        </CardContent>
      </Card>

      <StatementSummaryCards summary={statement.summary} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StatementTimeline
            items={statement.items}
            periodMonth={statement.periodMonth}
            openingBalanceCents={openingBalanceCents}
          />
        </CardContent>
      </Card>
    </section>
  );
}
