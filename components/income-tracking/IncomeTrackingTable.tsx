import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncomeTrackingItemView } from "@/lib/services/monthly-income-entry.service";
import { IncomeTrackingRow } from "./IncomeTrackingRow";

type IncomeEntryActionResult = {
  ok: boolean;
  error?: string;
};

type IncomeTrackingTableProps = {
  periodMonth: string;
  items: IncomeTrackingItemView[];
  createAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
  deleteAction: (formData: FormData) => Promise<IncomeEntryActionResult>;
};

export function IncomeTrackingTable({
  periodMonth,
  items,
  createAction,
  deleteAction,
}: IncomeTrackingTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Previsão</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Previsto</TableHead>
          <TableHead>Recebido</TableHead>
          <TableHead>A receber</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              Nenhuma entrada ativa encontrada para acompanhamento.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <IncomeTrackingRow
              key={item.monthlyIncomeId}
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
