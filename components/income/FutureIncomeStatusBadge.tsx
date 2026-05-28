import { Badge } from "@/components/ui/badge";

type FutureIncomeStatusBadgeProps = {
  status: string;
};

export function FutureIncomeStatusBadge({ status }: FutureIncomeStatusBadgeProps) {
  if (status === "prevista") {
    return <Badge variant="outline">Prevista</Badge>;
  }

  if (status === "recebida") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        Recebida
      </Badge>
    );
  }

  return <Badge variant="destructive">Cancelada</Badge>;
}
