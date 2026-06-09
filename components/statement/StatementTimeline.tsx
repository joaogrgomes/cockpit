import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatementGroupHeading, type StatementItem } from "@/lib/statement";
import { StatementItemRow } from "./StatementItemRow";

type StatementTimelineProps = {
  items: StatementItem[];
};

function groupItemsByDate(items: StatementItem[]) {
  const groups = new Map<string, StatementItem[]>();

  for (const item of items) {
    const current = groups.get(item.date) ?? [];
    current.push(item);
    groups.set(item.date, current);
  }

  return [...groups.entries()];
}

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

  const groupedItems = groupItemsByDate(items);

  return (
    <div className="space-y-4">
      {groupedItems.map(([date, dayItems]) => (
        <Card key={date} className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{getStatementGroupHeading(date)}</CardTitle>
            <CardDescription>{dayItems.length} lançamento(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {dayItems.map((item) => (
              <StatementItemRow key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
