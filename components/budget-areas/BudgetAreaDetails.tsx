import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { getExpenseTypeLabel } from "@/lib/expenses";
import type { BudgetAreaRow } from "@/lib/budget-areas";

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : ""}${formatBRL(value)}`;
}

function getStatusLabel(status: BudgetAreaRow["status"]) {
  switch (status) {
    case "acima_do_ideal":
      return "Acima do ideal";
    case "nao_alocado":
      return "Não alocado";
    default:
      return "Dentro do ideal";
  }
}

function getStatusBadgeVariant(status: BudgetAreaRow["status"]) {
  switch (status) {
    case "acima_do_ideal":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function BudgetAreaDetails({ rows }: { rows: BudgetAreaRow[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <details
          key={row.areaKey}
          className="group rounded-xl border border-border/80 bg-card shadow-sm"
          open={row.items.length > 0 && row.status !== "dentro_do_ideal"}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{row.label}</span>
                <Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ideal {formatBRL(row.idealAmountCents)} • Atual {formatBRL(row.actualPlannedAmountCents)}
              </p>
            </div>
            <div className="text-right text-sm">
              <p
                className={
                  row.differenceCents > 0
                    ? "font-semibold text-destructive"
                    : row.differenceCents < 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-muted-foreground"
                }
              >
                {formatSignedCurrency(row.differenceCents)}
              </p>
              <p className="text-muted-foreground">{row.items.length} item(ns)</p>
            </div>
          </summary>

          <CardContent className="border-t border-border/70 px-4 py-4">
            {row.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens vigentes neste mês.</p>
            ) : (
              <ul className="space-y-3">
                {row.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.categoryLabel} • {getExpenseTypeLabel(item.expenseType)} •{" "}
                        {item.periodLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatBRL(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.periodLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </details>
      ))}
    </div>
  );
}
