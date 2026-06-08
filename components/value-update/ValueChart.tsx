"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import type { DebtValueUpdate } from "@/types";

type ValueChartProps = {
  updates: DebtValueUpdate[];
};

type ChartPoint = {
  id: string;
  dateLabel: string;
  recordedValue: number;
};

function toChartPoints(updates: DebtValueUpdate[]): ChartPoint[] {
  return updates.map((update) => ({
    id: update.id,
    dateLabel: formatDateOnlyBR(update.recordedAt),
    recordedValue: update.recordedValue,
  }));
}

export function ValueChart({ updates }: ValueChartProps) {
  if (updates.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Evolução do valor</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Sem histórico suficiente para exibir o gráfico.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (updates.length === 1) {
    const single = updates[0];

    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Evolução do valor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Apenas um registro disponível. Adicione novas atualizações para ver a linha de
            evolução.
          </p>
          <p className="text-sm">
            Último valor: <span className="font-medium">{formatBRL(single.recordedValue)}</span>
          </p>
          <p className="text-sm text-muted-foreground">Data: {formatDateOnlyBR(single.recordedAt)}</p>
        </CardContent>
      </Card>
    );
  }

  const data = toChartPoints(updates);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base">Evolução do valor</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-72 w-full rounded-lg bg-muted/20 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => formatBRL(Number(value))}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={84}
              />
              <Tooltip
                formatter={(value) => formatBRL(Number(value))}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="recordedValue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
