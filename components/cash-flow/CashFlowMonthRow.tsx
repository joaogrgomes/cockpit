import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import type { CashFlowMonth } from "@/lib/cash-flow";

type CashFlowMonthRowProps = {
  month: CashFlowMonth;
};

function SourceBadge({ source }: { source: "planejado" | "realizado" }) {
  if (source === "realizado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        Realizado
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-border/80 text-muted-foreground">
      Planejado
    </Badge>
  );
}

export function CashFlowMonthRow({ month }: CashFlowMonthRowProps) {
  if (month.isBeforeStart) {
    return (
      <TableRow className="border-border/70 bg-muted/20">
        <TableCell className="font-medium">{month.monthLabel}</TableCell>
        <TableCell colSpan={10} className="text-sm text-muted-foreground">
          Antes do início da projeção
        </TableCell>
      </TableRow>
    );
  }

  const resultClassName = month.monthlyResult < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300";
  const closingClassName = month.closingBalance < 0 ? "text-destructive" : "text-foreground";

  return (
    <TableRow className={month.closingBalance < 0 ? "border-border/70 bg-destructive/5" : "border-border/70 hover:bg-muted/25"}>
      <TableCell className="font-medium">{month.monthLabel}</TableCell>
      <TableCell>{formatBRL(month.openingBalance)}</TableCell>
      <TableCell>{formatBRL(month.incomeUsed)}</TableCell>
      <TableCell>
        <SourceBadge source={month.incomeSource} />
      </TableCell>
      <TableCell>{formatBRL(month.fixedExpensesUsed)}</TableCell>
      <TableCell>
        <SourceBadge source={month.fixedExpenseSource} />
      </TableCell>
      <TableCell>{formatBRL(month.variableExpensesUsed)}</TableCell>
      <TableCell>{formatBRL(month.totalExpenses)}</TableCell>
      <TableCell className={`font-medium ${resultClassName}`}>{formatBRL(month.monthlyResult)}</TableCell>
      <TableCell className={`font-semibold ${closingClassName}`}>{formatBRL(month.closingBalance)}</TableCell>
    </TableRow>
  );
}
