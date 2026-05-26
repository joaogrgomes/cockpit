import type { DebtValueUpdate } from "@/types";

export type ValueUpdateHistoryItem = DebtValueUpdate & {
  differenceFromPrevious: number | null;
};

export function calcDifferenceFromPrevious(
  recordedValue: number,
  previousValue: number | null
): number | null {
  if (previousValue === null) {
    return null;
  }

  return recordedValue - previousValue;
}

export function mapValueUpdatesToHistory(
  updates: DebtValueUpdate[]
): ValueUpdateHistoryItem[] {
  let previousValue: number | null = null;

  return updates.map((update) => {
    const differenceFromPrevious = calcDifferenceFromPrevious(
      update.recordedValue,
      previousValue
    );

    previousValue = update.recordedValue;

    return {
      ...update,
      differenceFromPrevious,
    };
  });
}
