"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import {
  getCostAnalysisKindDescription,
  getCostAnalysisKindLabel,
} from "@/lib/cost-analyses";
import type { CostAnalysisItem, CostAnalysisKind } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";

type CostAnalysisActionResult = {
  ok: boolean;
  error?: string;
};

type CostAnalysisItemFormProps = {
  mode: "create" | "edit";
  analysisId: string;
  action: (formData: FormData) => Promise<CostAnalysisActionResult>;
  item?: CostAnalysisItem;
};

const COST_KIND_OPTIONS: Array<{ value: CostAnalysisKind; label: string }> = [
  { value: "cash", label: getCostAnalysisKindLabel("cash") },
  { value: "economic", label: getCostAnalysisKindLabel("economic") },
  { value: "provision", label: getCostAnalysisKindLabel("provision") },
];

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

export function CostAnalysisItemForm({
  mode,
  analysisId,
  action,
  item,
}: CostAnalysisItemFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditMode = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={isEditMode ? "outline" : "default"} size="sm">
            {isEditMode ? "Editar" : "Novo item"}
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            Cadastre custos mensais para estimar o custo total anual sem misturar isso com o fluxo
            de caixa.
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
                setError(result.error ?? "Não foi possível salvar o item.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="analysisId" value={analysisId} />
          {isEditMode && item?.id ? <input type="hidden" name="itemId" value={item.id} /> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Dados do item</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={item?.name ?? ""} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyAmount">Valor mensal (BRL)</Label>
                <Input
                  id="monthlyAmount"
                  name="monthlyAmount"
                  defaultValue={moneyToInput(item?.monthlyAmountCents)}
                  placeholder="Ex.: R$ 605,00"
                  inputMode="decimal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costKind">Tipo</Label>
                <select
                  id="costKind"
                  name="costKind"
                  defaultValue={item?.costKind ?? "cash"}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  {COST_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {getCostAnalysisKindDescription((item?.costKind ?? "cash") as CostAnalysisKind)}
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={item?.notes ?? ""}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditMode ? "Salvar item" : "Criar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
