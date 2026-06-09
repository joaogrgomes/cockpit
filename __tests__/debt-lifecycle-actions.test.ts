import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createDebt: vi.fn(),
  deleteDebt: vi.fn(),
  updateDebt: vi.fn(),
  markDebtAsPaid: vi.fn(),
  confirmDebtClearance: vi.fn(),
  archiveDebt: vi.fn(),
  createDebtAttachment: vi.fn(),
  createActiveProposal: vi.fn(),
  createDebtValueUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/services/debt.service", () => ({
  createDebt: mocks.createDebt,
  deleteDebt: mocks.deleteDebt,
  updateDebt: mocks.updateDebt,
}));

vi.mock("@/lib/services/debt-lifecycle.service", () => ({
  markDebtAsPaid: mocks.markDebtAsPaid,
  confirmDebtClearance: mocks.confirmDebtClearance,
  archiveDebt: mocks.archiveDebt,
}));

vi.mock("@/lib/services/debt-attachment.service", () => ({
  createDebtAttachment: mocks.createDebtAttachment,
}));

vi.mock("@/lib/services/proposal.service", () => ({
  createActiveProposal: mocks.createActiveProposal,
}));

vi.mock("@/lib/services/value-update.service", () => ({
  createDebtValueUpdate: mocks.createDebtValueUpdate,
}));

import {
  archiveDebtAction,
  confirmDebtClearanceAction,
  createDebtAttachmentAction,
  markDebtAsPaidAction,
} from "@/app/debts/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("debt lifecycle actions", () => {
  it("marca dívida como paga e envia o comprovante opcional", async () => {
    mocks.markDebtAsPaid.mockResolvedValue({ ok: true, debt: { id: "debt-1" } });

    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("paidAt", "2026-06-09");
    formData.set("paidAmount", "125000");
    formData.set("paymentMethod", "pix");
    formData.set("clearanceDueDate", "2026-06-16");
    formData.set("paymentNotes", "Pago com desconto");
    formData.set("attachmentType", "payment_receipt");
    formData.set(
      "attachmentFile",
      new File(["comprovante"], "comprovante.pdf", { type: "application/pdf" })
    );

    const result = await markDebtAsPaidAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.markDebtAsPaid).toHaveBeenCalledWith(
      expect.objectContaining({
        debtId: "550e8400-e29b-41d4-a716-446655440000",
        paidAt: "2026-06-09",
        paidAmount: 125000,
        paymentMethod: "pix",
        clearanceDueDate: "2026-06-16",
        paymentNotes: "Pago com desconto",
        attachment: expect.objectContaining({
          type: "payment_receipt",
        }),
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/debts");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/debts/550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("rejeita anexo maior que 10 MB ao marcar como paga", async () => {
    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("paidAt", "2026-06-09");
    formData.set("attachmentType", "payment_receipt");
    formData.set(
      "attachmentFile",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.pdf", {
        type: "application/pdf",
      })
    );

    const result = await markDebtAsPaidAction(formData);

    expect(result).toEqual({
      ok: false,
      error: "O arquivo é muito grande. Envie um arquivo de até 10 MB.",
    });
    expect(mocks.markDebtAsPaid).not.toHaveBeenCalled();
  });

  it("confirma a baixa da dívida", async () => {
    mocks.confirmDebtClearance.mockResolvedValue({ ok: true, debt: { id: "debt-1" } });

    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("clearedAt", "2026-06-09");
    formData.set("paymentNotes", "Baixa confirmada");
    formData.set("attachmentType", "serasa_clearance");

    const result = await confirmDebtClearanceAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.confirmDebtClearance).toHaveBeenCalledWith(
      expect.objectContaining({
        debtId: "550e8400-e29b-41d4-a716-446655440000",
        clearedAt: "2026-06-09",
        paymentNotes: "Baixa confirmada",
        attachment: null,
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/decision");
  });

  it("arquiva dívida sem excluir o histórico", async () => {
    mocks.archiveDebt.mockResolvedValue({ ok: true, debt: { id: "debt-1" } });

    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");

    const result = await archiveDebtAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.archiveDebt).toHaveBeenCalledWith({
      debtId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/debts");
  });

  it("cria anexo de documento", async () => {
    mocks.createDebtAttachment.mockResolvedValue({ id: "attachment-1" });

    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("attachmentType", "whatsapp_screenshot");
    formData.set("notes", "Print da negociação");
    formData.set("attachmentFile", new File(["print"], "print.png", { type: "image/png" }));

    const result = await createDebtAttachmentAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.createDebtAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        debtId: "550e8400-e29b-41d4-a716-446655440000",
        type: "whatsapp_screenshot",
        notes: "Print da negociação",
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/debts/550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("rejeita tipo inválido de anexo", async () => {
    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("attachmentType", "arquivo_invalido");
    formData.set("notes", "Teste");
    formData.set("attachmentFile", new File(["print"], "print.png", { type: "image/png" }));

    const result = await createDebtAttachmentAction(formData);

    expect(result).toEqual({
      ok: false,
      error: "Tipo de anexo inválido.",
    });
    expect(mocks.createDebtAttachment).not.toHaveBeenCalled();
  });

  it("rejeita MIME inválido de anexo", async () => {
    const formData = new FormData();
    formData.set("debtId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("attachmentType", "other");
    formData.set("notes", "Texto puro");
    formData.set("attachmentFile", new File(["texto"], "arquivo.txt", { type: "text/plain" }));

    const result = await createDebtAttachmentAction(formData);

    expect(result).toEqual({
      ok: false,
      error: "Tipo de arquivo não permitido. Envie PDF, PNG, JPG/JPEG ou WebP.",
    });
    expect(mocks.createDebtAttachment).not.toHaveBeenCalled();
  });
});
