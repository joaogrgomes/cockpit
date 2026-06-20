"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import { formatPeriodMonthShort } from "@/lib/recurrence-period";
import {
  buildDebtSettlementSimulation,
  filterDebtSettlementSimulationDebts,
  getDebtSettlementSimulationCreditors,
  type DebtSettlementSimulationDebt,
} from "@/lib/debt-settlement-simulation";
import { cn } from "@/lib/utils";

type DebtSettlementSimulationClientProps = {
  debts: DebtSettlementSimulationDebt[];
};

function getOptionTitle(kind: "cash" | "installment", installments: number, monthlyInstallmentCents: number | null) {
  if (kind === "cash") {
    return "À vista";
  }

  return `${installments}x de ${formatBRL(monthlyInstallmentCents ?? 0)}`;
}

function getStatusLabel(status: "active" | "expired" | "accepted" | "rejected" | "archived") {
  switch (status) {
    case "active":
      return "Ativa";
    case "accepted":
      return "Aceita";
    case "expired":
      return "Expirada";
    case "rejected":
      return "Recusada";
    case "archived":
      return "Arquivada";
  }
}

function getStatusBadgeVariant(status: "active" | "expired" | "accepted" | "rejected" | "archived") {
  switch (status) {
    case "accepted":
      return "default";
    case "expired":
      return "outline";
    case "rejected":
      return "destructive";
    case "archived":
      return "secondary";
    case "active":
    default:
      return "secondary";
  }
}

function FilterChipButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn(
        "h-8 rounded-full px-3 text-xs font-medium",
        active ? "shadow-sm" : "border-border/80 bg-background"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function DebtSettlementSimulationClient({ debts }: DebtSettlementSimulationClientProps) {
  const [selectedOptionIdsByDebtId, setSelectedOptionIdsByDebtId] = useState<Record<string, string>>({});
  const [selectedCreditors, setSelectedCreditors] = useState<string[]>([]);

  const selectedOptionIds = useMemo(
    () => Object.values(selectedOptionIdsByDebtId),
    [selectedOptionIdsByDebtId]
  );

  const simulation = useMemo(
    () =>
      buildDebtSettlementSimulation({
        debts,
        selectedOptionIds,
      }),
    [debts, selectedOptionIds]
  );

  const acceptedDebtIds = useMemo(
    () =>
      new Set(
        debts.filter((debt) => debt.settlementOptions.some((option) => option.status === "accepted")).map((debt) => debt.id)
      ),
    [debts]
  );

  const creditorOptions = useMemo(() => getDebtSettlementSimulationCreditors(debts), [debts]);

  const selectableDebts = useMemo(
    () => debts.filter((debt) => !acceptedDebtIds.has(debt.id)),
    [acceptedDebtIds, debts]
  );

  const filteredSelectableDebts = useMemo(
    () => filterDebtSettlementSimulationDebts(selectableDebts, selectedCreditors),
    [selectableDebts, selectedCreditors]
  );

  function toggleOption(debtId: string, optionId: string) {
    if (acceptedDebtIds.has(debtId)) {
      return;
    }

    setSelectedOptionIdsByDebtId((current) => {
      if (current[debtId] === optionId) {
        const next = { ...current };
        delete next[debtId];
        return next;
      }

      return {
        ...current,
        [debtId]: optionId,
      };
    });
  }

  function removeSelection(debtId: string) {
    setSelectedOptionIdsByDebtId((current) => {
      if (!(debtId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[debtId];
      return next;
    });
  }

  function toggleCreditor(creditor: string) {
    setSelectedCreditors((current) =>
      current.includes(creditor) ? current.filter((item) => item !== creditor) : [...current, creditor]
    );
  }

  function resetCreditors() {
    setSelectedCreditors([]);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Compromissos assumidos" value={String(simulation.acceptedItems.length)} />
        <MetricCard
          title="Novas seleções"
          value={String(simulation.selectedItems.length)}
          description="Escolhas ainda abertas para simulação."
        />
        <MetricCard
          title="Desembolso imediato"
          value={formatBRL(simulation.immediateOutflowCents)}
          description="Saída necessária hoje para executar o cenário."
        />
        <MetricCard
          title="Total parcelado futuro"
          value={formatBRL(simulation.futureInstallmentsTotalCents)}
          description="Somente as parcelas mensais dos parcelamentos."
        />
        <MetricCard
          title="Total da operação"
          value={formatBRL(simulation.totalOperationCents)}
          description="Soma dos compromissos assumidos e escolhas novas."
        />
        <MetricCard
          title="Maior parcela mensal"
          value={formatBRL(simulation.maxMonthlyInstallmentCents)}
          description="Maior mês comprometido pelo cenário."
        />
        <MetricCard
          title="Meses comprometidos"
          value={String(simulation.committedMonthsCount)}
          description="Quantidade de meses com parcelas futuras."
        />
      </div>

      {simulation.acceptedItems.length === 0 && simulation.selectedItems.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/20 shadow-sm">
          <CardContent className="flex flex-col items-start gap-3 px-6 py-8">
            <p className="text-sm font-medium text-foreground">
              Selecione uma opção de liquidação para montar sua simulação.
            </p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Escolha no máximo uma opção por dívida. O simulador mostra quanto sai hoje, quanto
              fica comprometido nos próximos meses e o total do cenário.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {simulation.acceptedItems.length > 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compromissos assumidos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-2">
                {simulation.acceptedItems.map((item) => (
                  <div key={item.optionId} className="rounded-xl border border-emerald-300/70 bg-emerald-50/40 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{item.debtName}</h3>
                          <Badge variant="outline" className="rounded-full">
                            {item.creditor}
                          </Badge>
                          <Badge variant="default" className="rounded-full">
                            Já aceito
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Valor atual: {formatBRL(item.debtCurrentValueCents)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Opção</p>
                        <p className="font-medium text-foreground">{item.optionLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                        <p className="font-medium text-foreground">{formatBRL(item.totalAmountCents)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Entrada</p>
                        <p className="font-medium text-foreground">
                          {item.upfrontAmountCents > 0 ? formatBRL(item.upfrontAmountCents) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Parcela</p>
                        <p className="font-medium text-foreground">
                          {item.kind === "installment" && item.monthlyInstallmentCents
                            ? formatBRL(item.monthlyInstallmentCents)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Primeira parcela
                        </p>
                        <p className="font-medium text-foreground">
                          {item.firstDueDate ? formatDateOnlyBR(item.firstDueDate) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Validade</p>
                        <p className="font-medium text-foreground">
                          {item.validUntil ? formatDateOnlyBR(item.validUntil) : "—"}
                        </p>
                      </div>
                    </div>
                    {item.notes ? <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Novas decisões para simular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Filtrar por credor</p>
                    <p className="text-xs text-muted-foreground">
                      Clique para ligar/desligar os credores que quer ver nas novas decisões.
                    </p>
                  </div>
                  {selectedCreditors.length > 0 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={resetCreditors}>
                      Limpar filtros
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {creditorOptions.map((creditor) => {
                    const active = selectedCreditors.includes(creditor);
                    return (
                      <FilterChipButton key={creditor} active={active} onClick={() => toggleCreditor(creditor)}>
                        {creditor}
                      </FilterChipButton>
                    );
                  })}
                </div>

                {selectedCreditors.length > 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {selectedCreditors.length} credor(es) selecionado(s)
                  </p>
                ) : null}
              </div>

              {filteredSelectableDebts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 px-6 py-10 text-sm text-muted-foreground">
                  {selectedCreditors.length > 0
                    ? "Nenhuma nova decisão corresponde aos credores selecionados."
                    : "Não há novas decisões abertas neste momento."}
                </div>
              ) : (
                filteredSelectableDebts.map((debt) => {
                  const selectedOptionId = selectedOptionIdsByDebtId[debt.id];
                  const selectableOptions = debt.settlementOptions.filter(
                    (option) => option.status === "active" || option.status === "expired"
                  );

                  return (
                    <div key={debt.id} className="rounded-xl border border-border/80 bg-background p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{debt.name}</h3>
                            <Badge variant="outline" className="rounded-full">
                              {debt.creditor}
                            </Badge>
                            {debt.hasActiveProposal ? (
                              <Badge variant="secondary" className="rounded-full">
                                Proposta ativa
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Valor atual: {formatBRL(debt.currentValue)}
                          </p>
                        </div>
                        {selectedOptionId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelection(debt.id)}
                          >
                            Limpar seleção
                          </Button>
                        ) : null}
                      </div>

                      {selectableOptions.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Esta dívida não tem opções ativas selecionáveis.
                        </p>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {selectableOptions.map((option) => {
                            const isExpired = option.status === "expired";
                            const isSelected = selectedOptionId === option.id;

                            return (
                              <Button
                                key={option.id}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                disabled={isExpired}
                                onClick={() => toggleOption(debt.id, option.id)}
                                className={cn(
                                  "h-auto min-h-20 min-w-52 flex-col items-start justify-start gap-1 whitespace-normal px-4 py-3 text-left",
                                  isSelected ? "shadow-sm" : "border-border/80 bg-background"
                                )}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {getOptionTitle(option.kind, option.installments, option.monthlyInstallmentCents)}
                                  </span>
                                  <Badge variant={getStatusBadgeVariant(option.status)} className="rounded-full">
                                    {getStatusLabel(option.status)}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Total {formatBRL(option.totalAmountCents)}
                                </span>
                                {option.kind === "installment" ? (
                                  <span className="text-xs text-muted-foreground">
                                    Entrada {formatBRL(option.upfrontAmountCents)}
                                  </span>
                                ) : null}
                                {isExpired ? (
                                  <span className="text-xs text-muted-foreground">Opção vencida</span>
                                ) : null}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      {simulation.monthlySchedule.length > 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parcelas futuras</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Total de parcelas simuladas</TableHead>
                    <TableHead>Dívidas incluídas naquele mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulation.monthlySchedule.map((month) => (
                    <TableRow key={month.periodMonth}>
                      <TableCell className="align-top font-medium">
                        <div className="space-y-1">
                          <p>{formatPeriodMonthShort(month.periodMonth)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatBRL(month.totalAmountCents)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {month.items.length}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          {month.items.map((item) => (
                            <div key={`${month.periodMonth}:${item.optionId}:${item.installmentIndex}`} className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{item.debtName}</span>
                              <Badge variant={item.source === "accepted" ? "default" : "outline"} className="rounded-full">
                                {item.source === "accepted" ? "Já aceito" : "Simulado"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {item.optionLabel} • {formatBRL(item.amountCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Link href="/debts" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}>
          Voltar para dívidas
        </Link>
      </div>
    </div>
  );
}
