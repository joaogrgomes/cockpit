import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { getPaymentMethodLabel } from "@/lib/expenses";
import { getPaymentAgenda } from "@/lib/services/payment-agenda.service";
import {
  getPaymentAgendaDateBadgeLabel,
  getPaymentAgendaSourceActionLabel,
  getPaymentAgendaSourceLabel,
  getPaymentAgendaStatusBadgeVariant,
  getPaymentAgendaStatusLabel,
} from "@/lib/payment-agenda";

export const dynamic = "force-dynamic";

function renderAgendaItem(item: Awaited<ReturnType<typeof getPaymentAgenda>>["items"][number], referenceDate: string) {
  const dueBadgeLabel = getPaymentAgendaDateBadgeLabel(item.dueDate, referenceDate);
  const overdue = item.dueDate < referenceDate;
  const actionLabel = getPaymentAgendaSourceActionLabel(item.sourceType);

  return (
    <div key={`${item.sourceType}-${item.id}`} className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-sm text-muted-foreground">
            {getPaymentAgendaSourceLabel(item.sourceType)} • {item.category}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold tracking-tight">{formatBRL(item.amountCents)}</p>
          <p className="text-sm text-muted-foreground">{formatDateOnlyBR(item.dueDate)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={getPaymentAgendaStatusBadgeVariant(item.sourceType, item.status)}>
          {getPaymentAgendaStatusLabel(item.sourceType, item.status)}
        </Badge>
        <Badge variant={overdue ? "destructive" : "outline"}>{dueBadgeLabel}</Badge>
        {item.paymentMethod ? (
          <Badge variant="outline">{getPaymentMethodLabel(item.paymentMethod)}</Badge>
        ) : null}
      </div>

      {item.notes ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.notes}</p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Link
          href={item.href}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

export default async function PaymentAgendaPage() {
  const agenda = await getPaymentAgenda();
  const buckets = Object.values(agenda.buckets);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Agenda de Pagamentos"
        description="Veja os compromissos financeiros por vencimento para reduzir dependência de lembretes externos."
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visão geral</CardTitle>
          <CardDescription>
            Consolida gastos futuros previstos, propostas de dívida ativas e compromissos de
            pagamento já conhecidos no Cockpit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{agenda.totalCount} itens na agenda</Badge>
            <Badge variant="secondary">{formatBRL(agenda.totalAmountCents)} agendados</Badge>
            <Badge variant="outline">{agenda.buckets.today.count} hoje</Badge>
            <Badge variant="outline">{agenda.buckets.tomorrow.count} amanhã</Badge>
            <Badge variant="outline">{agenda.buckets.week.count} nesta semana</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {agenda.totalCount > 0
              ? "Use os cartões por período para abrir a origem, revisar um gasto futuro ou conferir uma proposta de dívida antes do vencimento."
              : "Não há compromissos financeiros previstos para os períodos monitorados."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {buckets.map((bucket) => {
          return (
            <Card key={bucket.key} className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{bucket.label}</CardTitle>
                    <CardDescription>{bucket.description}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">{bucket.count} itens</Badge>
                    <Badge variant="secondary">{formatBRL(bucket.totalAmountCents)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bucket.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum compromisso para este período.
                    </p>
                  </div>
                ) : (
                  bucket.items.map((item) => renderAgendaItem(item, agenda.referenceDate))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
