import { Badge } from "@/components/ui/badge";
import { getExpenseCategoryLabel } from "@/lib/expenses";

type ExpenseCategoryBadgeProps = {
  category: string;
};

export function ExpenseCategoryBadge({ category }: ExpenseCategoryBadgeProps) {
  return (
    <Badge variant="outline" className="border-border/80 bg-muted/30 text-foreground">
      {getExpenseCategoryLabel(category)}
    </Badge>
  );
}
