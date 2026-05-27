import { Badge } from "@/components/ui/badge";

type IncomeStatusBadgeProps = {
  isActive: boolean;
};

export function IncomeStatusBadge({ isActive }: IncomeStatusBadgeProps) {
  if (isActive) {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
        Ativo
      </Badge>
    );
  }

  return <Badge variant="outline">Inativo</Badge>;
}
