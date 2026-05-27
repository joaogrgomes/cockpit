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
import type { ExpenseTrackingCategorySummaryItem } from "@/lib/expense-tracking";

type ExpenseTrackingSummaryByCategoryProps = {
  items: ExpenseTrackingCategorySummaryItem[];
};

export function ExpenseTrackingSummaryByCategory({
  items,
}: ExpenseTrackingSummaryByCategoryProps) {
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
                <TableHead>Planejado</TableHead>
                <TableHead>Realizado</TableHead>
                <TableHead>Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Sem dados para o mês selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">
                      {getExpenseCategoryLabel(item.category)}
                    </TableCell>
                    <TableCell>{formatBRL(item.plannedAmount)}</TableCell>
                    <TableCell>{formatBRL(item.actualAmount)}</TableCell>
                    <TableCell
                      className={
                        item.remainingAmount < 0
                          ? "font-medium text-destructive"
                          : "font-medium"
                      }
                    >
                      {formatBRL(item.remainingAmount)}
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
