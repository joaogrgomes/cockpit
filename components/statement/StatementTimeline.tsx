import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { getStatementDailyRunningBalances } from "@/lib/daily-balance";
import { getStatementGroupHeading, type StatementItem } from "@/lib/statement";
import { StatementItemRow } from "./StatementItemRow";

type StatementTimelineProps = {
  items: StatementItem[];
  periodMonth: string;
  openingBalanceCents: number;
};

function formatSignedBRL(value: number): string {
  if (value === 0) {
    return formatBRL(0);
  }

  return value > 0 ? `+${formatBRL(value)}` : formatBRL(value);
}

export function StatementTimeline({
  items,
  periodMonth,
  openingBalanceCents,
}: StatementTimelineProps) {
  const { balances: dailyBalances, isFutureMonth } = getStatementDailyRunningBalances({
    periodMonth,
    openingBalanceCents,
    items,
  });

  if (isFutureMonth) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Extrato disponível apenas para meses já iniciados.
        </CardContent>
      </Card>
    );
  }

  if (dailyBalances.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento encontrado para os filtros selecionados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {dailyBalances.map(({ date, items: dayItems, incomeCents, expenseCents, dailyResultCents, closingBalanceCents }) => {
        const resultClassName =
          dailyResultCents > 0
            ? "text-emerald-600"
            : dailyResultCents < 0
              ? "text-destructive"
              : "text-muted-foreground";
        const closingClassName =
          closingBalanceCents > 0
            ? "text-emerald-600"
            : closingBalanceCents < 0
              ? "text-destructive"
              : "text-muted-foreground";

        return (
          <Card key={date} className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{getStatementGroupHeading(date)}</CardTitle>
              <CardDescription>
                {dayItems.length} lançamento(s) · entradas {formatBRL(incomeCents)} · gastos{" "}
                {formatBRL(expenseCents)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-2 border-b border-border/60 bg-muted/20 px-3 py-3 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Resultado do dia</span>
                  <span className={resultClassName}>{formatSignedBRL(dailyResultCents)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Saldo do dia</span>
                  <span className={closingClassName}>{formatBRL(closingBalanceCents)}</span>
                </div>
              </div>
              {dayItems.length > 0 ? (
                dayItems.map((item) => <StatementItemRow key={item.id} item={item} />)
              ) : (
                <div className="border-b border-border/60 px-3 py-4 text-sm text-muted-foreground">
                  Nenhum lançamento nesse dia.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
