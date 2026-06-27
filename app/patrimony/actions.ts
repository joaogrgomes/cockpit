"use server";

import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/calculations";
import {
  archivePatrimonyAsset,
  createPatrimonyAsset,
  updatePatrimonyAsset,
} from "@/lib/services/patrimony.service";
import { PatrimonyAssetSchema } from "@/lib/validations";

type PatrimonyActionResult = {
  ok: boolean;
  error?: string;
};

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

function parseBoolean(value: FormDataEntryValue | null, fallback = true): boolean {
  if (typeof value !== "string") return fallback;

  if (value === "true") return true;
  if (value === "false") return false;

  return fallback;
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

function parsePatrimonyAssetFormData(formData: FormData) {
  const payload = {
    assetId: parseOptionalText(formData.get("assetId")) ?? null,
    name: parseOptionalText(formData.get("name")) ?? "",
    institution: parseOptionalTextOrNull(formData.get("institution")),
    productName: parseOptionalTextOrNull(formData.get("productName")),
    assetType: parseOptionalText(formData.get("assetType")) ?? "",
    objective: parseOptionalText(formData.get("objective")) ?? "",
    balanceCents: parseMoneyToCents(formData.get("balanceCents")) ?? 0,
    liquidity: parseOptionalTextOrNull(formData.get("liquidity")),
    profitabilityLabel: parseOptionalTextOrNull(formData.get("profitabilityLabel")),
    isReserved: parseBoolean(formData.get("isReserved"), true),
    notes: parseOptionalTextOrNull(formData.get("notes")),
    status: "active",
  };

  return PatrimonyAssetSchema.safeParse(payload);
}

function revalidatePatrimonyPages() {
  revalidatePath("/patrimony");
}

export async function createPatrimonyAssetAction(
  formData: FormData
): Promise<PatrimonyActionResult> {
  const parsed = parsePatrimonyAssetFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await createPatrimonyAsset({
    name: parsed.data.name,
    institution: parsed.data.institution,
    productName: parsed.data.productName,
    assetType: parsed.data.assetType,
    objective: parsed.data.objective,
    balanceCents: parsed.data.balanceCents,
    liquidity: parsed.data.liquidity,
    profitabilityLabel: parsed.data.profitabilityLabel,
    isReserved: parsed.data.isReserved,
    notes: parsed.data.notes,
    status: parsed.data.status,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePatrimonyPages();
  return { ok: true };
}

export async function updatePatrimonyAssetAction(
  formData: FormData
): Promise<PatrimonyActionResult> {
  const parsed = parsePatrimonyAssetFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (!parsed.data.assetId) {
    return { ok: false, error: "ID do ativo é obrigatório" };
  }

  const result = await updatePatrimonyAsset(parsed.data.assetId, {
    name: parsed.data.name,
    institution: parsed.data.institution,
    productName: parsed.data.productName,
    assetType: parsed.data.assetType,
    objective: parsed.data.objective,
    balanceCents: parsed.data.balanceCents,
    liquidity: parsed.data.liquidity,
    profitabilityLabel: parsed.data.profitabilityLabel,
    isReserved: parsed.data.isReserved,
    notes: parsed.data.notes,
    status: parsed.data.status,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePatrimonyPages();
  return { ok: true };
}

export async function archivePatrimonyAssetAction(
  formData: FormData
): Promise<PatrimonyActionResult> {
  const assetId = parseOptionalText(formData.get("assetId")) ?? "";
  if (!assetId) {
    return { ok: false, error: "ID do ativo é obrigatório" };
  }

  const result = await archivePatrimonyAsset(assetId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePatrimonyPages();
  return { ok: true };
}

