import { formatBRL } from "@/lib/calculations";
import { normalizeDateOnly } from "@/lib/date-utils";
import { getStatementEntryHref } from "@/lib/statement";

export type ReconciliationItemType = "income" | "expense";

export type ReconciliationOriginType =
  | "monthly_income_entry_linked"
  | "monthly_income_entry_one_time"
  | "future_income_receivable"
  | "monthly_expense_entry_linked"
  | "monthly_expense_entry_one_time"
  | "future_expense_payable";

export type ReconciliationItem = {
  id: string;
  type: ReconciliationItemType;
  date: string;
  periodMonth: string;
  title: string;
  amountCents: number;
  category: string;
  categoryLabel: string;
  originType: ReconciliationOriginType;
  originLabel: string;
  href?: string;
  notes?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type ReconciliationSuspect = {
  id: string;
  title: string;
  date: string;
  amountCents: number;
  categoryLabel: string;
  originLabel: string;
  href?: string;
  reason: string;
  score: number;
};

export type ReconciliationSummary = {
  periodMonth: string;
  cutoffDate: string;
  bankBalanceCents: number | null;
  cockpitBalanceCents: number;
  differenceCents: number | null;
  openingBalanceCents: number;
  realizedIncomeCents: number;
  realizedExpenseCents: number;
  calculatedClosingBalanceCents: number;
  openingBalanceSourceLabel: string;
  items: ReconciliationItem[];
  suspects: ReconciliationSuspect[];
};

const RECENT_WINDOW_DAYS = 30;

const MONTHLY_INCOME_ORIGIN_LABELS: Record<Extract<
  ReconciliationOriginType,
  "monthly_income_entry_linked" | "monthly_income_entry_one_time" | "future_income_receivable"
>, string> = {
  monthly_income_entry_linked: "Entrada planejada",
  monthly_income_entry_one_time: "Entrada avulsa",
  future_income_receivable: "Entrada futura",
};

const MONTHLY_EXPENSE_ORIGIN_LABELS: Record<Extract<
  ReconciliationOriginType,
  "monthly_expense_entry_linked" | "monthly_expense_entry_one_time" | "future_expense_payable"
>, string> = {
  monthly_expense_entry_linked: "Gasto planejado",
  monthly_expense_entry_one_time: "Gasto avulso",
  future_expense_payable: "Gasto futuro",
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return new Date(`${normalized}T00:00:00`);
}

function toDateTimeMs(value: string | Date | null | undefined): number | null {
  const date = toDate(value);
  return date ? date.getTime() : null;
}

function isWithinDaysOfCutoff(
  value: string | Date | null | undefined,
  cutoffDate: string,
  days: number = RECENT_WINDOW_DAYS
): boolean {
  const valueMs = toDateTimeMs(value);
  const cutoffMs = toDateTimeMs(`${cutoffDate}T23:59:59`);

  if (valueMs === null || cutoffMs === null) return false;
  if (valueMs > cutoffMs) return false;

  const diffDays = (cutoffMs - valueMs) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export function getReconciliationOriginLabel(
  originType: ReconciliationOriginType
): string {
  if (originType in MONTHLY_INCOME_ORIGIN_LABELS) {
    return MONTHLY_INCOME_ORIGIN_LABELS[
      originType as keyof typeof MONTHLY_INCOME_ORIGIN_LABELS
    ];
  }

  return MONTHLY_EXPENSE_ORIGIN_LABELS[
    originType as keyof typeof MONTHLY_EXPENSE_ORIGIN_LABELS
  ];
}

export function getReconciliationItemHref(
  originType: ReconciliationOriginType,
  id: string
): string {
  if (originType === "future_expense_payable") {
    return "/expenses/future";
  }

  if (originType === "future_income_receivable") {
    return "/incomes/future";
  }

  const statementOriginType =
    originType === "monthly_income_entry_linked" ||
    originType === "monthly_income_entry_one_time"
      ? "monthly_income_entry"
      : "monthly_expense_entry";

  return getStatementEntryHref(statementOriginType, id);
}

export function getReconciliationDifferenceMessage(
  differenceCents: number | null
): string {
  if (differenceCents === null) {
    return "Informe o saldo real do banco para comparar com o Cockpit.";
  }

  if (differenceCents === 0) {
    return "O saldo bateu com o banco.";
  }

  if (differenceCents > 0) {
    return `O Cockpit está ${formatBRL(differenceCents)} acima do banco. Procure gasto faltando, entrada duplicada ou saldo inicial maior do que deveria.`;
  }

  return `O Cockpit está ${formatBRL(Math.abs(differenceCents))} abaixo do banco. Procure entrada faltando, gasto duplicado ou saldo inicial menor do que deveria.`;
}

export function buildReconciliationSuspects(
  items: ReconciliationItem[],
  differenceCents: number | null,
  cutoffDate: string,
  periodMonth: string
): ReconciliationSuspect[] {
  if (differenceCents === null || differenceCents === 0) {
    return [];
  }

  const targetAmount = Math.abs(differenceCents);
  const approximateTolerance = Math.round(targetAmount * 0.05);
  const candidates = new Map<string, ReconciliationSuspect>();

  for (const item of items) {
    let score = 0;
    const reasons: string[] = [];
    const amountDelta = Math.abs(item.amountCents - targetAmount);

    if (item.amountCents === targetAmount) {
      score += 100;
      reasons.push("Valor exato da diferença");
    } else if (targetAmount > 0 && amountDelta <= approximateTolerance) {
      score += 80;
      reasons.push("Valor próximo da diferença");
    }

    if (isWithinDaysOfCutoff(item.createdAt ?? item.updatedAt ?? item.date, cutoffDate)) {
      score += 40;
      reasons.push("Criado ou alterado recentemente");
    }

    if (item.periodMonth !== periodMonth && isWithinDaysOfCutoff(item.date, cutoffDate)) {
      score += 20;
      reasons.push("Fora do mês selecionado, mas recente");
    }

    if (reasons.length === 0) {
      continue;
    }

    const key = `${item.originType}:${item.id}`;
    const existing = candidates.get(key);
    if (!existing || existing.score < score) {
      candidates.set(key, {
        id: item.id,
        title: item.title,
        date: item.date,
        amountCents: item.amountCents,
        categoryLabel: item.categoryLabel,
        originLabel: item.originLabel,
        href: item.href,
        reason: reasons.join(" • "),
        score,
      });
    }
  }

  return [...candidates.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      return right.amountCents - left.amountCents;
    })
    .slice(0, 10);
}

export function buildReconciliationSummary(input: {
  periodMonth: string;
  cutoffDate: string;
  bankBalanceCents: number | null;
  openingBalanceCents: number;
  items: ReconciliationItem[];
  allItems?: ReconciliationItem[];
  openingBalanceSourceLabel: string;
}): ReconciliationSummary {
  const realizedIncomeCents = input.items
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const realizedExpenseCents = input.items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amountCents, 0);

  const calculatedClosingBalanceCents =
    input.openingBalanceCents + realizedIncomeCents - realizedExpenseCents;
  const cockpitBalanceCents = calculatedClosingBalanceCents;
  const differenceCents =
    input.bankBalanceCents === null ? null : cockpitBalanceCents - input.bankBalanceCents;

  return {
    periodMonth: input.periodMonth,
    cutoffDate: input.cutoffDate,
    bankBalanceCents: input.bankBalanceCents,
    cockpitBalanceCents,
    differenceCents,
    openingBalanceCents: input.openingBalanceCents,
    realizedIncomeCents,
    realizedExpenseCents,
    calculatedClosingBalanceCents,
    openingBalanceSourceLabel: input.openingBalanceSourceLabel,
    items: input.items,
    suspects: buildReconciliationSuspects(
      input.allItems ?? input.items,
      differenceCents,
      input.cutoffDate,
      input.periodMonth
    ),
  };
}
