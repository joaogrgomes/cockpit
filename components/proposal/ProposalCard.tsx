import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/calculations";
import type { ProposalViewModel } from "@/lib/services/proposal.service";

type ProposalCardProps = {
  proposal: ProposalViewModel;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const discountPctLabel =
    typeof proposal.discountPct === "number"
      ? `${proposal.discountPct >= 0 ? "+" : ""}${proposal.discountPct.toFixed(1)}%`
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Proposta ativa</CardTitle>
        </div>
        {proposal.isExpiringSoon ? (
          <Badge variant="destructive">
            Vence em {proposal.daysUntilExpiry} dia{proposal.daysUntilExpiry === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Valor proposto</p>
          <p className="font-semibold">{formatBRL(proposal.proposedValue)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Desconto (R$)</p>
          <p className="font-semibold">{`${proposal.discountValue >= 0 ? "+" : ""}${formatBRL(proposal.discountValue)}`}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Desconto (%)</p>
          <p className="font-semibold">{discountPctLabel ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data da proposta</p>
          <p className="font-medium">{formatDate(proposal.proposedAt) ?? "-"}</p>
        </div>
        {proposal.expiresAt ? (
          <div>
            <p className="text-sm text-muted-foreground">Validade</p>
            <p className="font-medium">{formatDate(proposal.expiresAt)}</p>
          </div>
        ) : null}
        {proposal.origin ? (
          <div>
            <p className="text-sm text-muted-foreground">Origem</p>
            <p className="font-medium">{proposal.origin}</p>
          </div>
        ) : null}
        {proposal.notes ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Observações</p>
            <p className="whitespace-pre-wrap">{proposal.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
