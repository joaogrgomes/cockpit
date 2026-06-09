import Link from "next/link";
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/calculations";
import { getPaymentMethodLabel } from "@/lib/expenses";
import { getIncomePaymentMethodLabel } from "@/lib/incomes";
import { cn } from "@/lib/utils";
import { getStatementEntryHref } from "@/lib/statement";
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
  const href = getStatementEntryHref(item.originType, item.originId);

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-b border-border/60 px-2 py-3 transition-colors last:border-b-0 hover:bg-muted/30"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
        )}
      >
        {isIncome ? (
          <ArrowUpRightIcon className="size-4" />
        ) : (
          <ArrowDownRightIcon className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
          <Badge variant={isIncome ? "default" : "secondary"} className="h-5 rounded-full px-2">
            {isIncome ? "Entrada" : "Gasto"}
          </Badge>
          <Badge variant="outline" className="h-5 rounded-full px-2">
            {item.source === "linked" ? "Planejado" : "Avulso"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{item.categoryLabel}</span>
          <span>·</span>
          <span>{paymentMethod}</span>
          {item.notes ? (
            <>
              <span>·</span>
              <span className="line-clamp-1">{item.notes}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <p className={cn("text-sm font-semibold tracking-tight sm:text-base", amountClass)}>
          {amountPrefix}
          {formatBRL(item.amount)}
        </p>
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
