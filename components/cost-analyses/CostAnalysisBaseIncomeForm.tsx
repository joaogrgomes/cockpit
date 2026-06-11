"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CostAnalysisActionResult = {
  ok: boolean;
  error?: string;
};

type CostAnalysisBaseIncomeFormProps = {
  analysisId: string;
  baseNetIncomeCents: number;
  baseGrossIncomeCents: number;
  suggestedNetIncomeCents: number;
  action: (formData: FormData) => Promise<CostAnalysisActionResult>;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

export function CostAnalysisBaseIncomeForm({
  analysisId,
  baseNetIncomeCents,
  baseGrossIncomeCents,
  suggestedNetIncomeCents,
  action,
}: CostAnalysisBaseIncomeFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Editar rendas base
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar rendas base</DialogTitle>
          <DialogDescription>
            A renda líquida pode seguir a soma planejada do mês. A renda bruta fica livre para
            simulação.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar as rendas base.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="analysisId" value={analysisId} />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Valores base</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseNetIncome">Renda líquida base</Label>
                <Input
                  id="baseNetIncome"
                  name="baseNetIncome"
                  defaultValue={moneyToInput(baseNetIncomeCents)}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Sugestão atual: {formatBRL(suggestedNetIncomeCents)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseGrossIncome">Renda bruta base</Label>
                <Input
                  id="baseGrossIncome"
                  name="baseGrossIncome"
                  defaultValue={moneyToInput(baseGrossIncomeCents)}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Use para medir o esforço do custo total sobre a renda bruta.
                </p>
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar bases"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
