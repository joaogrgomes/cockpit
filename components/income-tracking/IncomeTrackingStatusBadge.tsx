import { Badge } from "@/components/ui/badge";
import type { IncomeTrackingStatus } from "@/lib/income-tracking";

type IncomeTrackingStatusBadgeProps = {
  status: IncomeTrackingStatus;
};

const STATUS_LABELS: Record<IncomeTrackingStatus, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  recebido: "Recebido",
};

export function IncomeTrackingStatusBadge({ status }: IncomeTrackingStatusBadgeProps) {
  if (status === "recebido") {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        {STATUS_LABELS[status]}
      </Badge>
    );
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
