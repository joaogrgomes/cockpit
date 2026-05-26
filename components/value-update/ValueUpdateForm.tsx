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

type ValueUpdateActionResult = {
  ok: boolean;
  error?: string;
};

type ValueUpdateFormProps = {
  debtId: string;
  action: (formData: FormData) => Promise<ValueUpdateActionResult>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ValueUpdateForm({ debtId, action }: ValueUpdateFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Atualizar valor
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atualizar valor da dívida</DialogTitle>
          <DialogDescription>
            Registre o novo valor para manter o histórico da dívida atualizado.
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
                setError(result.error ?? "Não foi possível registrar a atualização.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="debtId" value={debtId} />

          <div className="space-y-2">
            <Label htmlFor="recordedValue">Novo valor (BRL)</Label>
            <Input
              id="recordedValue"
              name="recordedValue"
              required
              placeholder="Ex.: R$ 2.345,67"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recordedAt">Data do registro</Label>
              <Input
                id="recordedAt"
                name="recordedAt"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Origem (opcional)</Label>
              <Input id="source" name="source" placeholder="Ex.: app do banco" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar atualização"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
