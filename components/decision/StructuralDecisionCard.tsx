import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/debt/PriorityBadge";
import { StatusBadge } from "@/components/debt/StatusBadge";
import { DebtTypeBadge } from "@/components/debt/DebtTypeBadge";
import { formatBRL } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { getDaysUntilExpiry } from "@/lib/services/proposal.service";
import type { StructuralDecisionItem } from "@/lib/services/decision.service";
import type { DebtStatus } from "@/types";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";

type StructuralDecisionCardProps = {
  debt: StructuralDecisionItem;
};

function toDebtStatus(value: string): DebtStatus {
  if (DEBT_STATUS_VALUES.includes(value as DebtStatus)) {
    return value as DebtStatus;
  }

  return "em_aberto";
}

export function StructuralDecisionCard({ debt }: StructuralDecisionCardProps) {
  const daysUntilExpiry = debt.activeProposal?.expiresAt
    ? getDaysUntilExpiry(debt.activeProposal.expiresAt)
    : null;

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
          <DebtTypeBadge debtType={debt.debtType} />
          {debt.perceivedRisk ? (
            <Badge variant="outline" className="h-6 rounded-md px-2.5 text-[11px] font-semibold">
              Risco: {debt.perceivedRisk}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Saldo devedor:</span>{" "}
            {formatBRL(debt.currentValue)}
          </p>
          <p>
            <span className="text-muted-foreground">Parcela atual:</span>{" "}
            {typeof debt.monthlyPayment === "number" ? formatBRL(debt.monthlyPayment) : "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <StatusBadge status={toDebtStatus(debt.status)} />
          </p>
          <p>
            <span className="text-muted-foreground">Proposta ativa:</span>{" "}
            {debt.activeProposal ? formatBRL(debt.activeProposal.proposedValue) : "Nenhuma"}
          </p>
          {debt.activeProposal ? (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Vencimento da proposta:</span>{" "}
              {typeof daysUntilExpiry === "number"
                ? daysUntilExpiry >= 0
                  ? `em ${daysUntilExpiry} dia(s)`
                  : `vencida há ${Math.abs(daysUntilExpiry)} dia(s)`
                : debt.activeProposal.expiresAt
                  ? String(debt.activeProposal.expiresAt)
                  : "-"}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Estas dívidas têm alto impacto e devem ser analisadas por parcela, prazo e estratégia de
          renegociação.
        </div>

        {debt.notes ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Observações</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{debt.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
