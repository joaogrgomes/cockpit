"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  cancelFutureExpensePayable,
  createFutureExpensePayable,
  markFutureExpenseAsRealized,
  updateFutureExpensePayable,
} from "@/lib/services/future-expense.service";
import { getCostAnalysisItemById } from "@/lib/services/cost-analysis.service";
import {
  FutureExpensePayableSchema,
  MarkFutureExpenseAsRealizedSchema,
} from "@/lib/validations";

type FutureExpenseActionResult = {
  ok: boolean;
  error?: string;
};

function getFutureExpenseActionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível processar o gasto futuro.";
}

function revalidateFutureExpensePages() {
  revalidatePath("/expenses/future");
  revalidatePath("/expenses/tracking");
  revalidatePath("/cash-flow");
  revalidatePath("/expenses");
  revalidatePath("/cost-analyses");
  revalidatePath("/payment-agenda");
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

function parseFutureExpenseFormData(formData: FormData) {
  const payload = {
    name: parseOptionalText(formData.get("name")) ?? "",
    category: parseOptionalText(formData.get("category")) ?? "",
    expenseType: parseOptionalText(formData.get("expenseType")) ?? "",
    occurrenceType: parseOptionalText(formData.get("occurrenceType")) ?? "planned_one_off",
    costAnalysisItemId: parseOptionalTextOrNull(formData.get("costAnalysisItemId")),
    expectedAmount: parseMoneyToCents(formData.get("expectedAmount")) ?? 0,
    expectedDate: parseOptionalText(formData.get("expectedDate")) ?? "",
    status: "previsto" as const,
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return FutureExpensePayableSchema.safeParse(payload);
}

function parseMarkAsRealizedFormData(formData: FormData) {
  const payload = {
    futureExpenseId: parseOptionalText(formData.get("futureExpenseId")) ?? "",
    realizedAmount: parseMoneyToCents(formData.get("realizedAmount")) ?? 0,
    paidAt: parseOptionalText(formData.get("paidAt")) ?? "",
    paymentMethod: parseOptionalTextOrNull(formData.get("paymentMethod")),
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return MarkFutureExpenseAsRealizedSchema.safeParse(payload);
}

export async function createFutureExpenseAction(
  formData: FormData
): Promise<FutureExpenseActionResult> {
  const parsed = parseFutureExpenseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (parsed.data.costAnalysisItemId) {
    const linkedItem = await getCostAnalysisItemById(parsed.data.costAnalysisItemId);
    if (!linkedItem) {
      return { ok: false, error: "Item da análise de custo não encontrado" };
    }
  }

  await createFutureExpensePayable(parsed.data);
  revalidateFutureExpensePages();
  return { ok: true };
}

export async function updateFutureExpenseAction(
  formData: FormData
): Promise<FutureExpenseActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do gasto futuro é obrigatório" };
  }

  const parsed = parseFutureExpenseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (parsed.data.costAnalysisItemId) {
    const linkedItem = await getCostAnalysisItemById(parsed.data.costAnalysisItemId);
    if (!linkedItem) {
      return { ok: false, error: "Item da análise de custo não encontrado" };
    }
  }

  const updated = await updateFutureExpensePayable(idValue, parsed.data);
  if (!updated) {
    return { ok: false, error: "Só é possível editar gastos com status previsto." };
  }

  revalidateFutureExpensePages();
  return { ok: true };
}

export async function cancelFutureExpenseAction(
  formData: FormData
): Promise<FutureExpenseActionResult> {
  const idValue = formData.get("id");
  if (typeof idValue !== "string" || !idValue) {
    return { ok: false, error: "ID do gasto futuro é obrigatório" };
  }

  const updated = await cancelFutureExpensePayable(idValue);
  if (!updated) {
    return { ok: false, error: "Só é possível cancelar gastos com status previsto." };
  }

  revalidateFutureExpensePages();
  return { ok: true };
}

export async function markFutureExpenseAsRealizedAction(
  formData: FormData
): Promise<FutureExpenseActionResult> {
  try {
    const parsed = parseMarkAsRealizedFormData(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const updated = await markFutureExpenseAsRealized({
      ...parsed.data,
      paymentMethod: parsed.data.paymentMethod ?? null,
      notes: parsed.data.notes ?? null,
    });
    if (!updated) {
      return { ok: false, error: "Gasto futuro não encontrado ou já finalizado." };
    }

    revalidateFutureExpensePages();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getFutureExpenseActionErrorMessage(error) };
  }
}
