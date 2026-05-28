import { Badge } from "@/components/ui/badge";

type FutureExpenseStatusBadgeProps = {
  status: string;
};

export function FutureExpenseStatusBadge({ status }: FutureExpenseStatusBadgeProps) {
  if (status === "previsto") {
    return <Badge variant="outline">Previsto</Badge>;
  }

  if (status === "realizado") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        Realizado
      </Badge>
    );
  }

  return <Badge variant="destructive">Cancelado</Badge>;
}
