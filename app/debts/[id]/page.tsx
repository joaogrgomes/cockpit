import Link from "next/link";
import { notFound } from "next/navigation";
import { DebtForm } from "@/components/debt/DebtForm";
import { PriorityBadge } from "@/components/debt/PriorityBadge";
import { StatusBadge } from "@/components/debt/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { getDebtById } from "@/lib/services/debt.service";
import type { DebtStatus } from "@/types";
import { updateDebtAction } from "../actions";

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
  const debt = await getDebtById(id);

  if (!debt) {
    notFound();
  }

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
          <Button variant="outline" size="sm" render={<Link href="/debts" />}>
            Voltar
          </Button>
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

      {debt.notes ? (
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Observações</p>
          <p className="whitespace-pre-wrap">{debt.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
