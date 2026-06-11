"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, parseBRL } from "@/lib/calculations";
import {
  calculateBudgetAreasAnalysis,
  type BudgetAreaExpenseItem,
  type BudgetAreaModel,
} from "@/lib/budget-areas";
import { BudgetAreaDetails } from "./BudgetAreaDetails";
import { BudgetAreaTable } from "./BudgetAreaTable";
import { BudgetAreasSummaryCards } from "./BudgetAreasSummaryCards";

type BudgetAreasClientProps = {
  referenceMonth: string;
  defaultBaseIncomeCents: number;
  expenseItems: BudgetAreaExpenseItem[];
  model: BudgetAreaModel;
};

export function BudgetAreasClient({
  referenceMonth,
  defaultBaseIncomeCents,
  expenseItems,
  model,
}: BudgetAreasClientProps) {
  const [baseIncomeText, setBaseIncomeText] = useState(formatBRL(defaultBaseIncomeCents));

  useEffect(() => {
    setBaseIncomeText(formatBRL(defaultBaseIncomeCents));
  }, [defaultBaseIncomeCents, referenceMonth]);

  const baseIncomeCents = useMemo(() => {
    const parsed = parseBRL(baseIncomeText);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [baseIncomeText]);

  const analysis = useMemo(
    () =>
      calculateBudgetAreasAnalysis({
        referenceMonth,
        baseIncomeCents,
        expenseItems,
        model,
      }),
    [baseIncomeCents, expenseItems, model, referenceMonth]
  );

  const handleResetBaseIncome = () => {
    setBaseIncomeText(formatBRL(defaultBaseIncomeCents));
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Simulação local</CardTitle>
              <CardDescription>
                Ajuste a renda base sem salvar dados. O mês de referência continua vindo do filtro
                acima.
              </CardDescription>
            </div>
            <Badge variant="outline">Modelo {analysis.model.name}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1 sm:max-w-xs">
              <Label htmlFor="budget-areas-base-income">Renda base</Label>
              <Input
                id="budget-areas-base-income"
                value={baseIncomeText}
                onChange={(event) => setBaseIncomeText(event.target.value)}
                onBlur={() => setBaseIncomeText(formatBRL(baseIncomeCents))}
                placeholder="R$ 0,00"
                inputMode="decimal"
              />
            </div>

            <Button type="button" variant="outline" onClick={handleResetBaseIncome}>
              Usar renda calculada
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Valor em reais. A simulação é local e não altera os dados salvos.
          </p>
        </CardContent>
      </Card>

      <BudgetAreasSummaryCards
        analysis={analysis}
        defaultBaseIncomeCents={defaultBaseIncomeCents}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tabela principal</CardTitle>
          <CardDescription>
            Compare a distribuição ideal da renda com o planejamento mensal vigente em{" "}
            {referenceMonth}.
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
