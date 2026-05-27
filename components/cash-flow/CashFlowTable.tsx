import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CashFlowMonth } from "@/lib/cash-flow";
import { CashFlowMonthRow } from "./CashFlowMonthRow";

type CashFlowTableProps = {
  months: CashFlowMonth[];
};

export function CashFlowTable({ months }: CashFlowTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead>Saldo inicial</TableHead>
          <TableHead>Entradas</TableHead>
          <TableHead>Origem entradas</TableHead>
          <TableHead>Gastos fixos</TableHead>
          <TableHead>Origem fixos</TableHead>
          <TableHead>Gastos variáveis</TableHead>
          <TableHead>Saídas totais</TableHead>
          <TableHead>Resultado</TableHead>
          <TableHead>Saldo final</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {months.map((month) => (
          <CashFlowMonthRow key={month.periodMonth} month={month} />
        ))}
      </TableBody>
    </Table>
  );
}
