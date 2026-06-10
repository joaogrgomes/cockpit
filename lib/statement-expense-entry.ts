export type StatementExpenseEntryMode = "linked" | "one_time";

export function shouldShowStatementExpenseOccurrenceTypeField(
  hasCompatiblePlanning: boolean,
  mode: StatementExpenseEntryMode
): boolean {
  return !hasCompatiblePlanning || mode === "one_time";
}

export function getEffectiveStatementExpenseMode(
  hasCompatiblePlanning: boolean,
  mode: StatementExpenseEntryMode
): StatementExpenseEntryMode {
  return hasCompatiblePlanning ? mode : "one_time";
}
