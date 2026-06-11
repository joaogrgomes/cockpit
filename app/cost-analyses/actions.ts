"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  createCostAnalysisItem,
  deleteCostAnalysisItem,
  getCostAnalysisById,
  updateCostAnalysisItem,
  upsertCostAnalysisBaseIncome,
} from "@/lib/services/cost-analysis.service";
import {
  CostAnalysisBaseIncomeSchema,
  CostAnalysisItemSchema,
} from "@/lib/validations";

type CostAnalysisActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateCostAnalysisPages() {
  revalidatePath("/cost-analyses");
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

function parseBaseIncomeFormData(formData: FormData) {
  const payload = {
    analysisId: parseOptionalText(formData.get("analysisId")) ?? "",
    baseNetIncomeCents: parseMoneyToCents(formData.get("baseNetIncome")) ?? 0,
    baseGrossIncomeCents: parseMoneyToCents(formData.get("baseGrossIncome")) ?? 0,
  };

  return CostAnalysisBaseIncomeSchema.safeParse(payload);
}

function parseCostAnalysisItemFormData(formData: FormData) {
  const payload = {
    analysisId: parseOptionalText(formData.get("analysisId")) ?? "",
    itemId: parseOptionalText(formData.get("itemId")) ?? null,
    name: parseOptionalText(formData.get("name")) ?? "",
    monthlyAmountCents: parseMoneyToCents(formData.get("monthlyAmount")) ?? 0,
    costKind: parseOptionalText(formData.get("costKind")) ?? "",
    notes: parseOptionalTextOrNull(formData.get("notes")),
  };

  return CostAnalysisItemSchema.safeParse(payload);
}

export async function updateCostAnalysisBaseIncomeAction(
  formData: FormData
): Promise<CostAnalysisActionResult> {
  const parsed = parseBaseIncomeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const analysis = await getCostAnalysisById(parsed.data.analysisId);
  if (!analysis) {
    return { ok: false, error: "Análise não encontrada" };
  }

  await upsertCostAnalysisBaseIncome(parsed.data);
  revalidateCostAnalysisPages();
  return { ok: true };
}

export async function createCostAnalysisItemAction(
  formData: FormData
): Promise<CostAnalysisActionResult> {
  const parsed = parseCostAnalysisItemFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const analysis = await getCostAnalysisById(parsed.data.analysisId);
  if (!analysis) {
    return { ok: false, error: "Análise não encontrada" };
  }

  const created = await createCostAnalysisItem({
    analysisId: parsed.data.analysisId,
    name: parsed.data.name,
    monthlyAmountCents: parsed.data.monthlyAmountCents,
    costKind: parsed.data.costKind,
    notes: parsed.data.notes,
  });

  if (!created) {
    return { ok: false, error: "Não foi possível criar o item." };
  }

  revalidateCostAnalysisPages();
  return { ok: true };
}

export async function updateCostAnalysisItemAction(
  formData: FormData
): Promise<CostAnalysisActionResult> {
  const parsed = parseCostAnalysisItemFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (!parsed.data.itemId) {
    return { ok: false, error: "ID do item é obrigatório" };
  }

  const analysis = await getCostAnalysisById(parsed.data.analysisId);
  if (!analysis) {
    return { ok: false, error: "Análise não encontrada" };
  }

  const updated = await updateCostAnalysisItem({
    itemId: parsed.data.itemId,
    analysisId: parsed.data.analysisId,
    name: parsed.data.name,
    monthlyAmountCents: parsed.data.monthlyAmountCents,
    costKind: parsed.data.costKind,
    notes: parsed.data.notes,
  });

  if (!updated) {
    return { ok: false, error: "Item não encontrado" };
  }

  revalidateCostAnalysisPages();
  return { ok: true };
}

export async function deleteCostAnalysisItemAction(
  formData: FormData
): Promise<CostAnalysisActionResult> {
  const analysisId = parseOptionalText(formData.get("analysisId")) ?? "";
  const itemId = parseOptionalText(formData.get("itemId")) ?? "";

  if (!analysisId) {
    return { ok: false, error: "ID da análise é obrigatório" };
  }

  if (!itemId) {
    return { ok: false, error: "ID do item é obrigatório" };
  }

  const analysis = await getCostAnalysisById(analysisId);
  if (!analysis) {
    return { ok: false, error: "Análise não encontrada" };
  }

  const deleted = await deleteCostAnalysisItem({ analysisId, itemId });
  if (!deleted) {
    return { ok: false, error: "Item não encontrado" };
  }

  revalidateCostAnalysisPages();
  return { ok: true };
}
