"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProposalActionResult = {
  ok: boolean;
  error?: string;
};

type ProposalFormProps = {
  debtId: string;
  action: (formData: FormData) => Promise<ProposalActionResult>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ProposalForm({ debtId, action }: ProposalFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Adicionar proposta
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova proposta de quitação</DialogTitle>
          <DialogDescription>
            Registre uma proposta ativa para esta dívida.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("debtId", debtId);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar a proposta.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="debtId" value={debtId} />

          <div className="space-y-2">
            <Label htmlFor="proposedValue">Valor proposto (BRL)</Label>
            <Input
              id="proposedValue"
              name="proposedValue"
              required
              placeholder="Ex.: R$ 1.000,00"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proposedAt">Data da proposta</Label>
              <Input id="proposedAt" name="proposedAt" type="date" required defaultValue={todayIsoDate()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Validade (opcional)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin">Origem (opcional)</Label>
            <Input id="origin" name="origin" placeholder="Ex.: ligação do banco" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar proposta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
