import { Badge } from "@/components/ui/badge";

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) {
    return <span className="text-xs text-muted-foreground">Sem prioridade</span>;
  }

  const variant =
    priority === "critica"
      ? "destructive"
      : priority === "alta"
        ? "default"
        : priority === "media"
          ? "secondary"
          : "outline";

  return (
    <Badge variant={variant} className="h-6 rounded-md px-2.5 text-[11px] font-semibold tracking-wide">
      {PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  );
}
