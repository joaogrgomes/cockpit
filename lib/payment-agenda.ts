import { normalizeDateOnly } from "@/lib/date-utils";
import { getDebtTypeLabel } from "@/lib/debt-type";
import { getExpenseCategoryLabel } from "@/lib/expenses";
import { getDueDateFromPeriodMonth } from "@/lib/expense-tracking";
import { isMonthWithinPeriod } from "@/lib/recurrence-period";

export const PAYMENT_AGENDA_SOURCE_TYPES = [
  "future_expense",
  "monthly_expense",
  "debt_proposal",
  "debt_due",
  "debt_clearance",
] as const;

export const PAYMENT_AGENDA_BUCKET_KEYS = ["today", "tomorrow", "week", "next"] as const;

export type PaymentAgendaSourceType = (typeof PAYMENT_AGENDA_SOURCE_TYPES)[number];
export type PaymentAgendaBucketKey = (typeof PAYMENT_AGENDA_BUCKET_KEYS)[number];

export type PaymentAgendaItem = {
  id: string;
  sourceType: PaymentAgendaSourceType;
  title: string;
  amountCents: number;
  dueDate: string;
  status: string;
  category: string;
  paymentMethod: string | null;
  paymentCode: string | null;
  notes: string | null;
  href: string;
};

export type PaymentAgendaBucket = {
  key: PaymentAgendaBucketKey;
  label: string;
  description: string;
  items: PaymentAgendaItem[];
  count: number;
  totalAmountCents: number;
};

export type PaymentAgendaViewModel = {
  referenceDate: string;
  items: PaymentAgendaItem[];
  totalCount: number;
  totalAmountCents: number;
  buckets: Record<PaymentAgendaBucketKey, PaymentAgendaBucket>;
};

const PAYMENT_AGENDA_SOURCE_LABELS: Record<PaymentAgendaSourceType, string> = {
  future_expense: "Gasto futuro",
  monthly_expense: "Despesa mensal",
  debt_proposal: "Proposta de dívida",
  debt_due: "Dívida a pagar",
  debt_clearance: "Aguardando baixa",
};

const PAYMENT_AGENDA_SOURCE_ACTION_LABELS: Record<PaymentAgendaSourceType, string> = {
  future_expense: "Abrir gastos futuros",
  monthly_expense: "Abrir acompanhamento",
  debt_proposal: "Abrir dívida",
  debt_due: "Abrir dívida",
  debt_clearance: "Abrir dívida",
};

const PAYMENT_AGENDA_BUCKET_LABELS: Record<PaymentAgendaBucketKey, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  week: "Esta semana",
  next: "Próximos vencimentos",
};

const PAYMENT_AGENDA_BUCKET_DESCRIPTIONS: Record<PaymentAgendaBucketKey, string> = {
  today: "Itens que vencem agora ou já passaram do prazo.",
  tomorrow: "Itens com vencimento no próximo dia útil da agenda.",
  week: "Compromissos previstos até o fim da semana atual.",
  next: "Compromissos que vêm depois desta semana.",
};

const DEBT_STATUS_LABELS: Record<string, string> = {
  em_aberto: "Em aberto",
  em_atraso: "Em atraso",
  em_negociacao: "Em negociação",
  parcelada: "Parcelada",
  quitada: "Quitada",
  aguardando_baixa: "Aguardando baixa",
  baixada: "Baixada",
  arquivada: "Arquivada",
  suspensa: "Suspensa",
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  expirada: "Expirada",
  recusada: "Recusada",
  aceita: "Aceita",
  substituida: "Substituída",
};

const MONTHLY_EXPENSE_STATUS_LABELS: Record<string, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  esta_semana: "Esta semana",
  proximo: "Próximo",
};

function toLocalDate(value: string | Date): Date {
  if (typeof value === "string") {
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number.parseInt(yearText, 10);
    const month = Number.parseInt(monthText, 10);
    const day = Number.parseInt(dayText, 10);
    return new Date(year, month - 1, day);
  }

  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function compareDateOnly(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function addDaysDateOnly(dateOnly: string, days: number): string | null {
  const normalized = normalizeDateOnly(dateOnly);
  if (!normalized) return null;

  const date = toLocalDate(normalized);
  date.setDate(date.getDate() + days);
  return normalizeDateOnly(date);
}

function getMonthLastDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getPaymentAgendaReferenceDate(referenceDate: Date = new Date()): string {
  return normalizeDateOnly(referenceDate) ?? "";
}

export function getPaymentAgendaSourceLabel(sourceType: PaymentAgendaSourceType): string {
  return PAYMENT_AGENDA_SOURCE_LABELS[sourceType];
}

export function getPaymentAgendaSourceActionLabel(sourceType: PaymentAgendaSourceType): string {
  return PAYMENT_AGENDA_SOURCE_ACTION_LABELS[sourceType];
}

export function getPaymentAgendaStatusLabel(
  sourceType: PaymentAgendaSourceType,
  status: string
): string {
  if (sourceType === "debt_proposal") {
    return PROPOSAL_STATUS_LABELS[status] ?? status;
  }

  if (sourceType === "monthly_expense") {
    return MONTHLY_EXPENSE_STATUS_LABELS[status] ?? status;
  }

  if (sourceType === "future_expense") {
    if (status === "previsto") return "Previsto";
    if (status === "realizado") return "Realizado";
    if (status === "cancelado") return "Cancelado";
    return status;
  }

  return DEBT_STATUS_LABELS[status] ?? status;
}

export function getPaymentAgendaStatusBadgeVariant(
  sourceType: PaymentAgendaSourceType,
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (sourceType === "future_expense") {
    if (status === "cancelado") return "destructive";
    if (status === "realizado") return "secondary";
    return "outline";
  }

  if (sourceType === "monthly_expense") {
    if (status === "atrasado") return "destructive";
    if (status === "hoje") return "default";
    if (status === "esta_semana") return "secondary";
    return "outline";
  }

  if (sourceType === "debt_proposal") {
    if (status === "ativa") return "default";
    if (status === "expirada" || status === "recusada") return "destructive";
    if (status === "aceita") return "secondary";
    return "outline";
  }

  if (status === "em_atraso") return "destructive";
  if (status === "aguardando_baixa" || status === "baixada") return "secondary";
  if (status === "arquivada" || status === "suspensa") return "outline";

  return "default";
}

export function getPaymentAgendaDateBadgeLabel(
  dueDate: string,
  referenceDate: string
): string {
  if (compareDateOnly(dueDate, referenceDate) < 0) {
    return "Vencido";
  }

  if (compareDateOnly(dueDate, referenceDate) === 0) {
    return "Hoje";
  }

  return "A vencer";
}

export function getPaymentAgendaItemBucketKey(
  dueDate: string,
  referenceDate: string
): PaymentAgendaBucketKey {
  const tomorrow = addDaysDateOnly(referenceDate, 1);
  const weekEnd = getEndOfWeekDateOnly(referenceDate);

  if (compareDateOnly(dueDate, referenceDate) <= 0) {
    return "today";
  }

  if (tomorrow && compareDateOnly(dueDate, tomorrow) === 0) {
    return "tomorrow";
  }

  if (weekEnd && compareDateOnly(dueDate, weekEnd) <= 0) {
    return "week";
  }

  return "next";
}

export function getPaymentAgendaWindow(
  referenceDate: string = getPaymentAgendaReferenceDate()
): { startDate: string; endDate: string } {
  const endDate = addDaysDateOnly(referenceDate, 7) ?? referenceDate;

  return {
    startDate: referenceDate,
    endDate,
  };
}

export function filterPaymentAgendaItemsByWindow(
  items: PaymentAgendaItem[],
  referenceDate: string = getPaymentAgendaReferenceDate()
): PaymentAgendaItem[] {
  const { endDate } = getPaymentAgendaWindow(referenceDate);
  return items.filter((item) => compareDateOnly(item.dueDate, endDate) <= 0);
}

export function getEndOfWeekDateOnly(referenceDate: string = getPaymentAgendaReferenceDate()): string | null {
  const normalized = normalizeDateOnly(referenceDate);
  if (!normalized) return null;

  const date = toLocalDate(normalized);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  return addDaysDateOnly(normalized, daysUntilSunday);
}

export function computeDebtNextDueDate(
  dueDay: number,
  referenceDate: string = getPaymentAgendaReferenceDate()
): string | null {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return null;

  const normalized = normalizeDateOnly(referenceDate);
  if (!normalized) return null;

  const date = toLocalDate(normalized);
  const currentMonthLastDay = getMonthLastDay(date);
  const targetDay = Math.min(dueDay, currentMonthLastDay);
  const candidate = new Date(date.getFullYear(), date.getMonth(), targetDay);
  const candidateOnly = normalizeDateOnly(candidate);
  if (!candidateOnly) return null;

  if (compareDateOnly(candidateOnly, normalized) >= 0) {
    return candidateOnly;
  }

  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const nextMonthTargetDay = Math.min(dueDay, getMonthLastDay(nextMonth));
  return normalizeDateOnly(
    new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonthTargetDay)
  );
}

export function getPaymentAgendaItemHref(sourceType: PaymentAgendaSourceType, id: string): string {
  if (sourceType === "future_expense") {
    return "/expenses/future";
  }

  if (sourceType === "monthly_expense") {
    return `/expenses/tracking?month=${id}`;
  }

  return `/debts/${id}`;
}

export type MonthlyExpenseAgendaCandidate = {
  monthlyExpenseId: string;
  name: string;
  category: string;
  expenseType: string;
  dueDay: number | null;
  amount: number;
  startMonth: string;
  endMonth: string | null;
  isActive: boolean;
};

export function getMonthlyExpenseAgendaDueDate(
  periodMonth: string,
  dueDay: number | null
): string | null {
  if (typeof dueDay !== "number") {
    return null;
  }

  const dueDate = getDueDateFromPeriodMonth(periodMonth, dueDay);
  return dueDate ? normalizeDateOnly(dueDate) : null;
}

export function buildMonthlyExpenseAgendaItem(
  input: MonthlyExpenseAgendaCandidate & {
    periodMonth?: string;
    actualAmount: number;
    referenceDate?: string;
    dueDate?: string;
  }
): PaymentAgendaItem | null {
  if (!input.isActive) {
    return null;
  }

  const referenceDate = input.referenceDate ?? getPaymentAgendaReferenceDate();
  const dueDate = input.dueDate
    ? normalizeDateOnly(input.dueDate)
    : typeof input.dueDay === "number"
      ? getMonthlyExpenseAgendaDueDate(input.periodMonth ?? referenceDate.slice(0, 7), input.dueDay)
      : null;

  if (!dueDate) {
    return null;
  }

  if (!isMonthWithinPeriod(dueDate.slice(0, 7), input.startMonth, input.endMonth)) {
    return null;
  }

  if (input.actualAmount > 0) {
    return null;
  }

  const bucketKey = getPaymentAgendaItemBucketKey(dueDate, referenceDate);
  const status =
    dueDate < referenceDate
      ? "atrasado"
      : dueDate === referenceDate
        ? "hoje"
        : bucketKey === "tomorrow" || bucketKey === "week"
          ? "esta_semana"
          : "proximo";

  return {
    id: input.monthlyExpenseId,
    sourceType: "monthly_expense",
    title: input.name,
    amountCents: input.amount,
    dueDate,
    status,
    category: getPaymentAgendaCategoryLabel("monthly_expense", input.category),
    paymentMethod: null,
    paymentCode: null,
    notes: `Despesa mensal planejada${input.expenseType ? ` • ${input.expenseType}` : ""}`,
    href: getPaymentAgendaItemHref("monthly_expense", dueDate.slice(0, 7)),
  };
}

export function sortPaymentAgendaItems(items: PaymentAgendaItem[]): PaymentAgendaItem[] {
  const sourcePriority: Record<PaymentAgendaSourceType, number> = {
    future_expense: 0,
    monthly_expense: 1,
    debt_clearance: 2,
    debt_due: 3,
    debt_proposal: 4,
  };

  return [...items].sort((left, right) => {
    const dueComparison = compareDateOnly(left.dueDate, right.dueDate);
    if (dueComparison !== 0) return dueComparison;

    const sourceComparison = sourcePriority[left.sourceType] - sourcePriority[right.sourceType];
    if (sourceComparison !== 0) return sourceComparison;

    return left.title.localeCompare(right.title, "pt-BR");
  });
}

export function groupPaymentAgendaItems(
  items: PaymentAgendaItem[],
  referenceDate: string = getPaymentAgendaReferenceDate()
): PaymentAgendaViewModel {
  const sortedItems = sortPaymentAgendaItems(items.filter((item) => Boolean(item.dueDate)));

  const bucketEntries: Record<PaymentAgendaBucketKey, PaymentAgendaBucket> = {
    today: {
      key: "today",
      label: PAYMENT_AGENDA_BUCKET_LABELS.today,
      description: PAYMENT_AGENDA_BUCKET_DESCRIPTIONS.today,
      items: [],
      count: 0,
      totalAmountCents: 0,
    },
    tomorrow: {
      key: "tomorrow",
      label: PAYMENT_AGENDA_BUCKET_LABELS.tomorrow,
      description: PAYMENT_AGENDA_BUCKET_DESCRIPTIONS.tomorrow,
      items: [],
      count: 0,
      totalAmountCents: 0,
    },
    week: {
      key: "week",
      label: PAYMENT_AGENDA_BUCKET_LABELS.week,
      description: PAYMENT_AGENDA_BUCKET_DESCRIPTIONS.week,
      items: [],
      count: 0,
      totalAmountCents: 0,
    },
    next: {
      key: "next",
      label: PAYMENT_AGENDA_BUCKET_LABELS.next,
      description: PAYMENT_AGENDA_BUCKET_DESCRIPTIONS.next,
      items: [],
      count: 0,
      totalAmountCents: 0,
    },
  };

  for (const item of sortedItems) {
    const bucketKey = getPaymentAgendaItemBucketKey(item.dueDate, referenceDate);
    const bucket = bucketEntries[bucketKey];
    bucket.items.push(item);
    bucket.count += 1;
    bucket.totalAmountCents += item.amountCents;
  }

  const totalCount = sortedItems.length;
  const totalAmountCents = sortedItems.reduce((sum, item) => sum + item.amountCents, 0);

  return {
    referenceDate,
    items: sortedItems,
    totalCount,
    totalAmountCents,
    buckets: bucketEntries,
  };
}

export function getPaymentAgendaCategoryLabel(
  sourceType: PaymentAgendaSourceType,
  category: string
): string {
  if (sourceType === "future_expense" || sourceType === "monthly_expense") {
    return getExpenseCategoryLabel(category);
  }

  return getDebtTypeLabel(category);
}
