"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
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

type CashFlowActionResult = {
  ok: boolean;
  error?: string;
};

type CashFlowSettingsFormProps = {
  startMonth: string;
  initialBalance: number;
  action: (formData: FormData) => Promise<CashFlowActionResult>;
};

export function CashFlowSettingsForm({
  startMonth,
  initialBalance,
  action,
}: CashFlowSettingsFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Configurar saldo inicial
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuração do fluxo de caixa</DialogTitle>
          <DialogDescription>
            Defina o mês de início e o saldo inicial para a projeção acumulada.
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
                setError(result.error ?? "Não foi possível salvar a configuração.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Mês inicial</Label>
              <Input id="startMonth" name="startMonth" type="month" required defaultValue={startMonth} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialBalance">Saldo inicial (BRL)</Label>
              <Input
                id="initialBalance"
                name="initialBalance"
                required
                defaultValue={formatBRL(initialBalance)}
                placeholder="Ex.: R$ 1.000,00 ou -R$ 200,00"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar configuração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
