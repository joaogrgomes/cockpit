"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR, getLocalDateInputValue, normalizeDateOnly } from "@/lib/date-utils";
import type {
  DebtSettlementOption,
  DebtSettlementOptionKind,
  DebtSettlementOptionStatus,
} from "@/types";

type DebtSettlementOptionActionResult = {
  ok: boolean;
  error?: string;
};

type DebtSettlementOptionSectionProps = {
  debtId: string;
  options: DebtSettlementOption[];
  saveAction: (formData: FormData) => Promise<DebtSettlementOptionActionResult>;
  archiveAction: (formData: FormData) => Promise<DebtSettlementOptionActionResult>;
  acceptAction: (formData: FormData) => Promise<DebtSettlementOptionActionResult>;
};

type DebtSettlementOptionFormDialogProps = {
  debtId: string;
  action: (formData: FormData) => Promise<DebtSettlementOptionActionResult>;
  option?: DebtSettlementOption;
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
};

function getStatusLabel(status: DebtSettlementOptionStatus): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "expired":
      return "Vencida";
    case "accepted":
      return "Aceita";
    case "rejected":
      return "Recusada";
    case "archived":
      return "Arquivada";
  }
}

function getStatusVariant(status: DebtSettlementOptionStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "accepted":
      return "default";
    case "expired":
      return "destructive";
    case "rejected":
    case "archived":
      return "outline";
    case "active":
    default:
      return "secondary";
  }
}

function getKindLabel(kind: DebtSettlementOptionKind): string {
  return kind === "cash" ? "À vista" : "Parcelado";
}

function moneyToInput(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return formatBRL(cents);
}

function getOptionTitle(option: DebtSettlementOption): string {
  if (option.kind === "cash") {
    return "À vista";
  }

  if (typeof option.monthlyInstallmentCents === "number") {
    return `${option.installments}x de ${formatBRL(option.monthlyInstallmentCents)}`;
  }

  return `${option.installments}x`;
}

function getOptionSubtitle(option: DebtSettlementOption): string {
  if (option.kind === "cash") {
    return `Desembolso imediato: ${formatBRL(option.totalAmountCents)}`;
  }

  return `Total: ${formatBRL(option.totalAmountCents)}`;
}

function OptionActionButtons({
  debtId,
  option,
  archiveAction,
  acceptAction,
}: Pick<DebtSettlementOptionSectionProps, "archiveAction" | "acceptAction" | "debtId"> & {
  option: DebtSettlementOption;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(action: (formData: FormData) => Promise<DebtSettlementOptionActionResult>) {
    setError(null);
    const formData = new FormData();
    formData.set("debtId", debtId);
    formData.set("optionId", option.id);

    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível atualizar a opção.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {option.status !== "accepted" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => submit(acceptAction)}
            disabled={isPending}
          >
            Marcar como aceita
          </Button>
        ) : (
          <Badge variant="default" className="h-8 rounded-md px-3">
            Já aceita
          </Badge>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => submit(archiveAction)}
          disabled={isPending}
        >
          Arquivar
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function DebtSettlementOptionFormDialog({
  debtId,
  action,
  option,
  triggerLabel,
  triggerVariant = "default",
}: DebtSettlementOptionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<DebtSettlementOptionKind>(option?.kind ?? "cash");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditMode = Boolean(option);
  const installmentsDefault =
    option?.kind === "installment" ? option.installments : kind === "cash" ? 1 : 3;
  const upfrontDefault =
    option?.kind === "installment"
      ? option.upfrontAmountCents
      : option?.kind === "cash"
        ? kind === "cash"
          ? option.totalAmountCents
          : null
        : null;
  const monthlyInstallmentDefault =
    option?.kind === "installment" ? option.monthlyInstallmentCents : null;

  useEffect(() => {
    if (open) {
      setKind(option?.kind ?? "cash");
      setError(null);
    }
  }, [open, option?.kind]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size="sm">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar opção de liquidação" : "Nova opção de liquidação"}</DialogTitle>
          <DialogDescription>
            Cadastre opções à vista ou parceladas dentro da própria dívida. O simulador vai usar
            isso como base mais tarde.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            formData.set("debtId", debtId);
            if (option?.id) {
              formData.set("optionId", option.id);
            }

            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.error ?? "Não foi possível salvar a opção.");
                return;
              }

              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="debtId" value={debtId} />
          {option?.id ? <input type="hidden" name="optionId" value={option.id} /> : null}
          {kind === "cash" ? <input type="hidden" name="installments" value="1" /> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Dados da liquidação</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kind">Tipo</Label>
                <select
                  id="kind"
                  name="kind"
                  value={kind}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  onChange={(event) => setKind(event.target.value as DebtSettlementOptionKind)}
                  required
                >
                  <option value="cash">À vista</option>
                  <option value="installment">Parcelado</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  name="installments"
                  type="number"
                  min={1}
                  defaultValue={installmentsDefault}
                  disabled={kind === "cash"}
                />
                <p className="text-xs text-muted-foreground">
                  {kind === "cash"
                    ? "Opção à vista deve permanecer com 1 parcela."
                    : "Use 3x, 6x, 12x ou a quantidade que fizer sentido."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Valor total</Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  defaultValue={moneyToInput(option?.totalAmountCents)}
                  placeholder="Ex.: R$ 1.200,00"
                  inputMode="decimal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upfrontAmount">Entrada</Label>
                <Input
                  id="upfrontAmount"
                  name="upfrontAmount"
                  defaultValue={moneyToInput(upfrontDefault)}
                  placeholder="Ex.: R$ 200,00"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Para opções à vista, o desembolso imediato será igual ao valor total.
                </p>
              </div>

              {kind === "installment" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyInstallment">Valor da parcela</Label>
                    <Input
                      id="monthlyInstallment"
                      name="monthlyInstallment"
                      defaultValue={moneyToInput(monthlyInstallmentDefault)}
                      placeholder="Ex.: R$ 250,00"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstDueDate">Primeira parcela</Label>
                    <Input
                      id="firstDueDate"
                      name="firstDueDate"
                      type="date"
                      defaultValue={normalizeDateOnly(option?.firstDueDate) ?? getLocalDateInputValue()}
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="validUntil">Validade (opcional)</Label>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  defaultValue={normalizeDateOnly(option?.validUntil) ?? ""}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={option?.notes ?? ""}
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
              {isPending ? "Salvando..." : isEditMode ? "Salvar opção" : "Criar opção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DebtSettlementOptionsSection({
  debtId,
  options,
  saveAction,
  archiveAction,
  acceptAction,
}: DebtSettlementOptionSectionProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Opções de liquidação</CardTitle>
            <CardDescription>
              Cadastre cenários à vista ou parcelados dentro da dívida. O simulador usará isso como
              base nas próximas etapas.
            </CardDescription>
          </div>

          <DebtSettlementOptionFormDialog
            debtId={debtId}
            action={saveAction}
            triggerLabel="Nova opção"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            Nenhuma opção de liquidação cadastrada ainda.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {options.map((option) => {
              const accentClass =
                option.status === "accepted"
                  ? "border-emerald-300/80 bg-emerald-50/40"
                  : option.status === "expired"
                    ? "border-amber-300/80 bg-amber-50/40"
                    : "border-border/80";

              return (
                <article key={option.id} className={`rounded-xl border p-4 shadow-sm ${accentClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{getOptionTitle(option)}</h3>
                        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px]">
                          {getKindLabel(option.kind)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{getOptionSubtitle(option)}</p>
                    </div>
                    <Badge variant={getStatusVariant(option.status)}>{getStatusLabel(option.status)}</Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Valor total
                      </p>
                      <p className="font-medium">{formatBRL(option.totalAmountCents)}</p>
                    </div>

                    {option.kind === "cash" ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Desembolso imediato
                        </p>
                        <p className="font-medium">{formatBRL(option.upfrontAmountCents)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Entrada
                        </p>
                        <p className="font-medium">
                          {option.upfrontAmountCents > 0 ? formatBRL(option.upfrontAmountCents) : "—"}
                        </p>
                      </div>
                    )}

                    {option.kind === "installment" ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Valor da parcela
                        </p>
                        <p className="font-medium">
                          {typeof option.monthlyInstallmentCents === "number"
                            ? formatBRL(option.monthlyInstallmentCents)
                            : "—"}
                        </p>
                      </div>
                    ) : null}

                    {option.kind === "installment" ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Primeira parcela
                        </p>
                        <p className="font-medium">
                          {option.firstDueDate ? formatDateOnlyBR(option.firstDueDate) : "—"}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Validade</p>
                      <p className="font-medium">{option.validUntil ? formatDateOnlyBR(option.validUntil) : "—"}</p>
                    </div>
                  </div>

                  {option.notes ? (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Observações
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{option.notes}</p>
                      </div>
                    </>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <DebtSettlementOptionFormDialog
                      debtId={debtId}
                      action={saveAction}
                      option={option}
                      triggerLabel="Editar"
                      triggerVariant="outline"
                    />
                    <OptionActionButtons
                      debtId={debtId}
                      option={option}
                      archiveAction={archiveAction}
                      acceptAction={acceptAction}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
