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
          <TableHead>Gastos fixos</TableHead>
          <TableHead>Variável planejado</TableHead>
          <TableHead>Variável realizado</TableHead>
          <TableHead>Variável restante</TableHead>
          <TableHead>Resultado projetado</TableHead>
          <TableHead>Resultado parcial</TableHead>
          <TableHead>Saldo projetado</TableHead>
          <TableHead>Saldo parcial</TableHead>
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
