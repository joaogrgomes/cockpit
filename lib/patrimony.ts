import type { PatrimonyAsset, PatrimonyAssetStatus, PatrimonyAssetType } from "@/types";

export const PATRIMONY_ASSET_TYPE_LABELS: Record<PatrimonyAssetType, string> = {
  checking_account: "Conta corrente",
  savings: "Poupança",
  piggy_bank: "Porquinho",
  cdb: "CDB",
  treasury: "Tesouro",
  fund: "Fundo",
  cash: "Dinheiro em espécie",
  other: "Outro",
};

export const PATRIMONY_ASSET_STATUS_LABELS: Record<PatrimonyAssetStatus, string> = {
  active: "Ativo",
  archived: "Arquivado",
};

export type PatrimonyGroupTotal = {
  label: string;
  totalCents: number;
  count: number;
};

export type PatrimonyTotals = {
  totalPatrimonyCents: number;
  reservedPatrimonyCents: number;
  freePatrimonyCents: number;
  totalByObjective: PatrimonyGroupTotal[];
  totalByInstitution: PatrimonyGroupTotal[];
  totalByAssetType: PatrimonyGroupTotal[];
  activeCount: number;
  objectiveCount: number;
  institutionCount: number;
};

export type PatrimonyAssetView = Omit<PatrimonyAsset, "createdAt" | "updatedAt">;

function normalizeGroupingLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function buildGroupedTotals(
  assets: PatrimonyAsset[],
  selector: (asset: PatrimonyAsset) => string,
  fallbackLabel: string
): PatrimonyGroupTotal[] {
  const map = new Map<string, PatrimonyGroupTotal>();

  for (const asset of assets) {
    const label = normalizeGroupingLabel(selector(asset), fallbackLabel);
    const current = map.get(label) ?? { label, totalCents: 0, count: 0 };
    current.totalCents += Math.max(0, Math.round(asset.balanceCents));
    current.count += 1;
    map.set(label, current);
  }

  return Array.from(map.values()).sort((left, right) => {
    if (right.totalCents !== left.totalCents) {
      return right.totalCents - left.totalCents;
    }

    return left.label.localeCompare(right.label);
  });
}

export function getPatrimonyAssetTypeLabel(assetType: PatrimonyAssetType): string {
  return PATRIMONY_ASSET_TYPE_LABELS[assetType];
}

export function getPatrimonyAssetStatusLabel(status: PatrimonyAssetStatus): string {
  return PATRIMONY_ASSET_STATUS_LABELS[status];
}

export function parsePatrimonyAssetType(value: string): PatrimonyAssetType {
  if (value in PATRIMONY_ASSET_TYPE_LABELS) {
    return value as PatrimonyAssetType;
  }

  throw new Error(`Tipo de patrimônio inválido: ${value}`);
}

export function parsePatrimonyAssetStatus(value: string): PatrimonyAssetStatus {
  if (value in PATRIMONY_ASSET_STATUS_LABELS) {
    return value as PatrimonyAssetStatus;
  }

  throw new Error(`Status de patrimônio inválido: ${value}`);
}

export function calculatePatrimonyTotals(assets: PatrimonyAsset[]): PatrimonyTotals {
  const activeAssets = assets.filter((asset) => asset.status === "active");
  const totalPatrimonyCents = activeAssets.reduce(
    (sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)),
    0
  );
  const reservedPatrimonyCents = activeAssets
    .filter((asset) => asset.isReserved)
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);
  const freePatrimonyCents = activeAssets
    .filter((asset) => !asset.isReserved)
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  return {
    totalPatrimonyCents,
    reservedPatrimonyCents,
    freePatrimonyCents,
    totalByObjective: buildGroupedTotals(activeAssets, (asset) => asset.objective, "Sem objetivo"),
    totalByInstitution: buildGroupedTotals(
      activeAssets,
      (asset) => asset.institution ?? "",
      "Sem instituição"
    ),
    totalByAssetType: buildGroupedTotals(
      activeAssets,
      (asset) => getPatrimonyAssetTypeLabel(asset.assetType),
      "Outro"
    ),
    activeCount: activeAssets.length,
    objectiveCount: new Set(activeAssets.map((asset) => normalizeGroupingLabel(asset.objective, "Sem objetivo")))
      .size,
    institutionCount: new Set(
      activeAssets.map((asset) => normalizeGroupingLabel(asset.institution, "Sem instituição"))
    ).size,
  };
}
