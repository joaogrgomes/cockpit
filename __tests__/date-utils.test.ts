import { describe, expect, it } from "vitest";
import {
  formatDateOnlyBR,
  getLocalDateInputValue,
  isDateOnly,
  normalizeDateOnly,
} from "@/lib/date-utils";

describe("date-utils", () => {
  it("formats date-only strings in BR format", () => {
    expect(formatDateOnlyBR("2026-05-28")).toBe("28/05/2026");
  });

  it("formats timestamp strings without timezone drift", () => {
    expect(formatDateOnlyBR("2026-05-28T00:00:00.000Z")).toBe("28/05/2026");
  });

  it("returns fallback when value is null", () => {
    expect(formatDateOnlyBR(null)).toBe("—");
  });

  it("normalizes date-only strings", () => {
    expect(normalizeDateOnly("2026-05-28")).toBe("2026-05-28");
  });

  it("normalizes timestamp strings without timezone drift", () => {
    expect(normalizeDateOnly("2026-05-28T00:00:00.000Z")).toBe("2026-05-28");
  });

  it("normalizes Date objects using local components", () => {
    expect(normalizeDateOnly(new Date(2026, 4, 28))).toBe("2026-05-28");
  });

  it("returns local input value from Date objects", () => {
    expect(getLocalDateInputValue(new Date(2026, 4, 28))).toBe("2026-05-28");
  });

  it("detects date-only strings", () => {
    expect(isDateOnly("2026-05-28")).toBe(true);
    expect(isDateOnly("28/05/2026")).toBe(false);
  });
});
