import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import type { ValueUpdateHistoryItem } from "@/lib/value-update-history";

type ValueHistoryProps = {
  updates: ValueUpdateHistoryItem[];
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getDifferenceLabel(difference: number | null) {
  if (difference === null) {
    return "Primeiro registro";
  }

  if (difference > 0) {
    return `Aumento de +${formatBRL(difference)}`;
  }

  if (difference < 0) {
    return `Reducao de ${formatBRL(difference)}`;
  }

  return "Sem alteracao";
}

export function ValueHistory({ updates }: ValueHistoryProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base">Histórico de valores</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
        ) : (
          <ul className="space-y-3">
            {updates.map((update) => (
              <li key={update.id} className="rounded-lg border border-border/70 bg-muted/25 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatBRL(update.recordedValue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(update.recordedAt) ?? "Data inválida"}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  {getDifferenceLabel(update.differenceFromPrevious)}
                </p>

                {update.source ? <p className="mt-2 text-sm">Origem: {update.source}</p> : null}
                {update.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{update.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
