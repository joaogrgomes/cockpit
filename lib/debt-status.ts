import { and, ne } from "drizzle-orm";
import { debts } from "@/lib/db/schema";

export const DEBT_ACTIVE_STATUS_VALUES = [
  "em_aberto",
  "em_atraso",
  "em_negociacao",
  "parcelada",
  "suspensa",
] as const;

export const DEBT_POST_PAYMENT_STATUS_VALUES = [
  "aguardando_baixa",
  "baixada",
  "arquivada",
] as const;

export const DEBT_CLOSED_STATUS_VALUES = [
  "quitada",
  ...DEBT_POST_PAYMENT_STATUS_VALUES,
] as const;

export function isClosedDebtStatus(status: string): boolean {
  return DEBT_CLOSED_STATUS_VALUES.includes(status as (typeof DEBT_CLOSED_STATUS_VALUES)[number]);
}

export function isArchivedDebtStatus(status: string): boolean {
  return status === "arquivada";
}

export function buildExcludeClosedDebtStatusesCondition() {
  return and(
    ne(debts.status, "quitada"),
    ne(debts.status, "aguardando_baixa"),
    ne(debts.status, "baixada"),
    ne(debts.status, "arquivada")
  );
}

export function buildExcludeArchivedDebtStatusesCondition() {
  return ne(debts.status, "arquivada");
}
