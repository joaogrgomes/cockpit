import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import {
  buildOneTimeExpenseSummaryByCategory,
  type ExpenseTrackingOneTimeCategorySummaryItem,
} from "@/lib/expense-tracking";
import type { ExpenseTrackingOneTimeEntryView } from "@/lib/services/monthly-expense-entry.service";
import { MetricCard } from "@/components/dashboard/MetricCard";

type OneTimeExpenseEntriesSummaryProps = {
  entries: ExpenseTrackingOneTimeEntryView[];
};

function CategoryBadge({
  item,
}: {
  item: ExpenseTrackingOneTimeCategorySummaryItem;
}) {
  return (
    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
      {getExpenseCategoryLabel(item.category)} · {formatBRL(item.totalAmount)} · {item.count}
    </Badge>
  );
}

export function OneTimeExpenseEntriesSummary({
  entries,
}: OneTimeExpenseEntriesSummaryProps) {
  const totalAmount = entries.reduce((total, entry) => total + entry.amount, 0);
  const categories = buildOneTimeExpenseSummaryByCategory(entries);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total avulso"
          value={formatBRL(totalAmount)}
          description="Fora do planejamento normal"
        />
        <MetricCard
          title="Lançamentos"
          value={String(entries.length)}
          description="Itens registrados no mês"
        />
        <MetricCard
          title="Categorias"
          value={String(categories.length)}
          description="Agrupadas por categoria"
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Principais categorias avulsas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum gasto avulso para agrupar.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <CategoryBadge key={item.category} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
