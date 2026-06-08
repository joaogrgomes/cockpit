import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR } from "@/lib/date-utils";
import type { ProposalViewModel } from "@/lib/services/proposal.service";

type ProposalHistoryProps = {
  proposals: ProposalViewModel[];
};

function formatStatus(status: string, isExpired: boolean) {
  if (isExpired) return "expirada";
  return status;
}

export function ProposalHistory({ proposals }: ProposalHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de propostas</CardTitle>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma proposta cadastrada.</p>
        ) : (
          <ul className="space-y-3">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatBRL(proposal.proposedValue)}</p>
                  <Badge variant={proposal.status === "ativa" && !proposal.isExpired ? "default" : "outline"}>
                    {formatStatus(proposal.status, proposal.isExpired)}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>Proposta em: {formatDateOnlyBR(proposal.proposedAt)}</p>
                  <p>Validade: {formatDateOnlyBR(proposal.expiresAt)}</p>
                  <p>Desconto: {`${proposal.discountValue >= 0 ? "+" : ""}${formatBRL(proposal.discountValue)}`}</p>
                  <p>
                    Desconto %:{" "}
                    {typeof proposal.discountPct === "number"
                      ? `${proposal.discountPct >= 0 ? "+" : ""}${proposal.discountPct.toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
                {proposal.origin ? <p className="mt-2 text-sm">Origem: {proposal.origin}</p> : null}
                {proposal.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{proposal.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
