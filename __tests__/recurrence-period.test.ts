import { describe, expect, it } from "vitest";
import {
  formatRecurrencePeriodLabel,
  getPeriodMonthDateRange,
  isMonthWithinPeriod,
  isDateWithinPeriodMonth,
  validatePeriod,
} from "@/lib/recurrence-period";

describe("recurrence period helpers", () => {
  it("considera meses antes do início como fora da vigência", () => {
    expect(isMonthWithinPeriod("2026-07", "2026-08")).toBe(false);
  });

  it("considera o mês inicial como dentro da vigência", () => {
    expect(isMonthWithinPeriod("2026-08", "2026-08")).toBe(true);
  });

  it("considera meses posteriores como dentro da vigência quando não há fim", () => {
    expect(isMonthWithinPeriod("2026-09", "2026-08")).toBe(true);
  });

  it("considera mês após o fim como fora da vigência", () => {
    expect(isMonthWithinPeriod("2026-09", "2026-08", "2026-08")).toBe(false);
  });

  it("valida fim igual ao início", () => {
    expect(validatePeriod("2026-08", "2026-08")).toBe(true);
  });

  it("rejeita fim menor que o início", () => {
    expect(validatePeriod("2026-08", "2026-07")).toBe(false);
  });

  it("gera intervalo half-open mensal correto", () => {
    expect(getPeriodMonthDateRange("2026-05")).toEqual({
      startDate: "2026-05-01",
      endDateExclusive: "2026-06-01",
    });

    expect(getPeriodMonthDateRange("2026-06")).toEqual({
      startDate: "2026-06-01",
      endDateExclusive: "2026-07-01",
    });
  });

  it("considera apenas datas dentro do intervalo half-open do mês", () => {
    expect(isDateWithinPeriodMonth("2026-06-01", "2026-05")).toBe(false);
    expect(isDateWithinPeriodMonth("2026-05-31", "2026-05")).toBe(true);
    expect(isDateWithinPeriodMonth("2026-05-01", "2026-05")).toBe(true);
    expect(isDateWithinPeriodMonth("2026-06-01", "2026-06")).toBe(true);
  });

  it("formata vigência sem fim", () => {
    expect(formatRecurrencePeriodLabel("2026-08")).toBe("Desde ago/2026");
  });

  it("formata vigência com início e fim", () => {
    expect(formatRecurrencePeriodLabel("2026-08", "2026-12")).toBe("ago/2026 até dez/2026");
  });
});
