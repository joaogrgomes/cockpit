import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEBT_ATTACHMENT_TYPE_VALUES } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { DebtAttachmentUploadForm } from "./DebtAttachmentUploadForm";
import type { DebtAttachment, DebtAttachmentType } from "@/types";

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

type DebtAttachmentsCardProps = {
  debtId: string;
  attachments: DebtAttachment[];
  action: (formData: FormData) => Promise<DebtActionResult>;
};

const ATTACHMENT_LABELS: Record<(typeof DEBT_ATTACHMENT_TYPE_VALUES)[number], string> = {
  proposal_slip: "Boleto/proposta",
  whatsapp_screenshot: "Print da conversa",
  payment_receipt: "Comprovante de pagamento",
  serasa_clearance: "Comprovante de baixa",
  other: "Outro",
};

function getAttachmentLabel(type: DebtAttachmentType) {
  return ATTACHMENT_LABELS[type];
}

function formatCreatedAt(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function DebtAttachmentsCard({ debtId, attachments, action }: DebtAttachmentsCardProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Documentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Boleto, proposta, comprovantes e registros de baixa da dívida.
          </p>
        </div>

        <DebtAttachmentUploadForm debtId={debtId} action={action} />
      </CardHeader>
      <CardContent className="space-y-3">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {getAttachmentLabel(attachment.type as DebtAttachmentType)}
                  </Badge>
                  <span className="text-sm font-medium">{attachment.filename}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Enviado em {formatCreatedAt(attachment.createdAt)}</span>
                  {attachment.notes ? <span>• {attachment.notes}</span> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/api/debts/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Baixar
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
