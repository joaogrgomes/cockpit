import { describe, expect, it } from "vitest";
import {
  calcAdditions,
  calcDiscountPct,
  calcDiscountValue,
  calcGrowthPct,
  calcRemainingInstallments,
  formatBRL,
  parseBRL,
} from "@/lib/calculations";

describe("calcAdditions", () => {
  it("retorna null quando originalValue é null", () => {
    expect(calcAdditions(10000, null)).toBeNull();
  });

  it("calcula diferença corretamente", () => {
    expect(calcAdditions(15000, 10000)).toBe(5000);
  });

  it("retorna negativo quando currentValue < originalValue", () => {
    expect(calcAdditions(5000, 7000)).toBe(-2000);
  });
});

describe("calcGrowthPct", () => {
  it("retorna null quando originalValue é null ou zero", () => {
    expect(calcGrowthPct(10000, null)).toBeNull();
    expect(calcGrowthPct(10000, 0)).toBeNull();
  });

  it("calcula crescimento percentual corretamente", () => {
    expect(calcGrowthPct(15000, 10000)).toBe(50);
  });
});

describe("calcDiscountValue", () => {
  it("calcula desconto em centavos", () => {
    expect(calcDiscountValue(10000, 8000)).toBe(2000);
  });
});

describe("calcDiscountPct", () => {
  it("retorna null quando currentValue é zero", () => {
    expect(calcDiscountPct(0, 500)).toBeNull();
  });

  it("calcula percentual de desconto", () => {
    expect(calcDiscountPct(10000, 7500)).toBe(25);
  });
});

describe("calcRemainingInstallments", () => {
  it("retorna null quando total ou paid são null", () => {
    expect(calcRemainingInstallments(null, 1)).toBeNull();
    expect(calcRemainingInstallments(10, null)).toBeNull();
  });

  it("calcula parcelas restantes", () => {
    expect(calcRemainingInstallments(12, 5)).toBe(7);
  });
});

describe("formatBRL", () => {
  it("formata centavos para moeda BRL", () => {
    expect(formatBRL(12345)).toBe("R$\u00a0123,45");
  });
});

describe("parseBRL", () => {
  it("converte string BRL para centavos", () => {
    expect(parseBRL("R$ 123,45")).toBe(12345);
  });

  it("retorna 0 em valor inválido", () => {
    expect(parseBRL("abc")).toBe(0);
  });
});
