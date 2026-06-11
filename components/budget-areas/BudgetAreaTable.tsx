import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import type { BudgetAreaRow, BudgetAreaStatus } from "@/lib/budget-areas";

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : ""}${formatBRL(value)}`;
}

function formatPercent(value: number, digits = 1) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

function getStatusLabel(status: BudgetAreaStatus) {
  switch (status) {
    case "acima_do_ideal":
      return "Acima do ideal";
    case "nao_alocado":
      return "Não alocado";
    default:
      return "Dentro do ideal";
  }
}

function getStatusBadgeVariant(status: BudgetAreaStatus) {
  switch (status) {
    case "acima_do_ideal":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function BudgetAreaTable({ rows }: { rows: BudgetAreaRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Área</TableHead>
            <TableHead>% ideal</TableHead>
            <TableHead>Valor ideal</TableHead>
            <TableHead>Planejado atual</TableHead>
            <TableHead>% real da renda</TableHead>
            <TableHead>Diferença</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.areaKey}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{formatPercent(row.percentage, 0)}</TableCell>
              <TableCell>{formatBRL(row.idealAmountCents)}</TableCell>
              <TableCell>{formatBRL(row.actualPlannedAmountCents)}</TableCell>
              <TableCell>{formatPercent(row.percentageOfIncome, 1)}</TableCell>
              <TableCell
                className={
                  row.differenceCents > 0
                    ? "text-destructive"
                    : row.differenceCents < 0
                      ? "text-emerald-600"
                      : "text-muted-foreground"
                }
              >
                {formatSignedCurrency(row.differenceCents)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
