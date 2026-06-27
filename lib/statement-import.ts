import { createHash } from "node:crypto";
import { normalizeDateOnly } from "@/lib/date-utils";
import { isMonthWithinPeriod, isValidPeriodMonth } from "@/lib/recurrence-period";
import type { ExpenseOccurrenceType, ExpenseType } from "@/types";

export const STATEMENT_IMPORT_SOURCES = ["inter_csv"] as const;

export type StatementImportSource = (typeof STATEMENT_IMPORT_SOURCES)[number];
export type StatementImportDirection = "income" | "expense";
export type StatementImportRowMode = "linked" | "one_time";
export type StatementImportDecision = "import" | "ignore";
export type StatementImportRowStatus = "pending" | "ignored" | "committed" | "skipped_duplicate";

export type ImportedStatementItem = {
  source: StatementImportSource;
  rowIndex: number;
  externalId?: string | null;
  transactionDate: string;
  rawHistory: string | null;
  rawDescription: string;
  description: string;
  amountCents: number;
  balanceAfterCents: number | null;
  direction: StatementImportDirection;
  rowHash: string;
};

export type ImportedStatementPeriod = {
  periodStart: string | null;
  periodEnd: string | null;
};

export type StatementImportReviewedRow = {
  rowId: string;
  decision: StatementImportDecision;
  description: string;
  category: string | null;
  mode: StatementImportRowMode | "future";
  monthlyExpenseId?: string | null;
  monthlyIncomeId?: string | null;
  futureExpensePayableId?: string | null;
  futureIncomeReceivableId?: string | null;
  expenseType?: string | null;
  occurrenceType?: "planned_one_off" | "unexpected" | null;
};

type StatementImportMonthlyPlanLike = {
  id: string;
  isActive: boolean;
  category: string;
  startMonth: string | null;
  endMonth: string | null;
};

type StatementImportFutureExpenseLike = {
  id: string;
  status: string;
  name: string;
  category: string;
  expectedDate: string | Date;
  expectedAmount: number;
  expenseType: string;
  occurrenceType: string;
};

type StatementImportFutureIncomeLike = {
  id: string;
  status: string;
  name: string;
  category: string;
  expectedDate: string | Date;
  expectedAmount: number;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ";" && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseBrazilianDate(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const normalized = `${year}-${month}-${day}`;
  return normalizeDateOnly(normalized) ?? null;
}

export function parseBrazilianMoneyToCents(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function normalizeImportedDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseStatementImportRowStatus(value: string): StatementImportRowStatus {
  switch (value) {
    case "pending":
    case "ignored":
    case "committed":
    case "skipped_duplicate":
      return value;
    default:
      throw new Error(`Status de importação inválido: ${value}`);
  }
}

export function parseStatementImportDirection(value: string): StatementImportDirection {
  switch (value) {
    case "income":
    case "expense":
      return value;
    default:
      throw new Error(`Direção de importação inválida: ${value}`);
  }
}

export function parseStatementImportExpenseType(value: string): ExpenseType {
  switch (value) {
    case "fixo":
    case "variavel":
      return value;
    default:
      throw new Error(`Tipo de gasto inválido: ${value}`);
  }
}

export function parseStatementImportOccurrenceType(value: string): ExpenseOccurrenceType {
  switch (value) {
    case "planned_one_off":
    case "unexpected":
      return value;
    default:
      throw new Error(`Tipo de ocorrência inválido: ${value}`);
  }
}

function isCompatibleStatementImportMonthlyPlan(
  rowMonth: string,
  category: string | null,
  plan: StatementImportMonthlyPlanLike
): boolean {
  const startMonth = plan.startMonth;
  if (!startMonth || !isValidPeriodMonth(startMonth)) {
    return false;
  }

  return (
    Boolean(category) &&
    plan.isActive &&
    plan.category === category &&
    isMonthWithinPeriod(rowMonth, startMonth, plan.endMonth ?? null)
  );
}

function getDateOnlyUtcTime(value: string | Date): number | null {
  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map((part) => Number.parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

function compareStatementImportFutureOptions<T extends { expectedDate: string | Date }>(
  rowDate: string,
  left: T,
  right: T
): number {
  const rowTime = getDateOnlyUtcTime(rowDate);
  const leftTime = getDateOnlyUtcTime(left.expectedDate);
  const rightTime = getDateOnlyUtcTime(right.expectedDate);

  if (rowTime !== null && leftTime !== null && rightTime !== null) {
    const leftDelta = Math.abs(leftTime - rowTime);
    const rightDelta = Math.abs(rightTime - rowTime);
    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta;
    }
  }

  const leftDate = normalizeDateOnly(left.expectedDate) ?? "";
  const rightDate = normalizeDateOnly(right.expectedDate) ?? "";
  if (leftDate !== rightDate) {
    return leftDate < rightDate ? -1 : 1;
  }

  return 0;
}

function isCompatibleStatementImportFutureExpense(
  rowDate: string,
  category: string | null,
  future: StatementImportFutureExpenseLike
): boolean {
  if (future.status !== "previsto") {
    return false;
  }

  if (category && future.category !== category) {
    return false;
  }

  return Boolean(normalizeDateOnly(rowDate)) && Boolean(normalizeDateOnly(future.expectedDate));
}

function isCompatibleStatementImportFutureIncome(
  rowDate: string,
  category: string | null,
  future: StatementImportFutureIncomeLike
): boolean {
  if (future.status !== "prevista") {
    return false;
  }

  if (category && future.category !== category) {
    return false;
  }

  return Boolean(normalizeDateOnly(rowDate)) && Boolean(normalizeDateOnly(future.expectedDate));
}

export function getCompatibleStatementImportMonthlyPlans<T extends StatementImportMonthlyPlanLike>(
  rowMonth: string,
  category: string | null,
  plans: T[]
): T[] {
  if (!category) {
    return [];
  }

  return plans.filter((plan) => isCompatibleStatementImportMonthlyPlan(rowMonth, category, plan));
}

export function getAutoSelectedStatementImportMonthlyPlanId<T extends StatementImportMonthlyPlanLike>(
  rowMonth: string,
  category: string | null,
  plans: T[],
  currentPlanId: string | null
): string | null {
  const compatiblePlans = getCompatibleStatementImportMonthlyPlans(rowMonth, category, plans);

  if (currentPlanId && compatiblePlans.some((plan) => plan.id === currentPlanId)) {
    return currentPlanId;
  }

  if (compatiblePlans.length === 1) {
    return compatiblePlans[0].id;
  }

  return null;
}

export function getCompatibleStatementImportFutureExpensePayables<T extends StatementImportFutureExpenseLike>(
  rowDate: string,
  category: string | null,
  futureExpenses: T[]
): T[] {
  return futureExpenses
    .filter((futureExpense) =>
      isCompatibleStatementImportFutureExpense(rowDate, category, futureExpense)
    )
    .sort((left, right) => compareStatementImportFutureOptions(rowDate, left, right));
}

export function getCompatibleStatementImportFutureIncomeReceivables<T extends StatementImportFutureIncomeLike>(
  rowDate: string,
  category: string | null,
  futureIncomes: T[]
): T[] {
  return futureIncomes
    .filter((futureIncome) => isCompatibleStatementImportFutureIncome(rowDate, category, futureIncome))
    .sort((left, right) => compareStatementImportFutureOptions(rowDate, left, right));
}

export function getAutoSelectedStatementImportFutureExpensePayableId<T extends StatementImportFutureExpenseLike>(
  rowDate: string,
  category: string | null,
  futureExpenses: T[],
  currentFutureExpensePayableId: string | null
): string | null {
  const compatibleFutureExpenses = getCompatibleStatementImportFutureExpensePayables(
    rowDate,
    category,
    futureExpenses
  );

  if (
    currentFutureExpensePayableId &&
    compatibleFutureExpenses.some((futureExpense) => futureExpense.id === currentFutureExpensePayableId)
  ) {
    return currentFutureExpensePayableId;
  }

  if (compatibleFutureExpenses.length === 1) {
    return compatibleFutureExpenses[0].id;
  }

  return null;
}

export function getAutoSelectedStatementImportFutureIncomeReceivableId<T extends StatementImportFutureIncomeLike>(
  rowDate: string,
  category: string | null,
  futureIncomes: T[],
  currentFutureIncomeReceivableId: string | null
): string | null {
  const compatibleFutureIncomes = getCompatibleStatementImportFutureIncomeReceivables(
    rowDate,
    category,
    futureIncomes
  );

  if (
    currentFutureIncomeReceivableId &&
    compatibleFutureIncomes.some((futureIncome) => futureIncome.id === currentFutureIncomeReceivableId)
  ) {
    return currentFutureIncomeReceivableId;
  }

  if (compatibleFutureIncomes.length === 1) {
    return compatibleFutureIncomes[0].id;
  }

  return null;
}

export function buildStatementImportRowHash(item: {
  source: StatementImportSource;
  transactionDate: string;
  rawHistory: string | null;
  rawDescription: string;
  amountCents: number;
  balanceAfterCents: number | null;
  direction?: StatementImportDirection;
}): string {
  const payload = [
    item.source,
    item.transactionDate,
    (item.rawHistory ?? "").trim(),
    normalizeImportedDescription(item.rawDescription),
    item.direction ?? "",
    String(item.amountCents),
    item.balanceAfterCents === null ? "" : String(item.balanceAfterCents),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function getImportedStatementPeriod(items: ImportedStatementItem[]): ImportedStatementPeriod {
  if (items.length === 0) {
    return { periodStart: null, periodEnd: null };
  }

  let periodStart = items[0].transactionDate;
  let periodEnd = items[0].transactionDate;

  for (const item of items) {
    if (item.transactionDate < periodStart) {
      periodStart = item.transactionDate;
    }

    if (item.transactionDate > periodEnd) {
      periodEnd = item.transactionDate;
    }
  }

  return { periodStart, periodEnd };
}

export function parseInterCsvStatement(content: string): ImportedStatementItem[] {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const lines = normalizedContent.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("Data Lançamento;Histórico;Descrição;Valor;Saldo")
  );

  if (headerIndex < 0) {
    throw new Error("Cabeçalho CSV do Inter não encontrado");
  }

  const items: ImportedStatementItem[] = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim();
    if (!rawLine) {
      continue;
    }

    const cells = splitCsvLine(rawLine).map((cell) => cell.trim());
    if (cells.length < 5) {
      continue;
    }

    const [dateText, historyText, descriptionText, valueText, balanceText] = cells;

    if (!dateText || dateText === "Data Lançamento") {
      continue;
    }

    const transactionDate = parseBrazilianDate(dateText);
    if (!transactionDate) {
      throw new Error(`Data inválida no CSV do Inter: ${dateText}`);
    }

    const signedAmountCents = parseBrazilianMoneyToCents(valueText);
    const balanceAfterCents = balanceText ? parseBrazilianMoneyToCents(balanceText) : null;
    const rawDescription = descriptionText;
    const description = normalizeImportedDescription(descriptionText);
    const direction: StatementImportDirection = signedAmountCents < 0 ? "expense" : "income";
    const amountCents = Math.abs(signedAmountCents);

    if (amountCents <= 0) {
      throw new Error(`Valor inválido no CSV do Inter: ${valueText}`);
    }

    const item: ImportedStatementItem = {
      source: "inter_csv",
      rowIndex: items.length + 1,
      externalId: null,
      transactionDate,
      rawHistory: historyText ? normalizeImportedDescription(historyText) : null,
      rawDescription,
      description,
      amountCents,
      balanceAfterCents,
      direction,
      rowHash: "",
    };

    item.rowHash = buildStatementImportRowHash({ ...item, direction: item.direction });
    items.push(item);
  }

  return items;
}

export function dedupeImportedStatementItems(
  items: ImportedStatementItem[],
  existingRowHashes: Set<string>
): {
  insertedItems: ImportedStatementItem[];
  duplicateItems: ImportedStatementItem[];
} {
  const insertedItems: ImportedStatementItem[] = [];
  const duplicateItems: ImportedStatementItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (existingRowHashes.has(item.rowHash) || seen.has(item.rowHash)) {
      duplicateItems.push(item);
      continue;
    }

    seen.add(item.rowHash);
    insertedItems.push(item);
  }

  return { insertedItems, duplicateItems };
}
