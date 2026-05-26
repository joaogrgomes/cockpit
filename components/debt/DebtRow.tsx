"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { calcAdditions, calcGrowthPct, formatBRL } from "@/lib/calculations";
import { DEBT_STATUS_VALUES } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { Debt, DebtStatus } from "@/types";
import { DebtForm } from "./DebtForm";
import { PriorityBadge } from "./PriorityBadge";
import { ProposalBadge } from "./ProposalBadge";
import { StatusBadge } from "./StatusBadge";

type DebtActionResult = {
  ok: boolean;
  error?: string;
};

type DebtRowProps = {
  debt: Debt & { hasActiveProposal: boolean };
  updateAction: (formData: FormData) => Promise<DebtActionResult>;
  deleteAction: (formData: FormData) => Promise<DebtActionResult>;
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toDebtStatus(value: string): DebtStatus {
  if (DEBT_STATUS_VALUES.includes(value as DebtStatus)) {
    return value as DebtStatus;
  }

  return "em_aberto";
}

export function DebtRow({ debt, updateAction, deleteAction }: DebtRowProps) {
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const additions =
    typeof debt.originalValue === "number"
      ? calcAdditions(debt.currentValue, debt.originalValue)
      : null;
  const growthPct =
    typeof debt.originalValue === "number"
      ? calcGrowthPct(debt.currentValue, debt.originalValue)
      : null;
  const growthLabel =
    typeof growthPct === "number" ? `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%` : null;

  return (
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="py-3 font-medium text-foreground">{debt.name}</TableCell>
      <TableCell className="py-3 text-muted-foreground">{debt.creditor}</TableCell>
      <TableCell className="py-3 text-muted-foreground">{debt.type}</TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={toDebtStatus(debt.status)} />
          {debt.hasActiveProposal ? <ProposalBadge /> : null}
        </div>
      </TableCell>
      <TableCell className="py-3 font-medium">{formatBRL(debt.currentValue)}</TableCell>
      <TableCell className="py-3">
        {typeof additions === "number" ? (
          <span className="text-sm">{`${additions >= 0 ? "+" : ""}${formatBRL(additions)}`}</span>
        ) : null}
      </TableCell>
      <TableCell className="py-3 text-sm">{growthLabel}</TableCell>
      <TableCell className="py-3">
        <PriorityBadge priority={debt.priority} />
      </TableCell>
      <TableCell className="py-3 text-xs text-muted-foreground">{formatDateTime(debt.lastUpdatedAt)}</TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/debts/${debt.id}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-underline")}
          >
            Ver detalhe
          </Link>

          <DebtForm mode="edit" debt={debt} action={updateAction} />

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm">
                  Excluir
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir dívida?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove a dívida e dados relacionados em cascata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={() => {
                    setDeleteError(null);
                    startDelete(async () => {
                      const formData = new FormData();
                      formData.set("id", debt.id);
                      const result = await deleteAction(formData);
                      if (!result.ok) {
                        setDeleteError(result.error ?? "Falha ao excluir dívida.");
                        return;
                      }

                      router.refresh();
                    });
                  }}
                >
                  {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
