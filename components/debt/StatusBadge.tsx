import { Badge } from "@/components/ui/badge";
import type { DebtStatus } from "@/types";

const STATUS_LABEL: Record<DebtStatus, string> = {
  em_aberto: "Em aberto",
  em_atraso: "Em atraso",
  em_negociacao: "Em negociação",
  parcelada: "Parcelada",
  quitada: "Quitada",
  suspensa: "Suspensa",
};

export function StatusBadge({ status }: { status: DebtStatus }) {
  const variant =
    status === "quitada"
      ? "secondary"
      : status === "em_atraso"
        ? "destructive"
        : status === "suspensa"
          ? "outline"
          : "default";

  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}
