import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import {
  getStatementGroupHeading,
  groupStatementItemsByDate,
  type StatementItem,
} from "@/lib/statement";
import { StatementItemRow } from "./StatementItemRow";

type StatementTimelineProps = {
  items: StatementItem[];
};

export function StatementTimeline({ items }: StatementTimelineProps) {
  if (items.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento encontrado para os filtros selecionados.
        </CardContent>
      </Card>
    );
  }

  const groupedItems = groupStatementItemsByDate(items);

  return (
    <div className="space-y-4">
      {groupedItems.map(({ date, items: dayItems, dailyBalance }) => {
        const balanceClassName =
          dailyBalance > 0
            ? "text-emerald-600"
            : dailyBalance < 0
              ? "text-destructive"
              : "text-muted-foreground";
        const balancePrefix = dailyBalance > 0 ? "+" : dailyBalance < 0 ? "-" : "";

        return (
          <Card key={date} className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{getStatementGroupHeading(date)}</CardTitle>
              <CardDescription>{dayItems.length} lançamento(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dayItems.map((item) => (
                <StatementItemRow key={item.id} item={item} />
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium">
                <span className="text-muted-foreground">Saldo do dia</span>
                <span className={balanceClassName}>
                  {balancePrefix}
                  {formatBRL(Math.abs(dailyBalance))}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
