import Link from "next/link";
import { notFound } from "next/navigation";
import { DebtForm } from "@/components/debt/DebtForm";
import { PriorityBadge } from "@/components/debt/PriorityBadge";
import { StatusBadge } from "@/components/debt/StatusBadge";
import { ProposalCard } from "@/components/proposal/ProposalCard";
import { ProposalForm } from "@/components/proposal/ProposalForm";
import { ProposalHistory } from "@/components/proposal/ProposalHistory";
import { ValueHistory } from "@/components/value-update/ValueHistory";
import { ValueUpdateForm } from "@/components/value-update/ValueUpdateForm";
import { buttonVariants } from "@/components/ui/button";
import {
  calcAdditions,
  calcGrowthPct,
  calcRemainingInstallments,
  formatBRL,
} from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { getDebtById } from "@/lib/services/debt.service";
import {
  getActiveProposalByDebtId,
  listProposalsByDebtId,
  mapProposalToViewModel,
} from "@/lib/services/proposal.service";
import {
  listValueUpdatesByDebtId,
  mapValueUpdatesToHistory,
} from "@/lib/services/value-update.service";
import { cn } from "@/lib/utils";
import type { DebtStatus } from "@/types";
import {
  createProposalAction,
  createValueUpdateAction,
  updateDebtAction,
} from "../actions";

type DebtDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toStatus(value: string): DebtStatus {
  if (DEBT_STATUS_VALUES.includes(value as DebtStatus)) {
    return value as DebtStatus;
  }
  return "em_aberto";
}

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { id } = await params;
  const [debt, activeProposal, proposalHistory, valueUpdates] = await Promise.all([
    getDebtById(id),
    getActiveProposalByDebtId(id),
    listProposalsByDebtId(id),
    listValueUpdatesByDebtId(id),
  ]);

  if (!debt) {
    notFound();
  }

  const additions =
    typeof debt.originalValue === "number"
      ? calcAdditions(debt.currentValue, debt.originalValue)
      : null;
  const growthPct =
    typeof debt.originalValue === "number"
      ? calcGrowthPct(debt.currentValue, debt.originalValue)
      : null;
  const remainingInstallments =
    typeof debt.totalInstallments === "number" &&
    typeof debt.paidInstallments === "number"
      ? calcRemainingInstallments(debt.totalInstallments, debt.paidInstallments)
      : null;
  const activeProposalView = activeProposal
    ? mapProposalToViewModel(activeProposal, debt.currentValue)
    : null;
  const proposalHistoryView = proposalHistory.map((proposal) =>
    mapProposalToViewModel(proposal, debt.currentValue)
  );
  const valueHistoryView = mapValueUpdatesToHistory(valueUpdates);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{debt.name}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={toStatus(debt.status)} />
            <PriorityBadge priority={debt.priority} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/debts"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
          >
            Voltar
          </Link>
          <ValueUpdateForm debtId={debt.id} action={createValueUpdateAction} />
          <ProposalForm debtId={debt.id} action={createProposalAction} />
          <DebtForm mode="edit" debt={debt} action={updateDebtAction} />
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Credor</p>
          <p className="font-medium">{debt.creditor}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tipo</p>
          <p className="font-medium">{debt.type}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor atual</p>
          <p className="font-medium">{formatBRL(debt.currentValue)}</p>
        </div>
        {typeof debt.originalValue === "number" ? (
          <div>
            <p className="text-sm text-muted-foreground">Valor original</p>
            <p className="font-medium">{formatBRL(debt.originalValue)}</p>
          </div>
        ) : null}
        {typeof debt.monthlyPayment === "number" ? (
          <div>
            <p className="text-sm text-muted-foreground">Parcela mensal</p>
            <p className="font-medium">{formatBRL(debt.monthlyPayment)}</p>
          </div>
        ) : null}
        {debt.dueDate || debt.dueDay ? (
          <div>
            <p className="text-sm text-muted-foreground">Vencimento</p>
            <p className="font-medium">
              {debt.dueDate ? formatDate(debt.dueDate) : `Dia ${debt.dueDay}`}
            </p>
          </div>
        ) : null}
        {debt.priority ? (
          <div>
            <p className="text-sm text-muted-foreground">Prioridade</p>
            <p className="font-medium">{debt.priority}</p>
          </div>
        ) : null}
        {debt.perceivedRisk ? (
          <div>
            <p className="text-sm text-muted-foreground">Risco percebido</p>
            <p className="font-medium">{debt.perceivedRisk}</p>
          </div>
        ) : null}
      </div>

      {typeof debt.originalValue === "number" || remainingInstallments !== null ? (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-base font-semibold">Cálculos automáticos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {typeof debt.originalValue === "number" ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Original → atual</p>
                  <p className="font-medium">
                    {formatBRL(debt.originalValue)} → {formatBRL(debt.currentValue)}
                  </p>
                </div>
                {typeof additions === "number" ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Acréscimos</p>
                    <p className="font-medium">{`${additions >= 0 ? "+" : ""}${formatBRL(additions)}`}</p>
                  </div>
                ) : null}
                {typeof growthPct === "number" ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Crescimento</p>
                    <p className="font-medium">{`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`}</p>
                  </div>
                ) : null}
              </>
            ) : null}

            {remainingInstallments !== null ? (
              <div>
                <p className="text-sm text-muted-foreground">Parcelas restantes</p>
                <p className="font-medium">{remainingInstallments}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeProposalView ? <ProposalCard proposal={activeProposalView} /> : null}

      <ProposalHistory proposals={proposalHistoryView} />
      <ValueHistory updates={valueHistoryView} />

      {debt.notes ? (
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap">{debt.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
