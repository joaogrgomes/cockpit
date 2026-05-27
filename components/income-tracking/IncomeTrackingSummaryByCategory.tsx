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
import type { IncomeTrackingCategorySummaryItem } from "@/lib/income-tracking";

type IncomeTrackingSummaryByCategoryProps = {
  items: IncomeTrackingCategorySummaryItem[];
};

export function IncomeTrackingSummaryByCategory({
  items,
}: IncomeTrackingSummaryByCategoryProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo por categoria (mês)</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead>A receber</TableHead>
                <TableHead>Acima do previsto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sem dados para o mês selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">
                      {getIncomeCategoryLabel(item.category)}
                    </TableCell>
                    <TableCell>{formatBRL(item.plannedAmount)}</TableCell>
                    <TableCell>{formatBRL(item.receivedAmount)}</TableCell>
                    <TableCell className="font-medium">
                      {formatBRL(item.remainingAmount)}
                    </TableCell>
                    <TableCell
                      className={
                        item.abovePlannedAmount > 0
                          ? "font-medium text-emerald-700 dark:text-emerald-300"
                          : "text-muted-foreground"
                      }
                    >
                      {formatBRL(item.abovePlannedAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
