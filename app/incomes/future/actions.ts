"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  cancelFutureIncomeReceivable,
  createFutureIncomeReceivable,
  markFutureIncomeAsReceived,
  updateFutureIncomeReceivable,
} from "@/lib/services/future-income.service";
import {
  FutureIncomeReceivableSchema,
  MarkFutureIncomeAsReceivedSchema,
} from "@/lib/validations";

type FutureIncomeActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateFutureIncomePages() {
  revalidatePath("/incomes/future");
  revalidatePath("/incomes/tracking");
  revalidatePath("/cash-flow");
  revalidatePath("/incomes");
}

function parseOptionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseOptionalTextOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseMoneyToCents(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return parseBRL(trimmed);
}

function parseFutureIncomeFormData(formData: FormData) {
  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    category: parseOptionalText(formData.get("category")) ?? "",
    expectedAmount: parseMoneyToCents(formData.get("expectedAmount")) ?? 0,
    expectedDate: parseOptionalText(formData.get("expectedDate")) ?? "",
    status: "prevista" as const,
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return FutureIncomeReceivableSchema.safeParse(payload);
}

function parseMarkAsReceivedFormData(formData: FormData) {
  const payload = {
    futureIncomeId: parseOptionalText(formData.get("futureIncomeId")) ?? "",
    receivedAmount: parseMoneyToCents(formData.get("receivedAmount")) ?? 0,
    receivedAt: parseOptionalText(formData.get("receivedAt")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return MarkFutureIncomeAsReceivedSchema.safeParse(payload);
}

export async function createFutureIncomeAction(
  formData: FormData
): Promise<FutureIncomeActionResult> {
  const parsed = parseFutureIncomeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await createFutureIncomeReceivable(parsed.data);
  revalidateFutureIncomePages();
  return { ok: true };
}

export async function updateFutureIncomeAction(
  formData: FormData
): Promise<FutureIncomeActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da entrada futura é obrigatório" };
  }

  const parsed = parseFutureIncomeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await updateFutureIncomeReceivable(idValue, parsed.data);
  if (!updated) {
    return { ok: false, error: "Só é possível editar entradas com status prevista." };
  }

  revalidateFutureIncomePages();
  return { ok: true };
}

export async function cancelFutureIncomeAction(
  formData: FormData
): Promise<FutureIncomeActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID da entrada futura é obrigatório" };
  }

  const updated = await cancelFutureIncomeReceivable(idValue);
  if (!updated) {
    return { ok: false, error: "Só é possível cancelar entradas com status prevista." };
  }

  revalidateFutureIncomePages();
  return { ok: true };
}

export async function markFutureIncomeAsReceivedAction(
  formData: FormData
): Promise<FutureIncomeActionResult> {
  const parsed = parseMarkAsReceivedFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const updated = await markFutureIncomeAsReceived({
    ...parsed.data,
    paymentMethod: parsed.data.paymentMethod ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (!updated) {
    return { ok: false, error: "Entrada futura não encontrada ou já finalizada." };
  }

  revalidateFutureIncomePages();
  return { ok: true };
}
