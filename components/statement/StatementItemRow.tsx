import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { getPaymentMethodLabel } from "@/lib/expenses";
import { getIncomePaymentMethodLabel } from "@/lib/incomes";
import { cn } from "@/lib/utils";
import type { StatementItem } from "@/lib/statement";

type StatementItemRowProps = {
  item: StatementItem;
};

export function StatementItemRow({ item }: StatementItemRowProps) {
  const isIncome = item.kind === "income";
  const amountClass = isIncome ? "text-emerald-600" : "text-destructive";
  const amountPrefix = isIncome ? "+" : "-";
  const paymentMethod = isIncome
    ? getIncomePaymentMethodLabel(item.paymentMethod)
    : getPaymentMethodLabel(item.paymentMethod);

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isIncome ? "default" : "secondary"} className="rounded-full">
                {isIncome ? "Entrada" : "Gasto"}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {item.source === "linked" ? "Planejado" : "Avulso"}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {item.categoryLabel}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {formatDateOnlyBR(item.date)}
              </p>
              <h3 className="text-base font-semibold leading-tight text-foreground">
                {item.description}
              </h3>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>Método: {paymentMethod}</span>
              <span>Período: {item.periodMonth}</span>
            </div>

            {item.notes ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{item.notes}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 md:items-end md:text-right">
            <p className={cn("text-lg font-semibold tracking-tight", amountClass)}>
              {amountPrefix}
              {formatBRL(item.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.source === "linked" ? "Planejado" : "Avulso"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
