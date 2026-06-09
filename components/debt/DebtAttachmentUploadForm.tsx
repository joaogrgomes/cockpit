"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEBT_ATTACHMENT_TYPE_VALUES } from "@/lib/db/schema";
import type { DebtAttachmentType } from "@/types";

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

type DebtAttachmentUploadFormProps = {
  debtId: string;
  action: (formData: FormData) => Promise<DebtActionResult>;
};

const ATTACHMENT_LABELS: Record<DebtAttachmentType, string> = {
  proposal_slip: "Boleto/proposta",
  whatsapp_screenshot: "Print da conversa",
  payment_receipt: "Comprovante de pagamento",
  serasa_clearance: "Comprovante de baixa",
  other: "Outro",
};

function attachmentTypeLabel(type: DebtAttachmentType) {
  return ATTACHMENT_LABELS[type];
}

export function DebtAttachmentUploadForm({ debtId, action }: DebtAttachmentUploadFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Adicionar documento
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
          <DialogDescription>
            Anexe boleto, print, comprovante ou outro arquivo relacionado à dívida.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar o documento.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="debtId" value={debtId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="attachmentType">Tipo</Label>
              <select
                id="attachmentType"
                name="attachmentType"
                defaultValue="other"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                {DEBT_ATTACHMENT_TYPE_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {attachmentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="attachmentFile">Arquivo</Label>
              <Input
                id="attachmentFile"
                name="attachmentFile"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                required
              />
              <p className="text-xs text-muted-foreground">
                PDF, PNG, JPG/JPEG e WebP. Máximo de 10 MB.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observação</Label>
              <Textarea id="notes" name="notes" placeholder="Contexto do documento, protocolo, observações..." />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Adicionar documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
