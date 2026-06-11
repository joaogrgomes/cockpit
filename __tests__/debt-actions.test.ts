import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createDebt: vi.fn(),
  updateDebt: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/services/debt.service", () => ({
  createDebt: mocks.createDebt,
  updateDebt: mocks.updateDebt,
  deleteDebt: vi.fn(),
}));

vi.mock("@/lib/services/debt-lifecycle.service", () => ({
  markDebtAsPaid: vi.fn(),
  confirmDebtClearance: vi.fn(),
  archiveDebt: vi.fn(),
}));

vi.mock("@/lib/services/debt-attachment.service", () => ({
  createDebtAttachment: vi.fn(),
}));

vi.mock("@/lib/services/proposal.service", () => ({
  createActiveProposal: vi.fn(),
}));

vi.mock("@/lib/services/value-update.service", () => ({
  createDebtValueUpdate: vi.fn(),
}));

import { createDebtAction, updateDebtAction } from "@/app/debts/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("debt actions", () => {
  it("envia debtType ao criar dívida", async () => {
    mocks.createDebt.mockResolvedValue({ id: "debt-1" });

    const formData = new FormData();
    formData.set("name", "Caedu");
    formData.set("creditor", "Caedu");
    formData.set("type", "loja");
    formData.set("debtType", "payoff");
    formData.set("currentValue", "120000");

    const result = await createDebtAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.createDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        debtType: "payoff",
      })
    );
  });

  it("envia debtType ao atualizar dívida", async () => {
    mocks.updateDebt.mockResolvedValue({ id: "debt-1" });

    const formData = new FormData();
    formData.set("id", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("name", "Cooperforte");
    formData.set("creditor", "Cooperforte");
    formData.set("type", "emprestimo");
    formData.set("debtType", "structural");
    formData.set("currentValue", "250000");

    const result = await updateDebtAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.updateDebt).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      expect.objectContaining({
        debtType: "structural",
      })
    );
  });
});
