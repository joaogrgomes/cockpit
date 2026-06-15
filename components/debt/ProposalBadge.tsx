import { Badge } from "@/components/ui/badge";

type ProposalBadgeProps = {
  state?: "current" | "expired" | "historical";
};

export function ProposalBadge({ state = "current" }: ProposalBadgeProps) {
  const label =
    state === "expired"
      ? "Proposta vencida"
      : state === "historical"
        ? "Proposta histórica"
        : "Proposta atual";
  const variant = state === "expired" ? "destructive" : state === "historical" ? "outline" : "secondary";

  return (
    <Badge
      variant={variant}
      className={
        state === "current"
          ? "h-6 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold tracking-wide text-emerald-700"
          : "h-6 rounded-md px-2.5 text-[11px] font-semibold tracking-wide"
      }
    >
      {label}
    </Badge>
  );
}
