import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { patrimonyAssets } from "@/lib/db/schema";
import {
  parsePatrimonyAssetStatus,
  parsePatrimonyAssetType,
} from "@/lib/patrimony";
import type {
  PatrimonyAsset,
  PatrimonyAssetStatus,
  PatrimonyAssetType,
} from "@/types";

type DbClient = ReturnType<typeof getDb>;

export type PatrimonyAssetMutationResult =
  | { ok: true; asset: PatrimonyAsset }
  | {
      ok: false;
      code: "ASSET_NOT_FOUND" | "INVALID_INPUT" | "UNKNOWN_ERROR";
      error: string;
    };

export type PatrimonyAssetUpsertInput = {
  name: string;
  institution?: string | null;
  productName?: string | null;
  assetType: PatrimonyAssetType;
  objective: string;
  balanceCents: number;
  liquidity?: string | null;
  profitabilityLabel?: string | null;
  isReserved: boolean;
  notes?: string | null;
  status?: PatrimonyAssetStatus;
};

type PatrimonyAssetDbRow = {
  id: string;
  name: string;
  institution: string | null;
  productName: string | null;
  assetType: string;
  objective: string;
  balanceCents: number;
  liquidity: string | null;
  profitabilityLabel: string | null;
  isReserved: boolean;
  notes: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function normalizePatrimonyAssetRow(row: PatrimonyAssetDbRow): PatrimonyAsset {
  return {
    ...row,
    assetType: parsePatrimonyAssetType(row.assetType),
    status: parsePatrimonyAssetStatus(row.status),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

function sortPatrimonyAssets(left: PatrimonyAsset, right: PatrimonyAsset): number {
  if (left.status !== right.status) {
    return left.status === "active" ? -1 : 1;
  }

  if (left.balanceCents !== right.balanceCents) {
    return right.balanceCents - left.balanceCents;
  }

  if (left.name !== right.name) {
    return left.name.localeCompare(right.name);
  }

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

async function getPatrimonyAssetById(
  db: Pick<DbClient, "select">,
  id: string
): Promise<PatrimonyAsset | null> {
  const rows = await db
    .select()
    .from(patrimonyAssets)
    .where(eq(patrimonyAssets.id, id))
    .limit(1);

  const row = rows[0] as PatrimonyAssetDbRow | undefined;
  return row ? normalizePatrimonyAssetRow(row) : null;
}

export async function listPatrimonyAssets(): Promise<PatrimonyAsset[]> {
  const db = getDb();
  const rows = (await db.select().from(patrimonyAssets)) as PatrimonyAssetDbRow[];

  return rows.map((row) => normalizePatrimonyAssetRow(row)).sort(sortPatrimonyAssets);
}

export async function createPatrimonyAsset(
  input: PatrimonyAssetUpsertInput
): Promise<PatrimonyAssetMutationResult> {
  const db = getDb();

  try {
    const inserted = await db
      .insert(patrimonyAssets)
      .values({
        name: input.name.trim(),
        institution: input.institution?.trim() || null,
        productName: input.productName?.trim() || null,
        assetType: input.assetType,
        objective: input.objective.trim(),
        balanceCents: Math.max(0, Math.round(input.balanceCents)),
        liquidity: input.liquidity?.trim() || null,
        profitabilityLabel: input.profitabilityLabel?.trim() || null,
        isReserved: input.isReserved,
        notes: input.notes?.trim() || null,
        status: input.status ?? "active",
        updatedAt: sql`now()`,
      })
      .returning();

    const asset = inserted[0] as PatrimonyAssetDbRow | undefined;
    return asset
      ? { ok: true, asset: normalizePatrimonyAssetRow(asset) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível criar o ativo patrimonial." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível criar o ativo patrimonial.",
    };
  }
}

export async function updatePatrimonyAsset(
  id: string,
  input: PatrimonyAssetUpsertInput
): Promise<PatrimonyAssetMutationResult> {
  const db = getDb();
  const existing = await getPatrimonyAssetById(db, id);

  if (!existing) {
    return { ok: false, code: "ASSET_NOT_FOUND", error: "Ativo patrimonial não encontrado." };
  }

  if (existing.status === "archived") {
    return { ok: false, code: "INVALID_INPUT", error: "Ativo arquivado não pode ser editado." };
  }

  try {
    const updated = await db
      .update(patrimonyAssets)
      .set({
        name: input.name.trim(),
        institution: input.institution?.trim() || null,
        productName: input.productName?.trim() || null,
        assetType: input.assetType,
        objective: input.objective.trim(),
        balanceCents: Math.max(0, Math.round(input.balanceCents)),
        liquidity: input.liquidity?.trim() || null,
        profitabilityLabel: input.profitabilityLabel?.trim() || null,
        isReserved: input.isReserved,
        notes: input.notes?.trim() || null,
        updatedAt: sql`now()`,
      })
      .where(eq(patrimonyAssets.id, id))
      .returning();

    const asset = updated[0] as PatrimonyAssetDbRow | undefined;
    return asset
      ? { ok: true, asset: normalizePatrimonyAssetRow(asset) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível atualizar o ativo patrimonial." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível atualizar o ativo patrimonial.",
    };
  }
}

export async function archivePatrimonyAsset(id: string): Promise<PatrimonyAssetMutationResult> {
  const db = getDb();
  const existing = await getPatrimonyAssetById(db, id);

  if (!existing) {
    return { ok: false, code: "ASSET_NOT_FOUND", error: "Ativo patrimonial não encontrado." };
  }

  if (existing.status === "archived") {
    return { ok: true, asset: existing };
  }

  try {
    const updated = await db
      .update(patrimonyAssets)
      .set({
        status: "archived",
        updatedAt: sql`now()`,
      })
      .where(eq(patrimonyAssets.id, id))
      .returning();

    const asset = updated[0] as PatrimonyAssetDbRow | undefined;
    return asset
      ? { ok: true, asset: normalizePatrimonyAssetRow(asset) }
      : { ok: false, code: "UNKNOWN_ERROR", error: "Não foi possível arquivar o ativo patrimonial." };
  } catch (error) {
    return {
      ok: false,
      code: "UNKNOWN_ERROR",
      error: error instanceof Error ? error.message : "Não foi possível arquivar o ativo patrimonial.",
    };
  }
}

