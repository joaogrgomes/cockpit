import { Badge } from "@/components/ui/badge";
import {
  getDebtTypeBadgeVariant,
  getDebtTypeLabel,
} from "@/lib/debt-type";
import type { DebtType } from "@/types";

type DebtTypeBadgeProps = {
  debtType?: DebtType | string | null;
};

export function DebtTypeBadge({ debtType }: DebtTypeBadgeProps) {
  return (
    <Badge
      variant={getDebtTypeBadgeVariant(debtType)}
      className="h-6 rounded-md px-2.5 text-[11px] font-semibold tracking-wide"
    >
      {getDebtTypeLabel(debtType)}
    </Badge>
  );
}
