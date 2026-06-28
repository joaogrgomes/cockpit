import { formatPeriodMonthShort } from "@/lib/recurrence-period";

export type MonthlyExpensePauseLike = {
  id?: string;
  monthlyExpenseId?: string;
  startMonth: string;
  endMonth: string | null;
  reason?: string | null;
};

function comparePeriodMonth(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function isMonthlyExpensePausedInMonth(
  pauses: MonthlyExpensePauseLike[] | null | undefined,
  periodMonth: string
): boolean {
  if (!pauses || pauses.length === 0) {
    return false;
  }

  return pauses.some((pause) => {
    if (comparePeriodMonth(periodMonth, pause.startMonth) < 0) {
      return false;
    }

    if (pause.endMonth && comparePeriodMonth(periodMonth, pause.endMonth) > 0) {
      return false;
    }

    return true;
  });
}

export function getMonthlyExpenseActivePause(
  pauses: MonthlyExpensePauseLike[] | null | undefined,
  periodMonth: string
): MonthlyExpensePauseLike | null {
  if (!pauses || pauses.length === 0) {
    return null;
  }

  const activePauses = pauses.filter((pause) => isMonthlyExpensePausedInMonth([pause], periodMonth));
  if (activePauses.length === 0) {
    return null;
  }

  return activePauses.sort((left, right) => {
    const startComparison = comparePeriodMonth(right.startMonth, left.startMonth);
    if (startComparison !== 0) {
      return startComparison;
    }

    if (!left.endMonth && right.endMonth) {
      return -1;
    }

    if (left.endMonth && !right.endMonth) {
      return 1;
    }

    if (left.endMonth && right.endMonth) {
      return comparePeriodMonth(right.endMonth, left.endMonth);
    }

    return 0;
  })[0] ?? null;
}

export function getMonthlyExpensePausePeriodLabel(pause: MonthlyExpensePauseLike): string {
  if (pause.endMonth) {
    return `${formatPeriodMonthShort(pause.startMonth)} até ${formatPeriodMonthShort(pause.endMonth)}`;
  }

  return `desde ${formatPeriodMonthShort(pause.startMonth)}`;
}

export function groupMonthlyExpensePausesByExpenseId(
  pauses: MonthlyExpensePauseLike[]
): Record<string, MonthlyExpensePauseLike[]> {
  return pauses.reduce<Record<string, MonthlyExpensePauseLike[]>>((acc, pause) => {
    if (!pause.monthlyExpenseId) {
      return acc;
    }

    const list = acc[pause.monthlyExpenseId] ?? [];
    list.push(pause);
    acc[pause.monthlyExpenseId] = list;
    return acc;
  }, {});
}
