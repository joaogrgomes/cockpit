"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PatrimonyAssetView } from "@/lib/patrimony";
import {
  PATRIMONY_GUIDED_ASSET_CATEGORY_VALUES,
  applyPatrimonyGuidedAssetCategory,
  getPatrimonyGuidedAssetCategoryDescription,
  getPatrimonyGuidedAssetCategoryLabel,
  getPatrimonyGuidedAssetFormInitialValues,
  type PatrimonyGuidedAssetCategory,
  type PatrimonyGuidedAssetFormValues,
} from "@/lib/patrimony-guided-form";
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

  const initialState = useMemo(() => getPatrimonyGuidedAssetFormInitialValues(asset), [asset]);
  const [guidedCategory, setGuidedCategory] = useState<PatrimonyGuidedAssetCategory>(
    initialState.category
  );
  const [values, setValues] = useState<PatrimonyGuidedAssetFormValues>(initialState.values);

  useEffect(() => {
    if (open) {
      const nextInitialState = getPatrimonyGuidedAssetFormInitialValues(asset);
      setGuidedCategory(nextInitialState.category);
      setValues(nextInitialState.values);
      setError(null);
    }
  }, [
    open,
    mode,
    asset?.id,
    asset?.name,
    asset?.institution,
    asset?.productName,
    asset?.assetType,
    asset?.objective,
    asset?.balanceCents,
    asset?.liquidity,
    asset?.profitabilityLabel,
    asset?.isReserved,
    asset?.notes,
    asset?.status,
  ]);

  const hideAvailabilityField =
    guidedCategory === "vehicle" || guidedCategory === "real_estate" || guidedCategory === "pension";
  const institutionLabel =
    guidedCategory === "vehicle" ? "Instituição (opcional)" : "Instituição";
  const namePlaceholder =
    guidedCategory === "vehicle"
      ? "Ex.: Chevrolet Prisma LT 2019"
      : guidedCategory === "pension"
        ? "Ex.: Previ"
        : guidedCategory === "reserve"
          ? "Ex.: Reserva manutenção carro"
          : "Ex.: Reserva manutenção carro, Previ, Chevrolet Prisma";
  const institutionPlaceholder =
    guidedCategory === "vehicle"
      ? "Ex.: Concessionária, vendedor, garagem"
      : guidedCategory === "pension"
        ? "Ex.: Previ"
        : "Ex.: Inter, Previ, Banco do Brasil";
  const productLabel =
    guidedCategory === "vehicle" ? "Produto / modelo" : "Produto / descrição";
  const productPlaceholder =
    guidedCategory === "vehicle"
      ? "Ex.: Chevrolet Prisma LT 2019"
      : guidedCategory === "pension"
        ? "Ex.: Previdência"
        : "Ex.: CDB, Cofrinho, Reserva";
  const objectivePlaceholder =
    guidedCategory === "vehicle"
      ? "Ex.: Transporte familiar"
      : guidedCategory === "pension"
        ? "Ex.: Aposentadoria / Longo prazo"
        : guidedCategory === "reserve"
          ? "Ex.: Emergência, IPVA, Manutenção do carro"
          : "Ex.: Livre, emergência, viagem";

  const applyGuidedCategory = (category: PatrimonyGuidedAssetCategory) => {
    setGuidedCategory(category);
    setValues((current) => applyPatrimonyGuidedAssetCategory(current, category));
  };

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
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Cadastro guiado</h3>
              <p className="text-sm text-muted-foreground">
                Escolha o tipo mais próximo do ativo para preencher os campos automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PATRIMONY_GUIDED_ASSET_CATEGORY_VALUES.map((category) => {
                const active = guidedCategory === category;
                return (
                  <Button
                    key={category}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyGuidedCategory(category)}
                  >
                    {getPatrimonyGuidedAssetCategoryLabel(category)}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPatrimonyGuidedAssetCategoryDescription(guidedCategory)}
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Dados do ativo</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                  placeholder={namePlaceholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">{institutionLabel}</Label>
                <Input
                  id="institution"
                  value={values.institution}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, institution: event.target.value }))
                  }
                  placeholder={institutionPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">{productLabel}</Label>
                <Input
                  id="productName"
                  value={values.productName}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, productName: event.target.value }))
                  }
                  placeholder={productPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guidedCategory">Categoria do ativo</Label>
                <select
                  id="guidedCategory"
                  value={guidedCategory}
                  onChange={(event) =>
                    applyGuidedCategory(event.target.value as PatrimonyGuidedAssetCategory)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {PATRIMONY_GUIDED_ASSET_CATEGORY_VALUES.map((category) => (
                    <option key={category} value={category}>
                      {getPatrimonyGuidedAssetCategoryLabel(category)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {getPatrimonyGuidedAssetCategoryDescription(guidedCategory)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Valor atual (BRL)</Label>
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
                  placeholder={objectivePlaceholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidity">Liquidez</Label>
                <select
                  id="liquidity"
                  value={values.liquidity}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, liquidity: event.target.value }))
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  required={!hideAvailabilityField}
                >
                  <option value="Imediata">Imediata</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Muito baixa">Muito baixa</option>
                </select>
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
                {hideAvailabilityField ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Este tipo já entra como não disponível para uso imediato.
                  </div>
                ) : (
                  <>
                    <Label htmlFor="isReserved">Disponibilidade</Label>
                    <select
                      id="isReserved"
                      value={values.isReserved}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          isReserved: event.target.value as PatrimonyGuidedAssetFormValues["isReserved"],
                        }))
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                      required
                    >
                      <option value="false">Livre para uso</option>
                      <option value="true">Reservado/provisionado</option>
                    </select>
                  </>
                )}
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
