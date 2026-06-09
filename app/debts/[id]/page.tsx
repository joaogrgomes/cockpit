import Link from "next/link";
import { notFound } from "next/navigation";
import { DebtForm } from "@/components/debt/DebtForm";
import { DebtAttachmentsCard } from "@/components/debt/DebtAttachmentsCard";
import { DebtLifecycleActions } from "@/components/debt/DebtLifecycleActions";
import { PriorityBadge } from "@/components/debt/PriorityBadge";
import { StatusBadge } from "@/components/debt/StatusBadge";
import { PageHeader } from "@/components/layout/page-header";
import { ProposalCard } from "@/components/proposal/ProposalCard";
import { ProposalForm } from "@/components/proposal/ProposalForm";
import { ProposalHistory } from "@/components/proposal/ProposalHistory";
import { ValueChart } from "@/components/value-update/ValueChart";
import { ValueHistory } from "@/components/value-update/ValueHistory";
import { ValueUpdateForm } from "@/components/value-update/ValueUpdateForm";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calcAdditions,
  calcGrowthPct,
  calcRemainingInstallments,
  formatBRL,
} from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { isClosedDebtStatus } from "@/lib/debt-status";
import { listDebtAttachmentsByDebtId } from "@/lib/services/debt-attachment.service";
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
  archiveDebtAction,
  confirmDebtClearanceAction,
  createDebtAttachmentAction,
  createProposalAction,
  createValueUpdateAction,
  markDebtAsPaidAction,
  updateDebtAction,
} from "../actions";
import { getPaymentMethodLabel } from "@/lib/expenses";

type DebtDetailPageProps = {
  params: Promise<{ id: string }>;
};

function toStatus(value: string): DebtStatus {
  if (DEBT_STATUS_VALUES.includes(value as DebtStatus)) {
    return value as DebtStatus;
  }
  return "em_aberto";
}

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { id } = await params;
  const [debt, activeProposal, proposalHistory, valueUpdates, attachments] = await Promise.all([
    getDebtById(id),
    getActiveProposalByDebtId(id),
    listProposalsByDebtId(id),
    listValueUpdatesByDebtId(id),
    listDebtAttachmentsByDebtId(id),
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
  const suggestedPaidAmount =
    typeof activeProposalView?.proposedValue === "number"
      ? activeProposalView.proposedValue
      : debt.currentValue;
  const canNegotiate = !isClosedDebtStatus(debt.status);
  const canMarkAsPaid =
    debt.status === "em_aberto" ||
    debt.status === "em_atraso" ||
    debt.status === "em_negociacao" ||
    debt.status === "parcelada" ||
    debt.status === "suspensa";
  const canConfirmClearance = debt.status === "aguardando_baixa";
  const canArchive = debt.status === "baixada" || debt.status === "quitada";
  const hasLifecycleData =
    Boolean(debt.paidAt) ||
    typeof debt.paidAmount === "number" ||
    Boolean(debt.paymentMethod) ||
    Boolean(debt.clearanceDueDate) ||
    Boolean(debt.clearedAt) ||
    Boolean(debt.archivedAt) ||
    Boolean(debt.paymentNotes);

  return (
    <section className="space-y-6">
      <PageHeader
        title={debt.name}
        description="Acompanhe dados da dívida, propostas e evolução de valor em um só lugar."
        actions={
          <>
            <Link
              href="/debts"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
            >
              Voltar
            </Link>
            {canNegotiate ? <ValueUpdateForm debtId={debt.id} action={createValueUpdateAction} /> : null}
            {canNegotiate ? <ProposalForm debtId={debt.id} action={createProposalAction} /> : null}
            <DebtForm mode="edit" debt={debt} action={updateDebtAction} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={toStatus(debt.status)} />
        <PriorityBadge priority={debt.priority} />
      </div>

      {!canNegotiate ? (
        <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Esta dívida já está em pós-pagamento. Propostas e atualizações de valor ficam
          desativadas para preservar o histórico.
        </div>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados da dívida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
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
                  {debt.dueDate ? formatDateOnlyBR(debt.dueDate) : `Dia ${debt.dueDay}`}
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
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pós-pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Status atual</p>
              <div className="font-medium">
                <StatusBadge status={toStatus(debt.status)} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pago em</p>
              <p className="font-medium">{debt.paidAt ? formatDateOnlyBR(debt.paidAt) : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor pago</p>
              <p className="font-medium">
                {typeof debt.paidAmount === "number" ? formatBRL(debt.paidAmount) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Método de pagamento</p>
              <p className="font-medium">
                {debt.paymentMethod ? getPaymentMethodLabel(debt.paymentMethod) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Previsão de baixa</p>
              <p className="font-medium">
                {debt.clearanceDueDate ? formatDateOnlyBR(debt.clearanceDueDate) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Baixada em</p>
              <p className="font-medium">
                {debt.clearedAt ? formatDateOnlyBR(debt.clearedAt) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arquivada em</p>
              <p className="font-medium">
                {debt.archivedAt ? formatDateOnlyBR(debt.archivedAt) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Observação</p>
              <p className="font-medium">{debt.paymentNotes ?? "-"}</p>
            </div>
          </div>

          {!hasLifecycleData ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dado de pagamento ou baixa foi registrado ainda.
            </p>
          ) : null}

          <DebtLifecycleActions
            debt={debt}
            suggestedPaidAmount={suggestedPaidAmount}
            canMarkAsPaid={canMarkAsPaid}
            canConfirmClearance={canConfirmClearance}
            canArchive={canArchive}
            markDebtAsPaidAction={markDebtAsPaidAction}
            confirmDebtClearanceAction={confirmDebtClearanceAction}
            archiveDebtAction={archiveDebtAction}
          />
        </CardContent>
      </Card>

      {typeof debt.originalValue === "number" || remainingInstallments !== null ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cálculos automáticos</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ) : null}

      {activeProposalView ? <ProposalCard proposal={activeProposalView} /> : null}

      <ProposalHistory proposals={proposalHistoryView} />
      <ValueChart updates={valueUpdates} />
      <ValueHistory updates={valueHistoryView} />
      <DebtAttachmentsCard
        debtId={debt.id}
        attachments={attachments}
        action={createDebtAttachmentAction}
      />

      {debt.notes ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{debt.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
