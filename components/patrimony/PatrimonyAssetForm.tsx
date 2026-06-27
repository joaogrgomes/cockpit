"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations";
import {
  getPatrimonyAssetTypeLabel,
  type PatrimonyAssetView,
} from "@/lib/patrimony";
import { PATRIMONY_ASSET_TYPE_VALUES } from "@/lib/db/schema";
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

type PatrimonyActionResult = {
  ok: boolean;
  error?: string;
};

type PatrimonyAssetFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<PatrimonyActionResult>;
  asset?: PatrimonyAssetView;
};

type PatrimonyAssetFormValues = {
  name: string;
  institution: string;
  productName: string;
  assetType: (typeof PATRIMONY_ASSET_TYPE_VALUES)[number];
  objective: string;
  balance: string;
  liquidity: string;
  profitabilityLabel: string;
  isReserved: "true" | "false";
  notes: string;
};

function getInitialValues(asset?: PatrimonyAssetView): PatrimonyAssetFormValues {
  return {
    name: asset?.name ?? "",
    institution: asset?.institution ?? "",
    productName: asset?.productName ?? "",
    assetType: asset?.assetType ?? "checking_account",
    objective: asset?.objective ?? "",
    balance: typeof asset?.balanceCents === "number" ? formatBRL(asset.balanceCents) : "",
    liquidity: asset?.liquidity ?? "",
    profitabilityLabel: asset?.profitabilityLabel ?? "",
    isReserved: asset?.isReserved ? "true" : "false",
    notes: asset?.notes ?? "",
  };
}

function buildFormData(values: PatrimonyAssetFormValues, assetId?: string): FormData {
  const formData = new FormData();
  if (assetId) {
    formData.set("assetId", assetId);
  }

  formData.set("name", values.name);
  formData.set("institution", values.institution);
  formData.set("productName", values.productName);
  formData.set("assetType", values.assetType);
  formData.set("objective", values.objective);
  formData.set("balanceCents", values.balance);
  formData.set("liquidity", values.liquidity);
  formData.set("profitabilityLabel", values.profitabilityLabel);
  formData.set("isReserved", values.isReserved);
  formData.set("notes", values.notes);
  return formData;
}

export function PatrimonyAssetForm({ mode, action, asset }: PatrimonyAssetFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditMode = mode === "edit";

  const initialValues = useMemo(() => getInitialValues(asset), [asset]);
  const [values, setValues] = useState<PatrimonyAssetFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(getInitialValues(asset));
      setError(null);
    }
  }, [open, asset?.id, asset?.name, asset?.balanceCents, asset?.status, mode]);

  const trigger = isEditMode ? (
    <Button variant="outline" size="sm">
      Editar
    </Button>
  ) : (
    <Button size="sm">Novo ativo</Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar ativo patrimonial" : "Novo ativo patrimonial"}</DialogTitle>
          <DialogDescription>
            Registre onde está seu dinheiro e a finalidade de cada parte dele. Este módulo é uma
            fotografia patrimonial, não um controle de investimentos.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            startTransition(async () => {
              const result = await action(buildFormData(values, asset?.id));
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar o ativo.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Dados do ativo</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Instituição</Label>
                <Input
                  id="institution"
                  value={values.institution}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, institution: event.target.value }))
                  }
                  placeholder="Ex.: Inter, Mercado Pago"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Produto</Label>
                <Input
                  id="productName"
                  value={values.productName}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, productName: event.target.value }))
                  }
                  placeholder="Ex.: Porquinho, Cofrinho, CDB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetType">Tipo</Label>
                <select
                  id="assetType"
                  value={values.assetType}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      assetType: event.target.value as PatrimonyAssetFormValues["assetType"],
                    }))
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {PATRIMONY_ASSET_TYPE_VALUES.map((assetType) => (
                    <option key={assetType} value={assetType}>
                      {getPatrimonyAssetTypeLabel(assetType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo atual (BRL)</Label>
                <Input
                  id="balance"
                  value={values.balance}
                  onChange={(event) => setValues((current) => ({ ...current, balance: event.target.value }))}
                  placeholder="Ex.: R$ 8.000,00"
                  inputMode="decimal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Input
                  id="objective"
                  value={values.objective}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, objective: event.target.value }))
                  }
                  placeholder="Ex.: Reserva de Emergência"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidity">Liquidez</Label>
                <Input
                  id="liquidity"
                  value={values.liquidity}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, liquidity: event.target.value }))
                  }
                  placeholder="Ex.: imediata, D+1, D+30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profitabilityLabel">Rentabilidade</Label>
                <Input
                  id="profitabilityLabel"
                  value={values.profitabilityLabel}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, profitabilityLabel: event.target.value }))
                  }
                  placeholder="Ex.: 100% CDI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isReserved">Dinheiro comprometido?</Label>
                <select
                  id="isReserved"
                  value={values.isReserved}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      isReserved: event.target.value as PatrimonyAssetFormValues["isReserved"],
                    }))
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  <option value="true">Sim, comprometido</option>
                  <option value="false">Não, livre</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={values.notes}
                  onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
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
              {isPending ? "Salvando..." : isEditMode ? "Salvar ativo" : "Criar ativo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
