import { Badge } from "@/components/ui/badge";
import type { DebtStatus } from "@/types";

const STATUS_LABEL: Record<DebtStatus, string> = {
  em_aberto: "Em aberto",
  em_atraso: "Em atraso",
  em_negociacao: "Em negociação",
  parcelada: "Parcelada",
  quitada: "Quitada",
  aguardando_baixa: "Aguardando baixa",
  baixada: "Baixada",
  arquivada: "Arquivada",
  suspensa: "Suspensa",
};

export function StatusBadge({ status }: { status: DebtStatus }) {
  const variant =
    status === "em_atraso"
      ? "destructive"
      : status === "quitada" || status === "baixada"
        ? "secondary"
        : status === "arquivada"
          ? "outline"
          : status === "aguardando_baixa"
            ? "default"
            : status === "suspensa"
              ? "outline"
              : "default";

  return (
    <Badge variant={variant} className="h-6 rounded-md px-2.5 text-[11px] font-semibold tracking-wide">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
