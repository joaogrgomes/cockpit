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
import { getIncomeCategoryLabel } from "@/lib/incomes";
import type { MonthlyIncomeSummaryRow } from "@/lib/services/monthly-income.service";

type IncomeSummaryByCategoryProps = {
  rows: MonthlyIncomeSummaryRow[];
  totalPlannedActive: number;
};

export function IncomeSummaryByCategory({
  rows,
  totalPlannedActive,
}: IncomeSummaryByCategoryProps) {
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
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    Sem entradas ativas para agrupar.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">
                      {getIncomeCategoryLabel(row.category)}
                    </TableCell>
                    <TableCell className="font-semibold">{formatBRL(row.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <tfoot>
              <TableRow className="border-t border-border/80">
                <TableCell className="font-semibold">Total geral</TableCell>
                <TableCell className="font-semibold">{formatBRL(totalPlannedActive)}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
