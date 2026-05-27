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
        <TableCell colSpan={11} className="text-sm text-muted-foreground">
          Antes do início da projeção
        </TableCell>
      </TableRow>
    );
  }

  const projectedResultClassName =
    month.monthlyResult < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300";
  const partialResultClassName =
    month.partialMonthlyResult < 0
      ? "text-destructive"
      : "text-emerald-700 dark:text-emerald-300";
  const projectedClosingClassName =
    month.closingBalance < 0 ? "text-destructive" : "text-foreground";
  const partialClosingClassName =
    month.partialClosingBalance < 0 ? "text-destructive" : "text-foreground";
  const remainingVariableClassName =
    month.remainingVariableBudget < 0
      ? "text-destructive"
      : "text-emerald-700 dark:text-emerald-300";

  return (
    <TableRow className={month.closingBalance < 0 ? "border-border/70 bg-destructive/5" : "border-border/70 hover:bg-muted/25"}>
      <TableCell className="font-medium">{month.monthLabel}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.openingBalance)}</p>
          {month.partialOpeningBalance !== month.openingBalance ? (
            <p className="text-xs text-muted-foreground">
              Parcial: {formatBRL(month.partialOpeningBalance)}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.incomeUsed)}</p>
          <SourceBadge source={month.incomeSource} />
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.fixedExpensesUsed)}</p>
          <SourceBadge source={month.fixedExpenseSource} />
        </div>
      </TableCell>
      <TableCell>{formatBRL(month.plannedVariableExpenses)}</TableCell>
      <TableCell>{formatBRL(month.actualVariableExpenses)}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <p className={`font-medium ${remainingVariableClassName}`}>
            {formatBRL(month.remainingVariableBudget)}
          </p>
          {month.variableBudgetStatus === "estourado" ? (
            <Badge variant="destructive">Estourado</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={`font-medium ${projectedResultClassName}`}>
        {formatBRL(month.monthlyResult)}
      </TableCell>
      <TableCell className={`font-medium ${partialResultClassName}`}>
        {formatBRL(month.partialMonthlyResult)}
      </TableCell>
      <TableCell className={`font-semibold ${projectedClosingClassName}`}>
        {formatBRL(month.closingBalance)}
      </TableCell>
      <TableCell className={`font-medium ${partialClosingClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.partialClosingBalance)}</p>
          {!month.hasActualVariableExpenses ? (
            <p className="text-xs text-muted-foreground">Sem variável realizado no mês</p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
