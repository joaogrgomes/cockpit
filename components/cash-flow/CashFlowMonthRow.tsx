"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { canClosePeriodMonth } from "@/lib/cash-flow";
import type { CashFlowMonth, CashFlowSource } from "@/lib/cash-flow";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { MonthClosingActions } from "./MonthClosingActions";

type CashFlowMonthRowProps = {
  month: CashFlowMonth;
  currentPeriodMonth: string;
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
  currentPeriodMonth,
  closeMonthAction,
  reopenMonthAction,
}: CashFlowMonthRowProps) {
  const isCurrentMonth = month.periodMonth === currentPeriodMonth;
  const isClosedPastMonth = month.isClosed && month.periodMonth < currentPeriodMonth;
  const canToggle = isClosedPastMonth;
  const defaultExpanded = !isClosedPastMonth;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (month.isBeforeStart) {
    return (
      <TableRow className="border-border/70 bg-muted/20">
        <TableCell className="font-medium">{month.monthLabel}</TableCell>
        <TableCell colSpan={12} className="text-sm text-muted-foreground">
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
  const canClose = canClosePeriodMonth(month.periodMonth, currentPeriodMonth);
  const isPartialEqual =
    month.partialMonthlyResult === month.monthlyResult &&
    month.partialClosingBalance === month.closingBalance;
  const incomeStatusLabel = month.isClosed ? "Realizado" : "Previsto";
  const shouldShowDetails = isExpanded || !isClosedPastMonth;
  const rowClassName = cn("border-border/70 transition-colors", {
    "bg-primary/5 ring-1 ring-primary/15": isCurrentMonth,
    "bg-muted/35 text-muted-foreground": isClosedPastMonth && !isExpanded,
    "bg-muted/20": isClosedPastMonth && isExpanded,
    "bg-destructive/5": !isClosedPastMonth && month.closingBalance < 0 && !isCurrentMonth,
    "hover:bg-muted/25": !isClosedPastMonth && !isCurrentMonth,
  });

  return (
    <TableRow className={rowClassName}>
      <TableCell className="font-medium align-top">
        <div className="flex flex-wrap items-center gap-2">
          <span>{month.monthLabel}</span>
          {isCurrentMonth ? (
            <Badge className="bg-primary/10 text-primary dark:bg-primary/15">Mês atual</Badge>
          ) : null}
          {month.isClosed ? (
            <Badge className="bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900">
              Fechado
            </Badge>
          ) : null}
          {canToggle ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-8 shrink-0"
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? `Recolher mês ${month.monthLabel}` : `Expandir mês ${month.monthLabel}`
              }
              onClick={() => setIsExpanded((value) => !value)}
            >
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform",
                  isExpanded ? "rotate-180" : "rotate-0"
                )}
              />
            </Button>
          ) : (
            <span aria-hidden="true" className="ml-auto size-8 shrink-0" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.openingBalance)}</p>
          {shouldShowDetails && month.partialOpeningBalance !== month.openingBalance ? (
            <p className="text-xs text-muted-foreground">
              Realizado: {formatBRL(month.partialOpeningBalance)}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.incomeUsed)}</p>
          {shouldShowDetails ? (
            <Badge
              variant="outline"
              className={
                month.isClosed
                  ? "border-emerald-300 text-emerald-800"
                  : "border-border/80 text-muted-foreground"
              }
            >
              {incomeStatusLabel}
            </Badge>
          ) : null}
          {shouldShowDetails ? (
            month.expectedRecurringIncomes > 0 ? (
              <DetailLine label="Recorrentes" value={month.expectedRecurringIncomes} />
            ) : month.plannedIncome > 0 ? (
              <DetailLine label="Planejadas" value={month.plannedIncome} />
            ) : null
          ) : null}
          {shouldShowDetails && month.actualOneTimeIncome > 0 ? (
            <DetailLine label="Avulsas" value={month.actualOneTimeIncome} />
          ) : null}
          {shouldShowDetails && month.futureExpectedIncomes > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedIncomes} />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.actualIncome)}</p>
          {shouldShowDetails ? (
            <p className="text-xs text-muted-foreground">Entradas efetivamente realizadas</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.fixedExpensesUsed)}</p>
          {shouldShowDetails ? <SourceBadge source={month.fixedExpenseSource} /> : null}
          {shouldShowDetails ? (
            <DetailLine label="Planejados" value={month.plannedFixedExpenses} />
          ) : null}
          {shouldShowDetails && month.actualFixedExpenses > 0 ? (
            <DetailLine label="Realizados" value={month.actualFixedExpenses} />
          ) : null}
          {shouldShowDetails && !month.isClosed ? (
            <DetailLine
              label="Usado na previsão"
              value={Math.max(month.plannedFixedExpenses, month.actualFixedExpenses)}
            />
          ) : null}
          {shouldShowDetails && month.futureExpectedFixedExpenses > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedFixedExpenses} />
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{formatBRL(month.plannedVariableExpenses)}</p>
          {shouldShowDetails && month.futureExpectedVariableExpenses > 0 && !month.isClosed ? (
            <DetailLine label="Futuras" value={month.futureExpectedVariableExpenses} />
          ) : null}
          {shouldShowDetails && !month.isClosed ? (
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
          {shouldShowDetails ? <p className="text-xs text-muted-foreground">Realizado</p> : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p className={`font-medium ${remainingVariableClassName}`}>
            {formatBRL(month.remainingVariableBudget)}
          </p>
          {shouldShowDetails && month.variableBudgetStatus === "estourado" ? (
            <Badge variant="destructive">Estourado</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={`font-medium ${projectedResultClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.monthlyResult)}</p>
          {shouldShowDetails ? (
            <p className="text-xs text-muted-foreground">Entradas previstas - saídas previstas</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={`font-medium ${partialResultClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.partialMonthlyResult)}</p>
          {shouldShowDetails && isPartialEqual ? (
            <p className="text-xs text-muted-foreground">Igual ao previsto</p>
          ) : null}
          {shouldShowDetails ? (
            <p className="text-xs text-muted-foreground">Entradas realizadas - saídas realizadas</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={`font-semibold ${projectedClosingClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.closingBalance)}</p>
          {shouldShowDetails ? (
            <p className="text-xs text-muted-foreground">Saldo inicial + resultado previsto</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className={`font-medium ${partialClosingClassName}`}>
        <div className="space-y-1">
          <p>{formatBRL(month.partialClosingBalance)}</p>
          {shouldShowDetails && isPartialEqual ? (
            <p className="text-xs text-muted-foreground">Igual ao previsto</p>
          ) : shouldShowDetails && !month.hasActualVariableExpenses ? (
            <p className="text-xs text-muted-foreground">Somente realizado</p>
          ) : null}
          {shouldShowDetails ? (
            <p className="text-xs text-muted-foreground">Saldo inicial + resultado realizado</p>
          ) : null}
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
