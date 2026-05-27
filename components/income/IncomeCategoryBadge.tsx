import { Badge } from "@/components/ui/badge";
import { getIncomeCategoryLabel } from "@/lib/incomes";

type IncomeCategoryBadgeProps = {
  category: string;
};

export function IncomeCategoryBadge({ category }: IncomeCategoryBadgeProps) {
  return (
    <Badge variant="outline" className="border-border/80 bg-muted/30 text-foreground">
      {getIncomeCategoryLabel(category)}
    </Badge>
  );
}
