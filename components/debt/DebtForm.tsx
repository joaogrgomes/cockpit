"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/calculations";
import { normalizeDateOnly } from "@/lib/date-utils";
import { DEBT_TYPE_OPTIONS, getDebtTypeDescription } from "@/lib/debt-type";
import type { Debt } from "@/types";

const DEBT_CATEGORY_OPTIONS = [
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "renegociacao", label: "Renegociação" },
  { value: "loja", label: "Loja" },
  { value: "cheque_especial", label: "Cheque especial" },
  { value: "outro", label: "Outro" },
] as const;

const STATUS_OPTIONS = [
  { value: "em_aberto", label: "Em aberto" },
  { value: "em_atraso", label: "Em atraso" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "parcelada", label: "Parcelada" },
  { value: "quitada", label: "Quitada" },
  { value: "aguardando_baixa", label: "Aguardando baixa" },
  { value: "baixada", label: "Baixada" },
  { value: "arquivada", label: "Arquivada" },
  { value: "suspensa", label: "Suspensa" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "Sem prioridade" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
] as const;

const RISK_OPTIONS = [
  { value: "", label: "Sem risco definido" },
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
  { value: "juridico", label: "Jurídico" },
  { value: "consignado", label: "Consignado" },
  { value: "negativacao", label: "Negativação" },
  { value: "nao_sei", label: "Não sei" },
] as const;

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

type DebtFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<DebtActionResult>;
  debt?: Debt;
};

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

function dateToInput(value?: string | Date | null): string {
  return normalizeDateOnly(value) ?? "";
}

export function DebtForm({ mode, action, debt }: DebtFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEditMode = mode === "edit";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant={isEditMode ? "outline" : "default"} size="sm">
            {isEditMode ? "Editar" : "Nova dívida"}
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar dívida" : "Nova dívida"}</SheetTitle>
          <SheetDescription>
            Preencha os campos obrigatórios primeiro. Os demais são opcionais.
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-6 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const result = await action(formData);

              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar a dívida.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          {isEditMode && debt?.id ? <input type="hidden" name="id" value={debt.id} /> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos obrigatórios</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={debt?.name ?? ""} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="creditor">Credor</Label>
                <Input
                  id="creditor"
                  name="creditor"
                  defaultValue={debt?.creditor ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Categoria operacional</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue={debt?.type ?? "cartao_credito"}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  {DEBT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Categoria operacional da dívida, como cartão, empréstimo ou loja.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtType">Tipo da dívida</Label>
                <select
                  id="debtType"
                  name="debtType"
                  defaultValue={debt?.debtType ?? "payoff"}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  {DEBT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{getDebtTypeDescription(debt?.debtType)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={debt?.status ?? "em_aberto"}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="currentValue">Valor atual (BRL)</Label>
                <Input
                  id="currentValue"
                  name="currentValue"
                  defaultValue={moneyToInput(debt?.currentValue)}
                  placeholder="Ex.: R$ 1.250,00"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Campos opcionais</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originalValue">Valor original (BRL)</Label>
                <Input
                  id="originalValue"
                  name="originalValue"
                  defaultValue={moneyToInput(debt?.originalValue)}
                  placeholder="Ex.: R$ 900,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyPayment">Parcela mensal (BRL)</Label>
                <Input
                  id="monthlyPayment"
                  name="monthlyPayment"
                  defaultValue={moneyToInput(debt?.monthlyPayment)}
                  placeholder="Ex.: R$ 150,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDay">Dia do vencimento</Label>
                <Input
                  id="dueDay"
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={debt?.dueDay ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de vencimento</Label>
                <Input id="dueDate" name="dueDate" type="date" defaultValue={dateToInput(debt?.dueDate)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalInstallments">Total de parcelas</Label>
                <Input
                  id="totalInstallments"
                  name="totalInstallments"
                  type="number"
                  min={1}
                  defaultValue={debt?.totalInstallments ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidInstallments">Parcelas pagas</Label>
                <Input
                  id="paidInstallments"
                  name="paidInstallments"
                  type="number"
                  min={0}
                  defaultValue={debt?.paidInstallments ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overdueSince">Em atraso desde</Label>
                <Input
                  id="overdueSince"
                  name="overdueSince"
                  type="date"
                  defaultValue={dateToInput(debt?.overdueSince)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={debt?.priority ?? ""}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="perceivedRisk">Risco percebido</Label>
                <select
                  id="perceivedRisk"
                  name="perceivedRisk"
                  defaultValue={debt?.perceivedRisk ?? ""}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={debt?.tags?.join(", ") ?? ""}
                  placeholder="Ex.: banco, cartão, urgente"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" defaultValue={debt?.notes ?? ""} />
              </div>
            </div>
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditMode ? "Salvar alterações" : "Criar dívida"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
