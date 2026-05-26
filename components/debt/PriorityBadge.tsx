import { Badge } from "@/components/ui/badge";

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const variant =
    priority === "critica"
      ? "destructive"
      : priority === "alta"
        ? "default"
        : priority === "media"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{PRIORITY_LABEL[priority] ?? priority}</Badge>;
}
