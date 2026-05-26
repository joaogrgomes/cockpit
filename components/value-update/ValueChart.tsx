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
import type { DebtValueUpdate } from "@/types";

type ValueChartProps = {
  updates: DebtValueUpdate[];
};

type ChartPoint = {
  id: string;
  dateLabel: string;
  recordedValue: number;
};

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toChartPoints(updates: DebtValueUpdate[]): ChartPoint[] {
  return updates.map((update) => ({
    id: update.id,
    dateLabel: formatDate(update.recordedAt),
    recordedValue: update.recordedValue,
  }));
}

export function ValueChart({ updates }: ValueChartProps) {
  if (updates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução do valor</CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Evolução do valor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Apenas um registro disponível. Adicione novas atualizações para ver a linha de evolução.
          </p>
          <p className="text-sm">
            Último valor: <span className="font-medium">{formatBRL(single.recordedValue)}</span>
          </p>
          <p className="text-sm text-muted-foreground">Data: {formatDate(single.recordedAt)}</p>
        </CardContent>
      </Card>
    );
  }

  const data = toChartPoints(updates);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do valor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => formatBRL(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatBRL(Number(value))}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="recordedValue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
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
