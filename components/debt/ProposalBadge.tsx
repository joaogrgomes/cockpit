import { Badge } from "@/components/ui/badge";

export function ProposalBadge() {
  return (
    <Badge
      variant="secondary"
      className="h-6 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold tracking-wide text-emerald-700"
    >
      Com proposta
    </Badge>
  );
}
