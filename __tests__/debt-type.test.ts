import { describe, expect, it } from "vitest";
import {
  getDebtTypeBadgeVariant,
  getDebtTypeDescription,
  getDebtTypeLabel,
} from "@/lib/debt-type";

describe("debt type helpers", () => {
  it("expõe labels e descrições corretas", () => {
    expect(getDebtTypeLabel("payoff")).toBe("Quitação");
    expect(getDebtTypeLabel("structural")).toBe("Estruturante");
    expect(getDebtTypeDescription("payoff")).toContain("eliminar completamente");
    expect(getDebtTypeDescription("structural")).toContain("alto impacto");
  });

  it("define variantes de badge compatíveis", () => {
    expect(getDebtTypeBadgeVariant("payoff")).toBe("default");
    expect(getDebtTypeBadgeVariant("structural")).toBe("secondary");
  });
});
