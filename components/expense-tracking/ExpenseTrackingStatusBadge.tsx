import { Badge } from "@/components/ui/badge";
import type { ExpenseTrackingDisplayStatus } from "@/lib/expense-tracking";

type ExpenseTrackingStatusBadgeProps = {
  status: ExpenseTrackingDisplayStatus;
};

const STATUS_LABELS: Record<ExpenseTrackingDisplayStatus, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  concluido: "Concluído",
  estourado: "Estourado",
  pago: "Pago",
};

export function ExpenseTrackingStatusBadge({ status }: ExpenseTrackingStatusBadgeProps) {
  if (status === "concluido" || status === "pago") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }

  if (status === "estourado") {
    return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
  }

  if (status === "parcial") {
    return (
      <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-border/80 text-muted-foreground">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
