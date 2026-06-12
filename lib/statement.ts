import { normalizeDateOnly } from "@/lib/date-utils";
import {
  EXPENSE_CATEGORY_VALUES,
  getExpenseCategoryLabel,
} from "@/lib/expenses";
import {
  INCOME_CATEGORY_VALUES,
  getIncomeCategoryLabel,
} from "@/lib/incomes";

export type StatementTypeFilter = "all" | "income" | "expense";
export type StatementKind = "income" | "expense";
export type StatementSource = "linked" | "one_time";
export type StatementOriginType = "monthly_income_entry" | "monthly_expense_entry";

export type StatementCategoryOption = {
  value: string;
  label: string;
};

export type StatementCategoryGroup = {
  label: string;
  options: StatementCategoryOption[];
};

export type StatementItem = {
  id: string;
  kind: StatementKind;
  source: StatementSource;
  date: string;
  periodMonth: string;
  description: string;
  category: string;
  categoryLabel: string;
  amount: number;
  signedAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  originId: string;
  originType: StatementOriginType;
  createdAt?: string | Date | null;
};

export type StatementEntryDetail = {
  id: string;
  originType: StatementOriginType;
  kind: StatementKind;
  source: StatementSource;
  periodMonth: string;
  description: string;
  category: string;
  categoryLabel: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
  expenseType: string | null;
  sourceLabel: string;
  linkedNotice: string | null;
  canEditDescription: boolean;
  canEditCategory: boolean;
  canEditExpenseType: boolean;
};

export type StatementEntryUpdateValues = {
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
  description?: string | null;
  category?: string | null;
  expenseType?: string | null;
};

export type StatementFilters = {
  type?: StatementTypeFilter;
  category?: string | null;
  query?: string | null;
};

export type StatementSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
};

export type StatementDayGroup = {
  date: string;
  items: StatementItem[];
  dailyBalance: number;
};

export type StatementResult = {
  periodMonth: string;
  items: StatementItem[];
  summary: StatementSummary;
};

export function isStatementOriginType(value: string): value is StatementOriginType {
  return value === "monthly_income_entry" || value === "monthly_expense_entry";
}

export function getStatementEntryHref(originType: StatementOriginType, id: string): string {
  return `/statement/${originType}/${id}`;
}

export function buildStatementEntryUpdateValues(
  detail: StatementEntryDetail,
  input: StatementEntryUpdateValues
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    date: input.date,
    periodMonth: input.date.slice(0, 7),
  };

  if (detail.canEditDescription) {
    values.description = input.description ?? null;
  }

  if (detail.canEditCategory) {
    values.category = input.category ?? null;
  }

  if (detail.canEditExpenseType) {
    values.expenseType = input.expenseType ?? null;
  }

  return values;
}

export type StatementIncomeRow = {
  id: string;
  monthlyIncomeId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  monthlyIncomeName: string | null;
  monthlyIncomeCategory: string | null;
  periodMonth: string;
  amount: number;
  receivedAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string | Date | null;
};

export type StatementExpenseRow = {
  id: string;
  monthlyExpenseId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  entryExpenseType: string | null;
  monthlyExpenseName: string | null;
  monthlyExpenseCategory: string | null;
  monthlyExpenseType: string | null;
  periodMonth: string;
  amount: number;
  paidAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string | Date | null;
};

const PERIOD_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function getCurrentPeriodMonth(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isValidPeriodMonth(value: string): boolean {
  return PERIOD_MONTH_REGEX.test(value);
}

export function normalizeStatementPeriodMonth(
  value: string | null | undefined,
  fallbackDate: Date = new Date()
): string {
  if (value && isValidPeriodMonth(value)) {
    return value;
  }

  return getCurrentPeriodMonth(fallbackDate);
}

export function normalizeStatementType(value: string | null | undefined): StatementTypeFilter {
  if (value === "income" || value === "expense") {
    return value;
  }

  return "all";
}

export function normalizeStatementCategory(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "all") {
    return null;
  }

  return trimmed;
}

export function normalizeStatementQuery(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getStatementCategoryLabel(kind: StatementKind, category: string): string {
  if (kind === "income") {
    return getIncomeCategoryLabel(category);
  }

  return getExpenseCategoryLabel(category);
}

export function getStatementCategoryGroups(): StatementCategoryGroup[] {
  return [
    {
      label: "Entradas",
      options: INCOME_CATEGORY_VALUES.map((value) => ({
        value,
        label: getIncomeCategoryLabel(value),
      })),
    },
    {
      label: "Gastos",
      options: EXPENSE_CATEGORY_VALUES.map((value) => ({
        value,
        label: getExpenseCategoryLabel(value),
      })),
    },
  ];
}

function getTimestampMs(value: string | Date | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareStatementItems(a: StatementItem, b: StatementItem): number {
  const dateA = normalizeDateOnly(a.date) ?? a.date;
  const dateB = normalizeDateOnly(b.date) ?? b.date;

  if (dateA !== dateB) {
    return dateA < dateB ? 1 : -1;
  }

  const aCreatedAt = a.createdAt ? getTimestampMs(a.createdAt) : null;
  const bCreatedAt = b.createdAt ? getTimestampMs(b.createdAt) : null;

  if (aCreatedAt !== null || bCreatedAt !== null) {
    if (aCreatedAt !== null && bCreatedAt !== null) {
      if (aCreatedAt !== bCreatedAt) {
        return bCreatedAt - aCreatedAt;
      }

      return 0;
    }

    return a.id.localeCompare(b.id);
  }

  return a.id.localeCompare(b.id);
}

export function sortStatementItems(items: StatementItem[]): StatementItem[] {
  return [...items].sort(compareStatementItems);
}

export function groupStatementItemsByDate(items: StatementItem[]): StatementDayGroup[] {
  const groups = new Map<string, StatementItem[]>();

  for (const item of sortStatementItems(items)) {
    const current = groups.get(item.date) ?? [];
    current.push(item);
    groups.set(item.date, current);
  }

  return [...groups.entries()].map(([date, dayItems]) => ({
    date,
    items: dayItems,
    dailyBalance: dayItems.reduce((sum, item) => sum + item.signedAmount, 0),
  }));
}

export function getStatementGroupHeading(date: string): string {
  const normalized = normalizeDateOnly(date);
  if (!normalized) return date;

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

export function mapIncomeEntryRowToStatementItem(row: StatementIncomeRow): StatementItem {
  const isLinked = row.monthlyIncomeId !== null;
  const description = isLinked
    ? row.monthlyIncomeName ?? row.entryName ?? "Entrada"
    : row.entryName ?? row.monthlyIncomeName ?? "Entrada avulsa";
  const category = isLinked
    ? row.monthlyIncomeCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyIncomeCategory ?? "outros";
  const date = normalizeDateOnly(row.receivedAt) ?? "";

  return {
    id: row.id,
    kind: "income",
    source: isLinked ? "linked" : "one_time",
    date,
    periodMonth: row.periodMonth,
    description,
    category,
    categoryLabel: getStatementCategoryLabel("income", category),
    amount: row.amount,
    signedAmount: row.amount,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    originId: row.id,
    originType: "monthly_income_entry",
    createdAt: row.createdAt,
  };
}

export function mapExpenseEntryRowToStatementItem(row: StatementExpenseRow): StatementItem {
  const isLinked = row.monthlyExpenseId !== null;
  const description = isLinked
    ? row.entryName ?? row.monthlyExpenseName ?? "Gasto"
    : row.entryName ?? row.monthlyExpenseName ?? "Gasto avulso";
  const category = isLinked
    ? row.monthlyExpenseCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyExpenseCategory ?? "outros";
  const date = normalizeDateOnly(row.paidAt) ?? "";

  return {
    id: row.id,
    kind: "expense",
    source: isLinked ? "linked" : "one_time",
    date,
    periodMonth: row.periodMonth,
    description,
    category,
    categoryLabel: getStatementCategoryLabel("expense", category),
    amount: row.amount,
    signedAmount: -row.amount,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    originId: row.id,
    originType: "monthly_expense_entry",
    createdAt: row.createdAt,
  };
}

export type StatementIncomeDetailRow = {
  id: string;
  monthlyIncomeId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  monthlyIncomeName: string | null;
  monthlyIncomeCategory: string | null;
  periodMonth: string;
  amount: number;
  receivedAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
};

export type StatementExpenseDetailRow = {
  id: string;
  monthlyExpenseId: string | null;
  entryName: string | null;
  entryCategory: string | null;
  entryExpenseType: string | null;
  monthlyExpenseName: string | null;
  monthlyExpenseCategory: string | null;
  monthlyExpenseType: string | null;
  periodMonth: string;
  amount: number;
  paidAt: string | Date;
  paymentMethod: string | null;
  notes: string | null;
};

export function mapIncomeEntryRowToDetail(row: StatementIncomeDetailRow): StatementEntryDetail {
  const source: StatementSource = row.monthlyIncomeId ? "linked" : "one_time";
  const description = source === "linked"
    ? row.monthlyIncomeName ?? row.entryName ?? "Entrada"
    : row.entryName ?? row.monthlyIncomeName ?? "Entrada avulsa";
  const category = source === "linked"
    ? row.monthlyIncomeCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyIncomeCategory ?? "outros";

  return {
    id: row.id,
    originType: "monthly_income_entry",
    kind: "income",
    source,
    periodMonth: row.periodMonth,
    description,
    category,
    categoryLabel: getStatementCategoryLabel("income", category),
    amount: row.amount,
    date: normalizeDateOnly(row.receivedAt) ?? "",
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    expenseType: null,
    sourceLabel: source === "linked" ? "Planejado" : "Avulso",
    linkedNotice:
      source === "linked"
        ? "Este lançamento está vinculado a um item planejado. A categoria é herdada do planejamento e a descrição pode ser ajustada."
        : null,
    canEditDescription: source === "one_time",
    canEditCategory: source === "one_time",
    canEditExpenseType: false,
  };
}

export function mapExpenseEntryRowToDetail(row: StatementExpenseDetailRow): StatementEntryDetail {
  const source: StatementSource = row.monthlyExpenseId ? "linked" : "one_time";
  const description = source === "linked"
    ? row.entryName ?? row.monthlyExpenseName ?? "Gasto"
    : row.entryName ?? row.monthlyExpenseName ?? "Gasto avulso";
  const category = source === "linked"
    ? row.monthlyExpenseCategory ?? row.entryCategory ?? "outros"
    : row.entryCategory ?? row.monthlyExpenseCategory ?? "outros";
  const expenseType = source === "linked"
    ? row.monthlyExpenseType ?? row.entryExpenseType ?? null
    : row.entryExpenseType ?? row.monthlyExpenseType ?? null;

  return {
    id: row.id,
    originType: "monthly_expense_entry",
    kind: "expense",
    source,
    periodMonth: row.periodMonth,
    description,
    category,
    categoryLabel: getStatementCategoryLabel("expense", category),
    amount: row.amount,
    date: normalizeDateOnly(row.paidAt) ?? "",
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    expenseType,
    sourceLabel: source === "linked" ? "Planejado" : "Avulso",
    linkedNotice:
      source === "linked"
        ? "Este lançamento está vinculado a um item planejado. A categoria é herdada do planejamento e a descrição pode ser ajustada."
        : null,
    canEditDescription: source === "one_time" || source === "linked",
    canEditCategory: source === "one_time",
    canEditExpenseType: source === "one_time",
  };
}

export function buildStatementSummary(items: StatementItem[]): StatementSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const item of items) {
    if (item.signedAmount >= 0) {
      totalIncome += item.signedAmount;
      continue;
    }

    totalExpense += Math.abs(item.signedAmount);
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: items.length,
  };
}

export function buildStatementResult(params: {
  periodMonth: string;
  items: StatementItem[];
  type?: StatementTypeFilter;
  category?: string | null;
  query?: string | null;
}): StatementResult {
  const normalizedType = params.type ?? "all";
  const normalizedCategory = normalizeStatementCategory(params.category);
  const normalizedQuery = normalizeStatementQuery(params.query)?.toLowerCase() ?? null;

  const filtered = params.items.filter((item) => {
    if (normalizedType !== "all" && item.kind !== normalizedType) {
      return false;
    }

    if (normalizedCategory && item.category !== normalizedCategory) {
      return false;
    }

    if (normalizedQuery) {
      const searchableText = [item.description, item.notes ?? ""].join(" ").toLowerCase();
      if (!searchableText.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });

  const items = sortStatementItems(filtered);

  return {
    periodMonth: params.periodMonth,
    items,
    summary: buildStatementSummary(items),
  };
}
