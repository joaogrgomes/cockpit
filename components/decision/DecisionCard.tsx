import Link from "next/link";
import { PriorityBadge } from "@/components/debt/PriorityBadge";
import { StatusBadge } from "@/components/debt/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { DecisionItem, DecisionLabelKey } from "@/lib/decision-labels";
import type { DebtStatus } from "@/types";

type DecisionCardProps = {
  debt: DecisionItem;
};

function toDebtStatus(value: string): DebtStatus {
  if (DEBT_STATUS_VALUES.includes(value as DebtStatus)) {
    return value as DebtStatus;
  }

  return "em_aberto";
}

function labelVariant(key: DecisionLabelKey): "default" | "secondary" | "destructive" | "outline" {
  if (key === "proposta_vencendo" || key === "maior_risco") {
    return "destructive";
  }

  if (key === "melhor_oportunidade_quitacao" || key === "mais_barata_para_resolver") {
    return "default";
  }

  return "secondary";
}

export function DecisionCard({ debt }: DecisionCardProps) {
  const activeProposal = debt.activeProposal;
  const discountValue = activeProposal ? debt.currentValue - activeProposal.proposedValue : null;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg tracking-tight">{debt.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{debt.creditor}</p>
        </div>

        <Link
          href={`/debts/${debt.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
        >
          Ver detalhe
        </Link>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={toDebtStatus(debt.status)} />
          <PriorityBadge priority={debt.priority} />
          {debt.perceivedRisk ? (
            <Badge variant="outline" className="h-6 rounded-md px-2.5 text-[11px] font-semibold">
              Risco: {debt.perceivedRisk}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Valor atual:</span> {formatBRL(debt.currentValue)}
          </p>
          {typeof debt.growthPct === "number" ? (
            <p>
              <span className="text-muted-foreground">Crescimento:</span>{" "}
              {debt.growthPct.toFixed(1)}%
            </p>
          ) : null}
          {activeProposal ? (
            <>
              <p>
                <span className="text-muted-foreground">Proposta ativa:</span>{" "}
                {formatBRL(activeProposal.proposedValue)}
              </p>
              {typeof debt.discountPct === "number" ? (
                <p>
                  <span className="text-muted-foreground">Desconto:</span>{" "}
                  {debt.discountPct.toFixed(1)}%
                  {typeof discountValue === "number" ? ` (${formatBRL(discountValue)})` : ""}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="grid gap-2">
          {debt.labels.map((label) => (
            <div key={`${debt.id}-${label.key}`} className="flex flex-col gap-1">
              <div>
                <Badge
                  variant={labelVariant(label.key)}
                  className="h-6 rounded-md px-2.5 text-[11px] font-semibold"
                >
                  {label.title}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{label.reason}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
