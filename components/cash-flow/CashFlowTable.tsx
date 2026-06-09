import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CashFlowMonth } from "@/lib/cash-flow";
import { CashFlowMonthRow } from "./CashFlowMonthRow";

type CashFlowActionResult = {
  ok: boolean;
  error?: string;
};

type CashFlowTableProps = {
  months: CashFlowMonth[];
  closeMonthAction: (formData: FormData) => Promise<CashFlowActionResult>;
  reopenMonthAction: (formData: FormData) => Promise<CashFlowActionResult>;
};

export function CashFlowTable({
  months,
  closeMonthAction,
  reopenMonthAction,
}: CashFlowTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead>Saldo inicial</TableHead>
          <TableHead>Entradas previstas</TableHead>
          <TableHead>Gastos previstos</TableHead>
          <TableHead>Orçamento previsto</TableHead>
          <TableHead>Variável realizado</TableHead>
          <TableHead>Diferença</TableHead>
          <TableHead>Resultado previsto</TableHead>
          <TableHead>Resultado realizado</TableHead>
          <TableHead>Saldo previsto</TableHead>
          <TableHead>Saldo realizado</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {months.map((month) => (
          <CashFlowMonthRow
            key={month.periodMonth}
            month={month}
            closeMonthAction={closeMonthAction}
            reopenMonthAction={reopenMonthAction}
          />
        ))}
      </TableBody>
    </Table>
  );
}
