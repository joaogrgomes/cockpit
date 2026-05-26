import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import type { DashboardTopDebt } from "@/lib/services/dashboard.service";

type TopListProps = {
  debts: DashboardTopDebt[];
};

export function TopList({ debts }: TopListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maiores dívidas (Top 3)</CardTitle>
      </CardHeader>
      <CardContent>
        {debts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma dívida ativa cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {debts.map((debt) => (
              <li key={debt.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div>
                  <Link href={`/debts/${debt.id}`} className="font-medium hover:underline">
                    {debt.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{debt.creditor}</p>
                </div>
                <p className="font-semibold">{formatBRL(debt.currentValue)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
