import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { canClosePeriodMonth, getCurrentPeriodMonth } from "@/lib/cash-flow";
import type { CashFlowMonth, CashFlowSource } from "@/lib/cash-flow";
import { MonthClosingActions } from "./MonthClosingActions";

type CashFlowMonthRowProps = {
  month: CashFlowMonth;
  closeMonthAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  reopenMonthAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

function SourceBadge({
  source,
}: {
  source: CashFlowSource;
}) {
  if (source === "realizado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        Realizado
      </Badge>
    );
  }

  if (source === "planejado_avulso") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        Previsto + avulso
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-border/80 text-muted-foreground">
      Previsto
    </Badge>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      {label}: {formatBRL(value)}
    </p>
  );
}

export function CashFlowMonthRow({
  month,
  closeMonthAction,
  reopenMonthAction,
}: CashFlowMonthRowProps) {
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
  const canClose = canClosePeriodMonth(month.periodMonth, getCurrentPeriodMonth());
  const isPartialEqual =
    month.partialMonthlyResult === month.monthlyResult &&
    month.partialClosingBalance === month.closingBalance;
  const incomeStatusLabel = month.isClosed ? "Realizado" : "Previsto";

  return (
    <TableRow
      className={
        month.closingBalance < 0
          ? "border-border/70 bg-destructive/5"
          : "border-border/70 hover:bg-muted/25"
      }
    >
      <TableCell className="font-medium">{month.monthLabel}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.openingBalance)}</p>
          {month.partialOpeningBalance !== month.openingBalance ? (
            <p className="text-xs text-muted-foreground">
              Realizado: {formatBRL(month.partialOpeningBalance)}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.incomeUsed)}</p>
          <Badge
            variant="outline"
            className={month.isClosed ? "border-emerald-300 text-emerald-800" : "border-border/80 text-muted-foreground"}
          >
            {incomeStatusLabel}
          </Badge>
          {month.expectedRecurringIncomes > 0 ? (
            <DetailLine label="Recorrentes" value={month.expectedRecurringIncomes} />
          ) : month.plannedIncome > 0 ? (
            <DetailLine label="Planejadas" value={month.plannedIncome} />
          ) : null}
          {month.actualOneTimeIncome > 0 ? <DetailLine label="Avulsas" value={month.actualOneTimeIncome} /> : null}
          {month.futureExpectedIncomes > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedIncomes} />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.fixedExpensesUsed)}</p>
          <SourceBadge source={month.fixedExpenseSource} />
          {month.actualFixedExpenses > 0 ? (
            <DetailLine label="Realizados" value={month.actualFixedExpenses} />
          ) : (
            <DetailLine label="Planejados" value={month.plannedFixedExpenses} />
          )}
          {month.futureExpectedFixedExpenses > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedFixedExpenses} />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.plannedVariableExpenses)}</p>
          {month.futureExpectedVariableExpenses > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedVariableExpenses} />
          ) : null}
          {!month.isClosed ? (
            <DetailLine
              label="Usado na previsão"
              value={Math.max(month.plannedVariableExpenses, month.actualVariableExpenses)}
            />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.actualVariableExpenses)}</p>
          <p className="text-xs text-muted-foreground">Realizado</p>
        </div>
      </TableCell>
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
        <div className="space-y-1">
          <p>{formatBRL(month.monthlyResult)}</p>
          <p className="text-xs text-muted-foreground">Entradas previstas - saídas previstas</p>
        </div>
      </TableCell>
      <TableCell className={`font-medium ${partialResultClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.partialMonthlyResult)}</p>
          {isPartialEqual ? (
            <p className="text-xs text-muted-foreground">Igual ao previsto</p>
          ) : null}
          <p className="text-xs text-muted-foreground">Entradas realizadas - saídas realizadas</p>
        </div>
      </TableCell>
      <TableCell className={`font-semibold ${projectedClosingClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.closingBalance)}</p>
          <p className="text-xs text-muted-foreground">Saldo inicial + resultado previsto</p>
        </div>
      </TableCell>
      <TableCell className={`font-medium ${partialClosingClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.partialClosingBalance)}</p>
          {isPartialEqual ? (
            <p className="text-xs text-muted-foreground">Igual ao previsto</p>
          ) : !month.hasActualVariableExpenses ? (
            <p className="text-xs text-muted-foreground">Somente realizado</p>
          ) : null}
          <p className="text-xs text-muted-foreground">Saldo inicial + resultado realizado</p>
        </div>
      </TableCell>
      <TableCell>
        <MonthClosingActions
          periodMonth={month.periodMonth}
          isClosed={month.isClosed}
          canClose={canClose}
          closeAction={closeMonthAction}
          reopenAction={reopenMonthAction}
        />
      </TableCell>
    </TableRow>
  );
}
