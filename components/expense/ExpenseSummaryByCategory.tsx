import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculations";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import type { MonthlyExpenseSummaryRow } from "@/lib/services/monthly-expense.service";

type ExpenseSummaryByCategoryProps = {
  rows: MonthlyExpenseSummaryRow[];
  totalFixed: number;
  totalVariable: number;
  totalMonthlyActive: number;
};

export function ExpenseSummaryByCategory({
  rows,
  totalFixed,
  totalVariable,
  totalMonthlyActive,
}: ExpenseSummaryByCategoryProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo por categoria</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Fixo</TableHead>
                <TableHead>Variável</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Sem gastos ativos para agrupar.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">{getExpenseCategoryLabel(row.category)}</TableCell>
                    <TableCell>{formatBRL(row.fixed)}</TableCell>
                    <TableCell>{formatBRL(row.variable)}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(row.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <tfoot>
              <TableRow className="border-t border-border/80">
                <TableCell className="font-semibold">Total geral</TableCell>
                <TableCell className="font-semibold">{formatBRL(totalFixed)}</TableCell>
                <TableCell className="font-semibold">{formatBRL(totalVariable)}</TableCell>
                <TableCell className="font-semibold">{formatBRL(totalMonthlyActive)}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
