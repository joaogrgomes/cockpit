"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, parseBRL } from "@/lib/calculations";
import {
  buildBudgetAreaModelFromSettings,
  calculateBudgetAreasAnalysis,
  getDefaultBudgetAreaSettings,
  type BudgetAreaExpenseItem,
  type BudgetAreaSettingsInput,
} from "@/lib/budget-areas";
import { BudgetAreaDetails } from "./BudgetAreaDetails";
import { BudgetAreaTable } from "./BudgetAreaTable";
import { BudgetAreasSummaryCards } from "./BudgetAreasSummaryCards";

type BudgetAreasActionResult = {
  ok: boolean;
  error?: string;
};

type BudgetAreasClientProps = {
  referenceMonth: string;
  settings: BudgetAreaSettingsInput;
  calculatedBaseIncomeCents: number;
  expenseItems: BudgetAreaExpenseItem[];
  saveAction: (formData: FormData) => Promise<BudgetAreasActionResult>;
};

type BudgetAreasFormState = {
  baseIncomeText: string;
  needsPercent: string;
  debtPaymentPercent: string;
  emergencyReservePercent: string;
  flexiblePercent: string;
};

function createFormState(settings: BudgetAreaSettingsInput): BudgetAreasFormState {
  return {
    baseIncomeText: formatBRL(settings.baseIncomeCents),
    needsPercent: String(settings.needsPercent),
    debtPaymentPercent: String(settings.debtPaymentPercent),
    emergencyReservePercent: String(settings.emergencyReservePercent),
    flexiblePercent: String(settings.flexiblePercent),
  };
}

function parsePercent(value: string): number {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function moneyTextToCents(text: string): number {
  const parsed = parseBRL(text);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function formatPercent(value: number) {
  return `${value}%`;
}

export function BudgetAreasClient({
  referenceMonth,
  settings,
  calculatedBaseIncomeCents,
  expenseItems,
  saveAction,
}: BudgetAreasClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<BudgetAreasFormState>(() => createFormState(settings));
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFormState(createFormState(settings));
    setError(null);
    setFeedback(null);
  }, [
    settings.baseIncomeCents,
    settings.needsPercent,
    settings.debtPaymentPercent,
    settings.emergencyReservePercent,
    settings.flexiblePercent,
  ]);

  const currentSettings = useMemo<BudgetAreaSettingsInput>(
    () => ({
      baseIncomeCents: moneyTextToCents(formState.baseIncomeText),
      needsPercent: parsePercent(formState.needsPercent),
      debtPaymentPercent: parsePercent(formState.debtPaymentPercent),
      emergencyReservePercent: parsePercent(formState.emergencyReservePercent),
      flexiblePercent: parsePercent(formState.flexiblePercent),
    }),
    [formState]
  );

  const currentModel = useMemo(
    () => buildBudgetAreaModelFromSettings(currentSettings),
    [currentSettings]
  );

  const analysis = useMemo(
    () =>
      calculateBudgetAreasAnalysis({
        referenceMonth,
        baseIncomeCents: currentSettings.baseIncomeCents,
        expenseItems,
        model: currentModel,
      }),
    [currentModel, currentSettings.baseIncomeCents, expenseItems, referenceMonth]
  );

  const currentPercentTotal =
    currentSettings.needsPercent +
    currentSettings.debtPaymentPercent +
    currentSettings.emergencyReservePercent +
    currentSettings.flexiblePercent;

  const isPercentTotalValid = currentPercentTotal === 100;
  const isBaseIncomeValid = currentSettings.baseIncomeCents > 0;
  const isDirty =
    currentSettings.baseIncomeCents !== settings.baseIncomeCents ||
    currentSettings.needsPercent !== settings.needsPercent ||
    currentSettings.debtPaymentPercent !== settings.debtPaymentPercent ||
    currentSettings.emergencyReservePercent !== settings.emergencyReservePercent ||
    currentSettings.flexiblePercent !== settings.flexiblePercent;
  const canSave = isBaseIncomeValid && isPercentTotalValid && !isPending;

  const handleResetDefaults = () => {
    setFormState(createFormState(getDefaultBudgetAreaSettings()));
    setError(null);
    setFeedback(null);
  };

  const handleUseCalculatedIncome = () => {
    setFormState((current) => ({
      ...current,
      baseIncomeText: formatBRL(calculatedBaseIncomeCents),
    }));
    setError(null);
    setFeedback(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar a configuração.");
        return;
      }

      setFeedback("Configuração salva.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Configuração do planejamento por áreas</CardTitle>
              <CardDescription>
                Ajuste a renda base e os percentuais abaixo. O cálculo atualiza na hora, mas só é
                salvo quando você clicar em salvar.
              </CardDescription>
            </div>
            <Badge variant={isDirty ? "outline" : "default"}>
              {isDirty ? "Simulação local" : "Configuração salva"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="space-y-2 sm:max-w-sm">
                  <Label htmlFor="budget-areas-base-income">Renda base</Label>
                  <Input
                    id="budget-areas-base-income"
                    name="baseIncomeCents"
                    value={formState.baseIncomeText}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        baseIncomeText: event.target.value,
                      }))
                    }
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Base salva: {formatBRL(settings.baseIncomeCents)} • renda calculada do mês: {formatBRL(
                      calculatedBaseIncomeCents
                    )}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget-areas-needs-percent">Necessidades básicas</Label>
                    <Input
                      id="budget-areas-needs-percent"
                      name="needsPercent"
                      type="number"
                      min={0}
                      step={1}
                      value={formState.needsPercent}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          needsPercent: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-areas-debt-percent">Pagamento agressivo de dívidas</Label>
                    <Input
                      id="budget-areas-debt-percent"
                      name="debtPaymentPercent"
                      type="number"
                      min={0}
                      step={1}
                      value={formState.debtPaymentPercent}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          debtPaymentPercent: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-areas-emergency-percent">Reserva de emergência</Label>
                    <Input
                      id="budget-areas-emergency-percent"
                      name="emergencyReservePercent"
                      type="number"
                      min={0}
                      step={1}
                      value={formState.emergencyReservePercent}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          emergencyReservePercent: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-areas-flexible-percent">Lazer / flexível</Label>
                    <Input
                      id="budget-areas-flexible-percent"
                      name="flexiblePercent"
                      type="number"
                      min={0}
                      step={1}
                      value={formState.flexiblePercent}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          flexiblePercent: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleResetDefaults}>
                    Restaurar padrão 60/20/10/10
                  </Button>
                  <Button type="button" variant="outline" onClick={handleUseCalculatedIncome}>
                    Usar renda calculada do mês
                  </Button>
                  <Button type="submit" disabled={!canSave}>
                    {isPending ? "Salvando..." : "Salvar configuração"}
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <p className={isPercentTotalValid ? "text-muted-foreground" : "font-medium text-destructive"}>
                    Somatório dos percentuais: {formatPercent(currentPercentTotal)}
                  </p>
                  {!isBaseIncomeValid ? (
                    <p className="text-destructive">A renda base precisa ser maior que zero.</p>
                  ) : null}
                  {!isPercentTotalValid ? (
                    <p className="text-destructive">A soma dos percentuais precisa ser 100%.</p>
                  ) : null}
                  {error ? <p className="text-destructive">{error}</p> : null}
                  {feedback ? <p className="text-emerald-600">{feedback}</p> : null}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resumo rápido
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Base em uso</span>
                    <span className="font-medium">{formatBRL(analysis.baseIncomeCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Renda calculada</span>
                    <span className="font-medium">{formatBRL(calculatedBaseIncomeCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Percentual total</span>
                    <span className={isPercentTotalValid ? "font-medium" : "font-medium text-destructive"}>
                      {formatPercent(currentPercentTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Estado</span>
                    <span className={isDirty ? "font-medium text-amber-600" : "font-medium text-emerald-600"}>
                      {isDirty ? "Simulação local" : "Salvo"}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  A distribuição ideal, os totais e o detalhamento abaixo se recalculam em tempo real.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <BudgetAreasSummaryCards
        analysis={analysis}
        savedBaseIncomeCents={settings.baseIncomeCents}
        calculatedBaseIncomeCents={calculatedBaseIncomeCents}
        isDirty={isDirty}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tabela principal</CardTitle>
          <CardDescription>
            Compare a distribuição ideal da renda com o planejamento mensal vigente em {referenceMonth}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-4">
            <BudgetAreaTable rows={analysis.rows} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhamento por área</CardTitle>
          <CardDescription>
            Cada bloco mostra os itens de planejamento recorrente vigentes no mês selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetAreaDetails rows={analysis.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
