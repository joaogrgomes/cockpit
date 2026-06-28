import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExpenseTrackingItemView } from "@/lib/expense-tracking";
import { ExpenseTrackingRow } from "./ExpenseTrackingRow";

type ExpenseEntryActionResult = {
  ok: boolean;
  error?: string;
};

type ExpenseTrackingTableProps = {
  periodMonth: string;
  items: ExpenseTrackingItemView[];
  emptyMessage?: string;
  createAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
  deleteAction: (formData: FormData) => Promise<ExpenseEntryActionResult>;
};

export function ExpenseTrackingTable({
  periodMonth,
  items,
  emptyMessage = "Nenhum gasto ativo encontrado para acompanhamento.",
  createAction,
  deleteAction,
}: ExpenseTrackingTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vencimento</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Previsto</TableHead>
          <TableHead>Realizado</TableHead>
          <TableHead>Restante</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <ExpenseTrackingRow
              key={item.monthlyExpenseId}
              item={item}
              periodMonth={periodMonth}
              createAction={createAction}
              deleteAction={deleteAction}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
