import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { normalizeDateOnly } from "@/lib/date-utils";
import { getDb } from "@/lib/db";
import { debtProposals, debts } from "@/lib/db/schema";
import { calcDiscountPct, calcDiscountValue } from "@/lib/calculations";
import type { DebtProposal, NewDebtProposal } from "@/types";

export type ProposalCreateInput = Pick<
  NewDebtProposal,
  "debtId" | "proposedValue" | "proposedAt" | "expiresAt" | "origin" | "notes"
>;

export type ProposalCreateResult =
  | { ok: true; proposal: DebtProposal }
  | { ok: false; code: "DEBT_NOT_FOUND" | "INVALID_PROPOSED_VALUE" | "UNIQUE_ACTIVE_CONFLICT" | "UNKNOWN_ERROR"; message: string };

export type ProposalViewModel = DebtProposal & {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  discountValue: number;
  discountPct: number | null;
};

function parseDateOnly(value: string | Date | null): Date | null {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return null;

  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  if ([year, month, day].some(Number.isNaN)) return null;

  return new Date(year, month - 1, day);
}

export function getDaysUntilExpiry(expiresAt: string | Date | null): number | null {
  if (!expiresAt) return null;
  const expiryDate = parseDateOnly(expiresAt);
  if (!expiryDate) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const diffMs = expiry.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function isProposalExpired(status: string, expiresAt: string | Date | null): boolean {
  if (status !== "ativa") return false;
  const days = getDaysUntilExpiry(expiresAt);
  return days !== null && days < 0;
}

export function mapProposalToViewModel(
  proposal: DebtProposal,
  currentDebtValue: number
): ProposalViewModel {
  const daysUntilExpiry = getDaysUntilExpiry(proposal.expiresAt);
  const expired = isProposalExpired(proposal.status, proposal.expiresAt);

  return {
    ...proposal,
    isExpired: expired,
    isExpiringSoon:
      proposal.status === "ativa" &&
      !expired &&
      daysUntilExpiry !== null &&
      daysUntilExpiry <= 7,
    daysUntilExpiry,
    discountValue: calcDiscountValue(currentDebtValue, proposal.proposedValue),
    discountPct: calcDiscountPct(currentDebtValue, proposal.proposedValue),
  };
}

export async function listProposalsByDebtId(debtId: string): Promise<DebtProposal[]> {
  const db = getDb();
  return db
    .select()
    .from(debtProposals)
    .where(eq(debtProposals.debtId, debtId))
    .orderBy(asc(debtProposals.proposedAt), asc(debtProposals.createdAt));
}

export async function getActiveProposalByDebtId(debtId: string): Promise<DebtProposal | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(debtProposals)
    .where(
      and(
        eq(debtProposals.debtId, debtId),
        eq(debtProposals.status, "ativa"),
        sql`${debtProposals.expiresAt} IS NULL OR ${debtProposals.expiresAt} >= CURRENT_DATE`
      )
    )
    .orderBy(desc(debtProposals.proposedAt), desc(debtProposals.createdAt))
    .limit(1);

  return result[0] ?? null;
}

export async function createActiveProposal(input: ProposalCreateInput): Promise<ProposalCreateResult> {
  const db = getDb();

  const debt = await db
    .select({ id: debts.id, currentValue: debts.currentValue })
    .from(debts)
    .where(eq(debts.id, input.debtId))
    .limit(1);

  const debtRow = debt[0];
  if (!debtRow) {
    return { ok: false, code: "DEBT_NOT_FOUND", message: "Dívida não encontrada." };
  }

  if (input.proposedValue >= debtRow.currentValue) {
    return {
      ok: false,
      code: "INVALID_PROPOSED_VALUE",
      message: "A proposta deve ser menor que o valor atual da dívida.",
    };
  }

  try {
    const created = await db.transaction(async (tx) => {
      await tx
        .update(debtProposals)
        .set({ status: "substituida" })
        .where(and(eq(debtProposals.debtId, input.debtId), eq(debtProposals.status, "ativa")));

      const inserted = await tx
        .insert(debtProposals)
        .values({
          debtId: input.debtId,
          proposedValue: input.proposedValue,
          proposedAt: input.proposedAt,
          expiresAt: input.expiresAt ?? null,
          origin: input.origin ?? null,
          notes: input.notes ?? null,
          status: "ativa",
        })
        .returning();

      await tx
        .update(debts)
        .set({ lastUpdatedAt: sql`now()` })
        .where(eq(debts.id, input.debtId));

      return inserted[0];
    });

    return { ok: true, proposal: created };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return {
        ok: false,
        code: "UNIQUE_ACTIVE_CONFLICT",
        message: "Já existe proposta ativa para esta dívida. Tente novamente.",
      };
    }

    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "Não foi possível criar a proposta.",
    };
  }
}
