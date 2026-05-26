import { Badge } from "@/components/ui/badge";
import { getExpenseTypeLabel } from "@/lib/expenses";

type ExpenseTypeBadgeProps = {
  expenseType: string;
};

export function ExpenseTypeBadge({ expenseType }: ExpenseTypeBadgeProps) {
  const isFixed = expenseType === "fixo";

  return (
    <Badge
      variant={isFixed ? "secondary" : "outline"}
      className={
        isFixed
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "border-border/80 bg-muted/30 text-foreground"
      }
    >
      {getExpenseTypeLabel(expenseType)}
    </Badge>
  );
}
