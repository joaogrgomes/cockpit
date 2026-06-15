"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { DEBT_ACTIVE_STATUS_VALUES } from "@/lib/debt-status";
import { DEBT_TYPE_OPTIONS } from "@/lib/debt-type";
import {
  calculateDebtSelectionSummary,
  filterDebtSelectionItems,
  removeCreditorFromFilters,
  setCreditorFilterMode,
  sortDebtSelectionItems,
  type DebtSelectionFilters,
  type DebtSelectionItem,
} from "@/lib/debt-selection";
import { cn } from "@/lib/utils";
import type { DebtStatus, DebtType } from "@/types";
import { DebtRow } from "./DebtRow";

const DEFAULT_STATUS_SELECTION = [...DEBT_ACTIVE_STATUS_VALUES] as DebtStatus[];
const DEFAULT_TYPE_SELECTION = DEBT_TYPE_OPTIONS.map((option) => option.value as DebtType);
const PROPOSAL_OPTIONS: Array<{
  value: DebtSelectionFilters["proposalAvailability"];
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "with", label: "Só com proposta" },
  { value: "without", label: "Só sem proposta" },
];

const STATUS_LABELS: Record<DebtStatus, string> = {
  em_aberto: "Em aberto",
  em_atraso: "Em atraso",
  em_negociacao: "Em negociação",
  parcelada: "Parcelada",
  quitada: "Quitada",
  aguardando_baixa: "Aguardando baixa",
  baixada: "Baixada",
  arquivada: "Arquivada",
  suspensa: "Suspensa",
};

function toggleSelectionValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
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

function RemovableChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="outline"
      className="flex h-8 items-center gap-1 rounded-full border-border/80 px-3 py-1 text-xs font-medium"
    >
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Remover filtro ${label}`}
        className="ml-1 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

type DebtSelectionExplorerProps = {
  debts: DebtSelectionItem[];
  updateAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  deleteAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

export function DebtSelectionExplorer({
  debts,
  updateAction,
  deleteAction,
}: DebtSelectionExplorerProps) {
  const [searchText, setSearchText] = useState("");
  const [includedCreditors, setIncludedCreditors] = useState<string[]>([]);
  const [excludedCreditors, setExcludedCreditors] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<DebtType[]>(DEFAULT_TYPE_SELECTION);
  const [selectedStatuses, setSelectedStatuses] = useState<DebtStatus[]>(DEFAULT_STATUS_SELECTION);
  const [proposalAvailability, setProposalAvailability] =
    useState<DebtSelectionFilters["proposalAvailability"]>("all");
  const [sort, setSort] = useState<DebtSelectionFilters["sort"]>("current_desc");
  const [creditorToAdd, setCreditorToAdd] = useState("");

  const creditorOptions = useMemo(
    () =>
      Array.from(new Set(debts.map((debt) => debt.creditor)))
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [debts]
  );

  const filters = useMemo<DebtSelectionFilters>(
    () => ({
      searchText,
      includedCreditors,
      excludedCreditors,
      debtTypes: selectedTypes,
      statuses: selectedStatuses,
      proposalAvailability,
      sort,
    }),
    [excludedCreditors, includedCreditors, proposalAvailability, searchText, selectedStatuses, selectedTypes, sort]
  );

  const filteredDebts = useMemo(() => {
    const matched = filterDebtSelectionItems(debts, filters);
    return sortDebtSelectionItems(matched, sort);
  }, [debts, filters, sort]);

  const summary = useMemo(() => calculateDebtSelectionSummary(filteredDebts), [filteredDebts]);

  function resetFilters() {
    setSearchText("");
    setIncludedCreditors([]);
    setExcludedCreditors([]);
    setSelectedTypes(DEFAULT_TYPE_SELECTION);
    setSelectedStatuses(DEFAULT_STATUS_SELECTION);
    setProposalAvailability("all");
    setSort("current_desc");
    setCreditorToAdd("");
  }

  function handleAddCreditor(mode: "include" | "exclude") {
    if (!creditorToAdd) return;

    const updated = setCreditorFilterMode(
      { includedCreditors, excludedCreditors },
      creditorToAdd,
      mode
    );

    setIncludedCreditors(updated.includedCreditors);
    setExcludedCreditors(updated.excludedCreditors);
    setCreditorToAdd("");
  }

  function handleRemoveCreditor(creditor: string) {
    const updated = removeCreditorFromFilters({ includedCreditors, excludedCreditors }, creditor);
    setIncludedCreditors(updated.includedCreditors);
    setExcludedCreditors(updated.excludedCreditors);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros dinâmicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div className="space-y-2">
              <Label htmlFor="debt-search">Buscar por nome ou credor</Label>
              <Input
                id="debt-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Ex.: Itaú, Santander, cartão..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debt-sort">Ordenação</Label>
              <Select value={sort} onValueChange={(value) => setSort(value as DebtSelectionFilters["sort"])}>
                <SelectTrigger id="debt-sort" className="w-full">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_desc">Maior valor atual</SelectItem>
                  <SelectItem value="current_asc">Menor valor atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-56 flex-1 space-y-2">
                <Label htmlFor="creditor-picker">Credor</Label>
                <Select value={creditorToAdd} onValueChange={(value) => setCreditorToAdd(value ?? "")}>
                  <SelectTrigger id="creditor-picker" className="w-full">
                    <SelectValue placeholder="Selecionar credor" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditorOptions.map((creditor) => (
                      <SelectItem key={creditor} value={creditor}>
                        {creditor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-6">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={!creditorToAdd}
                  onClick={() => handleAddCreditor("include")}
                >
                  Incluir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!creditorToAdd}
                  onClick={() => handleAddCreditor("exclude")}
                >
                  Excluir
                </Button>
              </div>
            </div>

            {includedCreditors.length > 0 || excludedCreditors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {includedCreditors.map((creditor) => (
                  <RemovableChip
                    key={`include-${creditor}`}
                    label={`Incluir: ${creditor}`}
                    onRemove={() => handleRemoveCreditor(creditor)}
                  />
                ))}
                {excludedCreditors.map((creditor) => (
                  <RemovableChip
                    key={`exclude-${creditor}`}
                    label={`Excluir: ${creditor}`}
                    onRemove={() => handleRemoveCreditor(creditor)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Tipo de dívida</Label>
              <span className="text-xs text-muted-foreground">
                Clique em um chip para incluir ou remover
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEBT_TYPE_OPTIONS.map((option) => {
                const active = selectedTypes.includes(option.value as DebtType);
                return (
                  <FilterChipButton
                    key={option.value}
                    active={active}
                    onClick={() =>
                      setSelectedTypes((current) =>
                        toggleSelectionValue(current, option.value as DebtType)
                      )
                    }
                  >
                    {option.label}
                  </FilterChipButton>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Status</Label>
              <span className="text-xs text-muted-foreground">
                Padrão: dívidas abertas e ativas
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([value, label]) => {
                const active = selectedStatuses.includes(value as DebtStatus);
                return (
                  <FilterChipButton
                    key={value}
                    active={active}
                    onClick={() =>
                      setSelectedStatuses((current) =>
                        toggleSelectionValue(current, value as DebtStatus)
                      )
                    }
                  >
                    {label}
                  </FilterChipButton>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Proposta de quitação</Label>
              <span className="text-xs text-muted-foreground">
                Filtra pelo histórico de proposta disponível
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROPOSAL_OPTIONS.map((option) => (
                <FilterChipButton
                  key={option.value}
                  active={proposalAvailability === option.value}
                  onClick={() => setProposalAvailability(option.value)}
                >
                  {option.label}
                </FilterChipButton>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredDebts.length} de {debts.length} dívidas.
            </p>
            <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Dívidas filtradas" value={String(summary.filteredCount)} />
        <MetricCard title="Valor atual somado" value={formatBRL(summary.totalCurrentValueCents)} />
        <MetricCard
          title="Total quitação"
          value={formatBRL(summary.totalProposalValueCents)}
          description={
            summary.expiredProposalCount > 0
              ? `${summary.expiredProposalCount} proposta(s) vencida(s) entre as filtradas`
              : "Usa a melhor proposta disponível por dívida"
          }
        />
        <MetricCard
          title="Economia estimada"
          value={`${summary.estimatedSavingsCents >= 0 ? "+" : ""}${formatBRL(
            summary.estimatedSavingsCents
          )}`}
          description="Valor atual menos a proposta"
        />
        <MetricCard
          title="Sem proposta"
          value={String(summary.debtsWithoutProposalCount)}
          description="Não entram no total acima"
        />
      </div>

      {summary.debtsWithoutProposalCount > 0 ? (
        <Card className="border-amber-300/60 bg-amber-50/60 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {summary.debtsWithoutProposalCount} dívida(s) filtradas não têm proposta de quitação
              à vista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
              O total de quitação acima não inclui essas dívidas. Atualize as propostas para
              fechar o cenário com precisão.
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.debtsWithoutProposal.slice(0, 5).map((debt) => (
                <Badge key={debt.id} variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {debt.name} · {debt.creditor}
                </Badge>
              ))}
              {summary.debtsWithoutProposalCount > 5 ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  +{summary.debtsWithoutProposalCount - 5}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de dívidas</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Credor</TableHead>
                  <TableHead>Categoria operacional</TableHead>
                  <TableHead>Tipo da dívida</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor atual</TableHead>
                  <TableHead>Acréscimos</TableHead>
                  <TableHead>Crescimento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                      Nenhuma dívida encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => (
                    <DebtRow
                      key={debt.id}
                      debt={debt}
                      updateAction={updateAction}
                      deleteAction={deleteAction}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
