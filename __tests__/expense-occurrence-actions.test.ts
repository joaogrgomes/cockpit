import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMonthlyExpenseEntry: vi.fn(),
  deleteMonthlyExpenseEntry: vi.fn(),
  getMonthlyExpenseById: vi.fn(),
  createFutureExpensePayable: vi.fn(),
  updateFutureExpensePayable: vi.fn(),
  cancelFutureExpensePayable: vi.fn(),
  markFutureExpenseAsRealized: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/services/monthly-expense-entry.service", () => ({
  createMonthlyExpenseEntry: mocks.createMonthlyExpenseEntry,
  deleteMonthlyExpenseEntry: mocks.deleteMonthlyExpenseEntry,
}));

vi.mock("@/lib/services/monthly-expense.service", () => ({
  getMonthlyExpenseById: mocks.getMonthlyExpenseById,
}));

vi.mock("@/lib/services/future-expense.service", () => ({
  createFutureExpensePayable: mocks.createFutureExpensePayable,
  updateFutureExpensePayable: mocks.updateFutureExpensePayable,
  cancelFutureExpensePayable: mocks.cancelFutureExpensePayable,
  markFutureExpenseAsRealized: mocks.markFutureExpenseAsRealized,
}));

import {
  createMonthlyExpenseEntryAction,
  createOneTimeExpenseEntryAction,
} from "@/app/expenses/tracking/actions";
import {
  createFutureExpenseAction,
  markFutureExpenseAsRealizedAction,
  updateFutureExpenseAction,
} from "@/app/expenses/future/actions";

function buildBaseExpenseFormData(occurrenceType: string) {
  const formData = new FormData();
  formData.set("name", "Jantar aniversário Poli");
  formData.set("category", "familia");
  formData.set("expenseType", "variavel");
  formData.set("occurrenceType", occurrenceType);
  formData.set("periodMonth", "2026-06");
  formData.set("amount", "15000");
  formData.set("paidAt", "2026-06-04");
  formData.set("paymentMethod", "pix");
  return formData;
}

function buildBaseFutureFormData(occurrenceType: string) {
  const formData = new FormData();
  formData.set("name", "Jantar aniversário Poli");
  formData.set("category", "familia");
  formData.set("expenseType", "variavel");
  formData.set("occurrenceType", occurrenceType);
  formData.set("expectedAmount", "15000");
  formData.set("expectedDate", "2026-06-24");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("expense occurrence actions", () => {
  it("cria gasto vinculado quando planejamento compatível existe", async () => {
    mocks.getMonthlyExpenseById.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440001",
      isActive: true,
      category: "familia",
      expenseType: "variavel",
    });
    mocks.createMonthlyExpenseEntry.mockResolvedValue({ id: "entry-linked-1" });

    const formData = buildBaseExpenseFormData("unexpected");
    formData.set("monthlyExpenseId", "550e8400-e29b-41d4-a716-446655440001");

    const result = await createMonthlyExpenseEntryAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.getMonthlyExpenseById).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440001"
    );
    expect(mocks.createMonthlyExpenseEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyExpenseId: "550e8400-e29b-41d4-a716-446655440001",
      })
    );
  });

  it("rejeita gasto vinculado quando planejamento está inativo", async () => {
    mocks.getMonthlyExpenseById.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440002",
      isActive: false,
      category: "familia",
      expenseType: "variavel",
    });

    const formData = buildBaseExpenseFormData("unexpected");
    formData.set("monthlyExpenseId", "550e8400-e29b-41d4-a716-446655440002");

    const result = await createMonthlyExpenseEntryAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Planejamento não encontrado ou inativo");
    expect(mocks.createMonthlyExpenseEntry).not.toHaveBeenCalled();
  });

  it("rejeita gasto vinculado quando categoria não bate com o planejamento", async () => {
    mocks.getMonthlyExpenseById.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440003",
      isActive: true,
      category: "saude",
      expenseType: "variavel",
    });

    const formData = buildBaseExpenseFormData("unexpected");
    formData.set("monthlyExpenseId", "550e8400-e29b-41d4-a716-446655440003");

    const result = await createMonthlyExpenseEntryAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("categoria informada");
    expect(mocks.createMonthlyExpenseEntry).not.toHaveBeenCalled();
  });

  it("cria gasto avulso como unexpected", async () => {
    mocks.createMonthlyExpenseEntry.mockResolvedValue({ id: "entry-1" });

    const result = await createOneTimeExpenseEntryAction(
      buildBaseExpenseFormData("unexpected")
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.createMonthlyExpenseEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyExpenseId: null,
        occurrenceType: "unexpected",
        name: "Jantar aniversário Poli",
        category: "familia",
        expenseType: "variavel",
      })
    );
  });

  it("cria gasto avulso como planned_one_off", async () => {
    mocks.createMonthlyExpenseEntry.mockResolvedValue({ id: "entry-2" });

    const result = await createOneTimeExpenseEntryAction(
      buildBaseExpenseFormData("planned_one_off")
    );

    expect(result).toEqual({ ok: true });
    expect(mocks.createMonthlyExpenseEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyExpenseId: null,
        occurrenceType: "planned_one_off",
      })
    );
  });

  it("cria gasto futuro com planned_one_off por padrão informado", async () => {
    mocks.createFutureExpensePayable.mockResolvedValue({ id: "future-1" });

    const result = await createFutureExpenseAction(buildBaseFutureFormData("planned_one_off"));

    expect(result).toEqual({ ok: true });
    expect(mocks.createFutureExpensePayable).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrenceType: "planned_one_off",
        name: "Jantar aniversário Poli",
      })
    );
  });

  it("preserva classificação ao marcar futuro como realizado", async () => {
    mocks.markFutureExpenseAsRealized.mockResolvedValue({ id: "future-1" });

    const formData = new FormData();
    formData.set("futureExpenseId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("realizedAmount", "15000");
    formData.set("paidAt", "2026-06-04");
    formData.set("paymentMethod", "pix");
    formData.set("notes", "Pago no PIX");

    const result = await markFutureExpenseAsRealizedAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.markFutureExpenseAsRealized).toHaveBeenCalledWith(
      expect.objectContaining({
        futureExpenseId: "550e8400-e29b-41d4-a716-446655440000",
        realizedAmount: 15000,
        paidAt: "2026-06-04",
        paymentMethod: "pix",
        notes: "Pago no PIX",
      })
    );
  });

  it("atualiza gasto futuro com classificação selecionada", async () => {
    mocks.updateFutureExpensePayable.mockResolvedValue({ id: "future-2" });

    const formData = buildBaseFutureFormData("unexpected");
    formData.set("id", "550e8400-e29b-41d4-a716-446655440000");

    const result = await updateFutureExpenseAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.updateFutureExpensePayable).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      expect.objectContaining({
        occurrenceType: "unexpected",
      })
    );
  });
});
