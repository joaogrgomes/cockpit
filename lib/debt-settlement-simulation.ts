import { formatBRL } from "@/lib/calculations";
import { normalizeDateOnly } from "@/lib/date-utils";
import type {
  Debt,
  DebtSettlementOption,
  DebtSettlementOptionKind,
  DebtSettlementOptionStatus,
} from "@/types";

export type DebtSettlementSimulationDebt = Debt & {
  hasActiveProposal: boolean;
  settlementOptions: DebtSettlementOption[];
};

export type DebtSettlementSimulationItemSource = "accepted" | "selected";

export type DebtSettlementSimulationItem = {
  debtId: string;
  debtName: string;
  creditor: string;
  debtCurrentValueCents: number;
  debtStatus: string;
  optionId: string;
  kind: DebtSettlementOptionKind;
  status: DebtSettlementOptionStatus;
  installments: number;
  totalAmountCents: number;
  upfrontAmountCents: number;
  monthlyInstallmentCents: number | null;
  firstDueDate: string | null;
  validUntil: string | null;
  notes: string | null;
  optionLabel: string;
  source: DebtSettlementSimulationItemSource;
};

export type DebtSettlementSimulationScheduleItem = {
  debtId: string;
  debtName: string;
  creditor: string;
  optionId: string;
  optionLabel: string;
  source: DebtSettlementSimulationItemSource;
  installmentIndex: number;
  installmentCount: number;
  amountCents: number;
};

export type DebtSettlementSimulationScheduleMonth = {
  periodMonth: string;
  totalAmountCents: number;
  items: DebtSettlementSimulationScheduleItem[];
};

export type DebtSettlementSimulationInput = {
  debts: DebtSettlementSimulationDebt[];
  selectedOptionIds: string[];
};

export type DebtSettlementSimulationResult = {
  acceptedItems: DebtSettlementSimulationItem[];
  selectedItems: DebtSettlementSimulationItem[];
  allItems: DebtSettlementSimulationItem[];
  immediateOutflowCents: number;
  futureInstallmentsTotalCents: number;
  totalOperationCents: number;
  monthlySchedule: DebtSettlementSimulationScheduleMonth[];
  maxMonthlyInstallmentCents: number;
  committedMonthsCount: number;
};

const SELECTABLE_STATUSES: DebtSettlementOptionStatus[] = ["active", "accepted"];

function isSelectableOptionStatus(status: DebtSettlementOptionStatus): boolean {
  return SELECTABLE_STATUSES.includes(status);
}

function parsePeriodMonth(periodMonth: string): { year: number; month: number } | null {
  const [yearText, monthText] = periodMonth.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function shiftPeriodMonth(periodMonth: string, monthsToAdd: number): string {
  const parsed = parsePeriodMonth(periodMonth);
  if (!parsed) return periodMonth;

  const totalMonths = parsed.year * 12 + (parsed.month - 1) + monthsToAdd;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function getOptionLabel(option: DebtSettlementOption): string {
  if (option.kind === "cash") {
    return "À vista";
  }

  return `${option.installments}x de ${formatBRL(option.monthlyInstallmentCents ?? 0)}`;
}

function getOptionMonthKey(option: DebtSettlementOption): string | null {
  return normalizeDateOnly(option.firstDueDate)?.slice(0, 7) ?? null;
}

export function buildDebtSettlementSimulation(
  input: DebtSettlementSimulationInput
): DebtSettlementSimulationResult {
  const acceptedByDebtId = new Map<string, DebtSettlementSimulationItem>();
  const selectedByDebtId = new Map<string, DebtSettlementSimulationItem>();
  const optionById = new Map<
    string,
    {
      debt: DebtSettlementSimulationDebt;
      option: DebtSettlementOption;
    }
  >();

  for (const debt of input.debts) {
    for (const option of debt.settlementOptions) {
      if (option.status === "accepted") {
        acceptedByDebtId.set(debt.id, buildSimulationItem(debt, option, "accepted"));
      }

      if (option.status === "accepted" || isSelectableOptionStatus(option.status)) {
        optionById.set(option.id, { debt, option });
      }
    }
  }

  const monthlyScheduleMap = new Map<string, DebtSettlementSimulationScheduleMonth>();
  let immediateOutflowCents = 0;
  let futureInstallmentsTotalCents = 0;
  let totalOperationCents = 0;

  for (const optionId of input.selectedOptionIds) {
    const matched = optionById.get(optionId);
    if (!matched) {
      continue;
    }

    if (selectedByDebtId.has(matched.debt.id)) {
      continue;
    }

    if (acceptedByDebtId.has(matched.debt.id)) {
      continue;
    }

    const { debt, option } = matched;
    const selectedItem = buildSimulationItem(debt, option, "selected");

    selectedByDebtId.set(debt.id, selectedItem);
    totalOperationCents += option.totalAmountCents;

    if (option.kind === "cash") {
      immediateOutflowCents += option.totalAmountCents;
      continue;
    }

    immediateOutflowCents += option.upfrontAmountCents;

    const monthlyInstallmentCents = option.monthlyInstallmentCents ?? 0;
    futureInstallmentsTotalCents += monthlyInstallmentCents * option.installments;

    const startMonth = getOptionMonthKey(option);
    if (!startMonth || monthlyInstallmentCents <= 0) {
      continue;
    }

    for (let index = 0; index < option.installments; index += 1) {
      const periodMonth = shiftPeriodMonth(startMonth, index);
      const currentMonth = monthlyScheduleMap.get(periodMonth) ?? {
        periodMonth,
        totalAmountCents: 0,
        items: [],
      };

      currentMonth.totalAmountCents += monthlyInstallmentCents;
      currentMonth.items.push({
        debtId: debt.id,
        debtName: debt.name,
        creditor: debt.creditor,
        optionId: option.id,
        optionLabel: selectedItem.optionLabel,
        source: "selected",
        installmentIndex: index + 1,
        installmentCount: option.installments,
        amountCents: monthlyInstallmentCents,
      });
      monthlyScheduleMap.set(periodMonth, currentMonth);
    }
  }

  const acceptedItems = input.debts
    .map((debt) => acceptedByDebtId.get(debt.id))
    .filter((item): item is DebtSettlementSimulationItem => Boolean(item));
  const selectedItems = input.debts
    .map((debt) => selectedByDebtId.get(debt.id))
    .filter((item): item is DebtSettlementSimulationItem => Boolean(item));
  const allItems = [...acceptedItems, ...selectedItems];

  for (const item of acceptedItems) {
    totalOperationCents += item.totalAmountCents;
    if (item.kind === "cash") {
      immediateOutflowCents += item.totalAmountCents;
      continue;
    }

    immediateOutflowCents += item.upfrontAmountCents;
    const monthlyInstallmentCents = item.monthlyInstallmentCents ?? 0;
    futureInstallmentsTotalCents += monthlyInstallmentCents * item.installments;

    const startMonth = getOptionMonthKey(item);
    if (!startMonth || monthlyInstallmentCents <= 0) {
      continue;
    }

    for (let index = 0; index < item.installments; index += 1) {
      const periodMonth = shiftPeriodMonth(startMonth, index);
      const currentMonth = monthlyScheduleMap.get(periodMonth) ?? {
        periodMonth,
        totalAmountCents: 0,
        items: [],
      };

      currentMonth.totalAmountCents += monthlyInstallmentCents;
      currentMonth.items.push({
        debtId: item.debtId,
        debtName: item.debtName,
        creditor: item.creditor,
        optionId: item.optionId,
        optionLabel: item.optionLabel,
        source: "accepted",
        installmentIndex: index + 1,
        installmentCount: item.installments,
        amountCents: monthlyInstallmentCents,
      });
      monthlyScheduleMap.set(periodMonth, currentMonth);
    }
  }

  const monthlySchedule = Array.from(monthlyScheduleMap.values()).sort((a, b) =>
    a.periodMonth.localeCompare(b.periodMonth)
  );

  return {
    acceptedItems,
    selectedItems,
    allItems,
    immediateOutflowCents,
    futureInstallmentsTotalCents,
    totalOperationCents,
    monthlySchedule,
    maxMonthlyInstallmentCents: monthlySchedule.reduce(
      (max, month) => Math.max(max, month.totalAmountCents),
      0
    ),
    committedMonthsCount: monthlySchedule.length,
  };
}

function buildSimulationItem(
  debt: DebtSettlementSimulationDebt,
  option: DebtSettlementOption,
  source: DebtSettlementSimulationItemSource
): DebtSettlementSimulationItem {
  return {
    debtId: debt.id,
    debtName: debt.name,
    creditor: debt.creditor,
    debtCurrentValueCents: debt.currentValue,
    debtStatus: debt.status,
    optionId: option.id,
    kind: option.kind,
    status: option.status,
    installments: option.installments,
    totalAmountCents: option.totalAmountCents,
    upfrontAmountCents: option.upfrontAmountCents,
    monthlyInstallmentCents: option.monthlyInstallmentCents,
    firstDueDate: option.firstDueDate,
    validUntil: option.validUntil,
    notes: option.notes,
    optionLabel: getOptionLabel(option),
    source,
  };
}
