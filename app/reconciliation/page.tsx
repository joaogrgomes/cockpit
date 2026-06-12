import Link from "next/link";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, parseBRL } from "@/lib/calculations";
import { calculateDailyRunningBalances, getMonthDateRange } from "@/lib/daily-balance";
import { getLocalDateInputValue, formatDateOnlyBR } from "@/lib/date-utils";
import { getCurrentPeriodMonth } from "@/lib/cash-flow";
import { getReconciliationDifferenceMessage } from "@/lib/reconciliation";
import { getReconciliationSummary } from "@/lib/services/reconciliation.service";
import type { StatementItem } from "@/lib/statement";
import { SearchIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type ReconciliationPageProps = {
  searchParams?: Promise<{
    month?: string;
    cutoffDate?: string;
    bankBalance?: string;
  }>;
};

function normalizePeriodMonth(value: string | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  return getCurrentPeriodMonth();
}

function formatSignedBRL(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (value === 0) {
    return formatBRL(0);
  }

  return value > 0 ? `+${formatBRL(value)}` : formatBRL(value);
}

function getDifferenceTone(value: number | null): "default" | "secondary" | "destructive" {
  if (value === null || value === 0) {
    return "secondary";
  }

  return "destructive";
}

function getTypeLabel(type: "income" | "expense"): string {
  return type === "income" ? "Entrada" : "Gasto";
}

function getTypeBadgeVariant(type: "income" | "expense"): "default" | "secondary" {
  return type === "income" ? "default" : "secondary";
}

function getSuspectReasonTone(reason: string): "default" | "secondary" | "outline" {
  if (reason.includes("exata")) return "default";
  if (reason.includes("próximo")) return "secondary";
  return "outline";
}

export default async function ReconciliationPage({ searchParams }: ReconciliationPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedPeriodMonth = normalizePeriodMonth(params.month);
  const selectedCutoffDate = /^\d{4}-\d{2}-\d{2}$/.test(params.cutoffDate ?? "")
    ? (params.cutoffDate as string)
    : getLocalDateInputValue();
  const bankBalanceCents =
    typeof params.bankBalance === "string" && params.bankBalance.trim() !== ""
      ? parseBRL(params.bankBalance)
      : null;

  const reconciliation = await getReconciliationSummary({
    periodMonth: selectedPeriodMonth,
    cutoffDate: selectedCutoffDate,
    bankBalanceCents,
  });
  const reconciliationDailyItems: StatementItem[] = reconciliation.items.map((item) => ({
    id: item.id,
    kind: item.type,
    source:
      item.originType === "monthly_income_entry_linked" ||
      item.originType === "monthly_expense_entry_linked"
        ? "linked"
        : "one_time",
    date: item.date,
    periodMonth: item.periodMonth,
    description: item.title,
    category: item.category,
    categoryLabel: item.categoryLabel,
    amount: item.amountCents,
    signedAmount: item.type === "income" ? item.amountCents : -item.amountCents,
    paymentMethod: null,
    notes: item.notes ?? null,
    originId: item.id,
    originType:
      item.type === "income" ? "monthly_income_entry" : "monthly_expense_entry",
    createdAt: item.createdAt ?? null,
  }));
  const { startDate, endDate } = getMonthDateRange(reconciliation.periodMonth);
  const dailyBalances = calculateDailyRunningBalances({
    openingBalanceCents: reconciliation.openingBalanceCents,
    items: reconciliationDailyItems,
    startDate,
    endDate,
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Conciliação"
        description="Compare o saldo do banco com o saldo realizado do Cockpit e encontre sinais de divergência."
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parâmetros</CardTitle>
          <CardDescription>
            A conciliação usa o saldo inicial do fluxo de caixa e os lançamentos realizados do período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1 md:col-span-1">
              <label className="text-sm font-medium" htmlFor="bankBalance">
                Saldo real do banco
              </label>
              <Input
                id="bankBalance"
                name="bankBalance"
                type="text"
                inputMode="decimal"
                placeholder="11.035,00"
                defaultValue={params.bankBalance ?? ""}
              />
            </div>

            <div className="space-y-1 md:col-span-1">
              <label className="text-sm font-medium" htmlFor="month">
                Mês de referência
              </label>
              <Input id="month" name="month" type="month" defaultValue={selectedPeriodMonth} />
            </div>

            <div className="space-y-1 md:col-span-1">
              <label className="text-sm font-medium" htmlFor="cutoffDate">
                Data de corte
              </label>
              <Input
                id="cutoffDate"
                name="cutoffDate"
                type="date"
                defaultValue={selectedCutoffDate}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <SearchIcon className="size-4" />
                Confrontar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!params.bankBalance ? (
        <Card className="border-border/80 bg-muted/20 shadow-sm">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Informe o saldo real do banco acima para calcular a diferença em relação ao Cockpit.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="Saldo inicial usado"
          value={formatBRL(reconciliation.openingBalanceCents)}
          description={reconciliation.openingBalanceSourceLabel}
        />
        <MetricCard
          title="Entradas realizadas"
          value={formatBRL(reconciliation.realizedIncomeCents)}
          description={`Período ${reconciliation.periodMonth}`}
        />
        <MetricCard
          title="Gastos realizados"
          value={formatBRL(reconciliation.realizedExpenseCents)}
          description={`Corte em ${formatDateOnlyBR(selectedCutoffDate)}`}
        />
        <MetricCard
          title="Saldo Cockpit"
          value={formatBRL(reconciliation.cockpitBalanceCents)}
          description="Saldo calculado pelo Cockpit"
        />
        <MetricCard
          title="Saldo do banco"
          value={formatSignedBRL(reconciliation.bankBalanceCents)}
          description="Informe o saldo real"
        />
        <MetricCard
          title="Diferença"
          value={formatSignedBRL(reconciliation.differenceCents)}
          description={
            reconciliation.differenceCents === null
              ? "Preencha o banco para comparar"
              : reconciliation.differenceCents === 0
              ? "Bateu com o banco"
              : reconciliation.differenceCents > 0
              ? "Cockpit acima do banco"
              : "Cockpit abaixo do banco"
          }
        />
      </div>

      <Card
        className={`shadow-sm ${
          getDifferenceTone(reconciliation.differenceCents) === "secondary"
            ? "border-border/80"
            : "border-border/80"
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leitura da diferença</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Saldo final calculado = saldo inicial + entradas realizadas - gastos realizados.
          </p>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
            {getReconciliationDifferenceMessage(reconciliation.differenceCents)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conciliação diária</CardTitle>
          <CardDescription>
            Use esta visão para descobrir em qual dia o saldo começou a divergir do banco.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Resultado Cockpit</TableHead>
                  <TableHead>Saldo Cockpit</TableHead>
                  <TableHead>Saldo Banco</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyBalances.map((day) => (
                  <TableRow key={day.date} className="border-border/70 hover:bg-muted/20">
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateOnlyBR(day.date)}
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        day.dailyResultCents > 0
                          ? "text-emerald-600"
                          : day.dailyResultCents < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatSignedBRL(day.dailyResultCents)}
                    </TableCell>
                    <TableCell className="font-medium">{formatBRL(day.closingBalanceCents)}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Saldo diário calculado</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Lançamentos realizados do período</CardTitle>
              <CardDescription>
                Use esta lista para bater visualmente com o extrato do banco.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{reconciliation.items.length} itens</Badge>
              <Badge variant="secondary">{formatBRL(reconciliation.calculatedClosingBalanceCents)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliation.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum lançamento realizado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  reconciliation.items.map((item) => (
                    <TableRow key={`${item.originType}-${item.id}`} className="border-border/70 hover:bg-muted/20">
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateOnlyBR(item.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(item.type)}>{getTypeLabel(item.type)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.categoryLabel}</Badge>
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          item.type === "income" ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {item.type === "income"
                          ? formatBRL(item.amountCents)
                          : formatBRL(-item.amountCents)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.originLabel}
                      </TableCell>
                      <TableCell>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Abrir origem
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Possíveis causas da diferença</CardTitle>
          <CardDescription>
            Sinais automáticos simples para começar a investigação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reconciliation.suspects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              Nenhum suspeito óbvio encontrado com os critérios automáticos atuais.
            </div>
          ) : (
            reconciliation.suspects.map((suspect) => (
              <div
                key={`${suspect.originLabel}-${suspect.id}`}
                className="rounded-xl border border-border/70 bg-background p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{suspect.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateOnlyBR(suspect.date)} • {suspect.originLabel} • {suspect.categoryLabel}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold tracking-tight">
                      {formatBRL(suspect.amountCents)}
                    </p>
                    <Badge variant={getSuspectReasonTone(suspect.reason)}>{suspect.reason}</Badge>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {suspect.href ? (
                    <Link
                      href={suspect.href}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Abrir origem
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
