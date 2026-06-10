import { describe, expect, it } from "vitest";
import {
  getEffectiveStatementExpenseMode,
  shouldShowStatementExpenseOccurrenceTypeField,
} from "@/lib/statement-expense-entry";

describe("statement expense entry helpers", () => {
  it("mostra classificação quando não há planejamento compatível", () => {
    expect(shouldShowStatementExpenseOccurrenceTypeField(false, "linked")).toBe(true);
    expect(getEffectiveStatementExpenseMode(false, "linked")).toBe("one_time");
  });

  it("mostra classificação quando há planejamento compatível e o modo é avulso", () => {
    expect(shouldShowStatementExpenseOccurrenceTypeField(true, "one_time")).toBe(true);
  });

  it("esconde classificação quando há planejamento compatível e o modo é vinculado", () => {
    expect(shouldShowStatementExpenseOccurrenceTypeField(true, "linked")).toBe(false);
    expect(getEffectiveStatementExpenseMode(true, "linked")).toBe("linked");
  });
});
