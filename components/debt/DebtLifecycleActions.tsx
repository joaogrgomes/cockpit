"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/calculations";
import { formatDateOnlyBR, getLocalDateInputValue, normalizeDateOnly } from "@/lib/date-utils";
import { PAYMENT_METHOD_VALUES } from "@/lib/db/schema";
import { getPaymentMethodLabel } from "@/lib/expenses";
import type { Debt } from "@/types";

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

type DebtLifecycleActionsProps = {
  debt: Debt;
  suggestedPaidAmount: number;
  canMarkAsPaid: boolean;
  canConfirmClearance: boolean;
  canArchive: boolean;
  markDebtAsPaidAction: (formData: FormData) => Promise<DebtActionResult>;
  confirmDebtClearanceAction: (formData: FormData) => Promise<DebtActionResult>;
  archiveDebtAction: (formData: FormData) => Promise<DebtActionResult>;
};

function addDaysToLocalDateInput(date: Date, days: number): string {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return normalizeDateOnly(next) ?? "";
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function DebtLifecycleActions({
  debt,
  suggestedPaidAmount,
  canMarkAsPaid,
  canConfirmClearance,
  canArchive,
  markDebtAsPaidAction,
  confirmDebtClearanceAction,
  archiveDebtAction,
}: DebtLifecycleActionsProps) {
  const router = useRouter();
  const todayInput = useMemo(() => getLocalDateInputValue(), []);
  const clearanceDueDefault = useMemo(() => addDaysToLocalDateInput(new Date(), 7), []);

  const [paidOpen, setPaidOpen] = useState(false);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [isPaidPending, startPaidTransition] = useTransition();

  const [clearanceOpen, setClearanceOpen] = useState(false);
  const [clearanceError, setClearanceError] = useState<string | null>(null);
  const [isClearancePending, startClearanceTransition] = useTransition();

  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchivePending, startArchiveTransition] = useTransition();

  const hasPaymentInfo =
    debt.paidAt ||
    typeof debt.paidAmount === "number" ||
    debt.paymentMethod ||
    debt.clearanceDueDate ||
    debt.clearedAt ||
    debt.archivedAt ||
    debt.paymentNotes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canMarkAsPaid ? (
          <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="default">
                  Marcar como paga
                </Button>
              }
            />
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Marcar como paga</DialogTitle>
                <DialogDescription>
                  Registre o pagamento e, se quiser, anexe o comprovante. A dívida entrará em acompanhamento de baixa.
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPaidError(null);
                  const formData = new FormData(event.currentTarget);

                  startPaidTransition(async () => {
                    const result = await markDebtAsPaidAction(formData);
                    if (!result.ok) {
                      setPaidError(result.error ?? "Não foi possível registrar o pagamento.");
                      return;
                    }

                    setPaidOpen(false);
                    router.refresh();
                  });
                }}
              >
                <input type="hidden" name="debtId" value={debt.id} />
                <input type="hidden" name="attachmentType" value="payment_receipt" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paidAt">Data do pagamento</Label>
                    <Input id="paidAt" name="paidAt" type="date" defaultValue={todayInput} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount">Valor pago</Label>
                    <Input
                      id="paidAmount"
                      name="paidAmount"
                      defaultValue={formatBRL(suggestedPaidAmount)}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Método de pagamento</Label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      defaultValue=""
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {PAYMENT_METHOD_VALUES.map((method) => (
                        <option key={method} value={method}>
                          {getPaymentMethodLabel(method)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clearanceDueDate">Previsão de baixa</Label>
                    <Input
                      id="clearanceDueDate"
                      name="clearanceDueDate"
                      type="date"
                      defaultValue={clearanceDueDefault}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="paymentNotes">Observação</Label>
                    <Textarea
                      id="paymentNotes"
                      name="paymentNotes"
                      placeholder="Comprovante, combinado com o credor, observações do pagamento..."
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="attachmentFile">Comprovante</Label>
                    <Input
                      id="attachmentFile"
                      name="attachmentFile"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                    />
                  </div>
                </div>

                {paidError ? <p className="text-sm text-destructive">{paidError}</p> : null}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPaidOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPaidPending}>
                    {isPaidPending ? "Salvando..." : "Confirmar pagamento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}

        {canConfirmClearance ? (
          <Dialog open={clearanceOpen} onOpenChange={setClearanceOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline">
                  Confirmar baixa
                </Button>
              }
            />
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Confirmar baixa</DialogTitle>
                <DialogDescription>
                  Use quando o credor/Serasa efetivamente regularizar a situação.
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setClearanceError(null);
                  const formData = new FormData(event.currentTarget);

                  startClearanceTransition(async () => {
                    const result = await confirmDebtClearanceAction(formData);
                    if (!result.ok) {
                      setClearanceError(result.error ?? "Não foi possível confirmar a baixa.");
                      return;
                    }

                    setClearanceOpen(false);
                    router.refresh();
                  });
                }}
              >
                <input type="hidden" name="debtId" value={debt.id} />
                <input type="hidden" name="attachmentType" value="serasa_clearance" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clearedAt">Data da baixa</Label>
                    <Input id="clearedAt" name="clearedAt" type="date" defaultValue={todayInput} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="paymentNotes">Observação</Label>
                    <Textarea
                      id="paymentNotes"
                      name="paymentNotes"
                      placeholder="Confirmação do credor, protocolo, detalhes da baixa..."
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="attachmentFile">Comprovante de baixa</Label>
                    <Input
                      id="attachmentFile"
                      name="attachmentFile"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                    />
                  </div>
                </div>

                {clearanceError ? <p className="text-sm text-destructive">{clearanceError}</p> : null}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setClearanceOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isClearancePending}>
                    {isClearancePending ? "Salvando..." : "Confirmar baixa"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}

        {canArchive ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button size="sm" variant="secondary">
                  Arquivar dívida
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Arquivar dívida?</AlertDialogTitle>
                <AlertDialogDescription>
                  A dívida sairá da lista principal, mas o histórico, anexos e propostas permanecerão preservados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {archiveError ? <p className="text-sm text-destructive">{archiveError}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isArchivePending}
                  onClick={() => {
                    setArchiveError(null);
                    startArchiveTransition(async () => {
                      const formData = new FormData();
                      formData.set("debtId", debt.id);
                      const result = await archiveDebtAction(formData);
                      if (!result.ok) {
                        setArchiveError(result.error ?? "Não foi possível arquivar.");
                        return;
                      }

                      router.refresh();
                    });
                  }}
                >
                  {isArchivePending ? "Arquivando..." : "Confirmar arquivamento"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {hasPaymentInfo ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {debt.paidAt ? <Badge variant="outline">Pago em {formatDateOnlyBR(debt.paidAt)}</Badge> : null}
          {typeof debt.paidAmount === "number" ? (
            <Badge variant="outline">Valor pago {formatBRL(debt.paidAmount)}</Badge>
          ) : null}
          {debt.paymentMethod ? (
            <Badge variant="outline">Pagamento {getPaymentMethodLabel(debt.paymentMethod)}</Badge>
          ) : null}
          {debt.clearanceDueDate ? (
            <Badge variant="outline">Baixa prevista {formatDateOnlyBR(debt.clearanceDueDate)}</Badge>
          ) : null}
          {debt.clearedAt ? <Badge variant="outline">Baixada em {formatDateOnlyBR(debt.clearedAt)}</Badge> : null}
          {debt.archivedAt ? <Badge variant="outline">Arquivada em {formatDateTime(debt.archivedAt)}</Badge> : null}
          </div>
          {debt.paymentNotes ? (
            <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
              {debt.paymentNotes}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
