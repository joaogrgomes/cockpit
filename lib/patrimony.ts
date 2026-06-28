import type { PatrimonyAsset, PatrimonyAssetStatus, PatrimonyAssetType } from "@/types";

export const PATRIMONY_ASSET_TYPE_LABELS: Record<PatrimonyAssetType, string> = {
  checking_account: "Conta/Caixa",
  savings: "Poupança",
  piggy_bank: "Reserva",
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

export type PatrimonyAssetClass =
  | "cash_account"
  | "reserve"
  | "investment"
  | "pension"
  | "vehicle"
  | "real_estate"
  | "other";

export type PatrimonyLiquidityBucket = "immediate" | "high" | "medium" | "low" | "very_low";

export type PatrimonyClassTotal = {
  type: PatrimonyAssetClass;
  label: string;
  totalCents: number;
  count: number;
};

export type PatrimonyLiquidityTotal = {
  liquidity: PatrimonyLiquidityBucket;
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

export type PatrimonyLiabilitiesSummary = {
  totalOpenDebtsCents: number;
  debtsCount: number;
};

export type PatrimonyDashboardView = {
  grossAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  availableNowCents: number;
  reservedCents: number;
  lowLiquidityCents: number;
  pensionCents: number;
  useAssetsCents: number;
  assetsCount: number;
  reservedAssetsCount: number;
  institutionsCount: number;
  byAssetType: PatrimonyClassTotal[];
  byLiquidity: PatrimonyLiquidityTotal[];
  byObjective: PatrimonyGroupTotal[];
  byInstitution: PatrimonyGroupTotal[];
  liabilitiesBreakdown: PatrimonyLiabilitiesSummary;
};

export type PatrimonyAssetView = Omit<PatrimonyAsset, "createdAt" | "updatedAt">;

const PATRIMONY_ASSET_CLASS_LABELS: Record<PatrimonyAssetClass, string> = {
  cash_account: "Conta/Caixa",
  reserve: "Reserva",
  investment: "Investimento",
  pension: "Previdência",
  vehicle: "Veículo",
  real_estate: "Imóvel",
  other: "Outros",
};

const PATRIMONY_LIQUIDITY_BUCKET_LABELS: Record<PatrimonyLiquidityBucket, string> = {
  immediate: "Imediata",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  very_low: "Muito baixa",
};

function normalizeGroupingLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

function normalizeSearchText(value: string | null | undefined): string {
  return normalizeGroupingLabel(value, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function getPatrimonySearchableText(asset: PatrimonyAsset): string {
  return normalizeSearchText(
    [asset.name, asset.institution, asset.productName, asset.objective, asset.notes]
      .filter(Boolean)
      .join(" ")
  );
}

export function getPatrimonyAssetClass(asset: PatrimonyAsset): PatrimonyAssetClass {
  if (["checking_account", "savings", "piggy_bank", "cash"].includes(asset.assetType)) {
    if (asset.isReserved) {
      return "reserve";
    }

    return "cash_account";
  }

  if (["cdb", "treasury", "fund"].includes(asset.assetType)) {
    return "investment";
  }

  const searchableText = getPatrimonySearchableText(asset);

  if (includesAny(searchableText, ["previ", "previd", "aposent", "pension"])) {
    return "pension";
  }

  if (includesAny(searchableText, ["carro", "veicul", "automovel", "auto", "moto", "transporte"])) {
    return "vehicle";
  }

  if (
    includesAny(searchableText, [
      "imovel",
      "imobili",
      "casa",
      "apartamento",
      "apart",
      "terreno",
      "resid",
    ])
  ) {
    return "real_estate";
  }

  if (asset.isReserved) {
    return "reserve";
  }

  return "other";
}

export function getPatrimonyAssetClassLabel(assetClass: PatrimonyAssetClass): string {
  return PATRIMONY_ASSET_CLASS_LABELS[assetClass];
}

export function getPatrimonyLiquidityBucket(asset: PatrimonyAsset): PatrimonyLiquidityBucket {
  const assetClass = getPatrimonyAssetClass(asset);
  if (assetClass === "pension") {
    return "very_low";
  }
  if (assetClass === "vehicle" || assetClass === "real_estate") {
    return "low";
  }

  const liquidity = normalizeSearchText(asset.liquidity);
  if (includesAny(liquidity, ["muito baixa", "very low", "extremamente baixa"])) {
    return "very_low";
  }
  if (includesAny(liquidity, ["alta", "high", "d+1", "d1", "1 dia", "1d"])) {
    return "high";
  }
  if (includesAny(liquidity, ["imediata", "immediate", "d+0", "d0", "0d", "a vista", "à vista"])) {
    return "immediate";
  }
  if (includesAny(liquidity, ["media", "média", "medium", "d+30", "d30", "30 dias", "30d"])) {
    return "medium";
  }
  if (includesAny(liquidity, ["baixa", "low"])) {
    return "low";
  }

  return "medium";
}

export function getPatrimonyLiquidityBucketLabel(liquidity: PatrimonyLiquidityBucket): string {
  return PATRIMONY_LIQUIDITY_BUCKET_LABELS[liquidity];
}

export function isPatrimonyFinancialAsset(asset: PatrimonyAsset): boolean {
  return asset.assetType !== "other";
}

function isPatrimonyAvailableNowAsset(asset: PatrimonyAsset): boolean {
  if (!isPatrimonyFinancialAsset(asset)) {
    return false;
  }

  if (asset.isReserved) {
    return false;
  }

  const liquidity = getPatrimonyLiquidityBucket(asset);
  return liquidity === "immediate" || liquidity === "high";
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

function buildClassTotals(
  assets: PatrimonyAsset[],
  selector: (asset: PatrimonyAsset) => PatrimonyAssetClass
): PatrimonyClassTotal[] {
  const map = new Map<PatrimonyAssetClass, PatrimonyClassTotal>();

  for (const asset of assets) {
    const type = selector(asset);
    const label = getPatrimonyAssetClassLabel(type);
    const current = map.get(type) ?? { type, label, totalCents: 0, count: 0 };
    current.totalCents += Math.max(0, Math.round(asset.balanceCents));
    current.count += 1;
    map.set(type, current);
  }

  return Array.from(map.values()).sort((left, right) => {
    if (right.totalCents !== left.totalCents) {
      return right.totalCents - left.totalCents;
    }

    return left.label.localeCompare(right.label);
  });
}

function buildLiquidityTotals(
  assets: PatrimonyAsset[],
  selector: (asset: PatrimonyAsset) => PatrimonyLiquidityBucket
): PatrimonyLiquidityTotal[] {
  const map = new Map<PatrimonyLiquidityBucket, PatrimonyLiquidityTotal>();

  for (const asset of assets) {
    const liquidity = selector(asset);
    const label = getPatrimonyLiquidityBucketLabel(liquidity);
    const current = map.get(liquidity) ?? { liquidity, label, totalCents: 0, count: 0 };
    current.totalCents += Math.max(0, Math.round(asset.balanceCents));
    current.count += 1;
    map.set(liquidity, current);
  }

  const ordering: PatrimonyLiquidityBucket[] = ["immediate", "high", "medium", "low", "very_low"];
  return Array.from(map.values()).sort((left, right) => ordering.indexOf(left.liquidity) - ordering.indexOf(right.liquidity));
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

export function calculatePatrimonyDashboard(
  assets: PatrimonyAsset[],
  liabilities: PatrimonyLiabilitiesSummary
): PatrimonyDashboardView {
  const activeAssets = assets.filter((asset) => asset.status === "active");
  const grossAssetsCents = activeAssets.reduce(
    (sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)),
    0
  );

  const reservedCents = activeAssets
    .filter((asset) => {
      return asset.isReserved && isPatrimonyFinancialAsset(asset);
    })
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  const pensionCents = activeAssets
    .filter((asset) => getPatrimonyAssetClass(asset) === "pension")
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  const useAssetsCents = activeAssets
    .filter((asset) => {
      const assetClass = getPatrimonyAssetClass(asset);
      return assetClass === "vehicle" || assetClass === "real_estate";
    })
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  const lowLiquidityCents = activeAssets
    .filter((asset) => {
      const liquidity = getPatrimonyLiquidityBucket(asset);
      const assetClass = getPatrimonyAssetClass(asset);
      return (
        !asset.isReserved &&
        (liquidity === "low" || liquidity === "very_low" || assetClass === "pension")
      );
    })
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  const availableNowCents = activeAssets
    .filter((asset) => isPatrimonyAvailableNowAsset(asset))
    .reduce((sum, asset) => sum + Math.max(0, Math.round(asset.balanceCents)), 0);

  const reservedAssetsCount = activeAssets.filter((asset) => {
    return asset.isReserved && isPatrimonyFinancialAsset(asset);
  }).length;

  return {
    grossAssetsCents,
    totalLiabilitiesCents: Math.max(0, Math.round(liabilities.totalOpenDebtsCents)),
    netWorthCents: grossAssetsCents - Math.max(0, Math.round(liabilities.totalOpenDebtsCents)),
    availableNowCents,
    reservedCents,
    lowLiquidityCents,
    pensionCents,
    useAssetsCents,
    assetsCount: activeAssets.length,
    reservedAssetsCount,
    institutionsCount: new Set(
      activeAssets.map((asset) => normalizeGroupingLabel(asset.institution, "Sem instituição"))
    ).size,
    byAssetType: buildClassTotals(activeAssets, getPatrimonyAssetClass),
    byLiquidity: buildLiquidityTotals(activeAssets, getPatrimonyLiquidityBucket),
    byObjective: buildGroupedTotals(activeAssets, (asset) => asset.objective, "Sem objetivo"),
    byInstitution: buildGroupedTotals(
      activeAssets,
      (asset) => asset.institution ?? "",
      "Sem instituição"
    ),
    liabilitiesBreakdown: {
      totalOpenDebtsCents: Math.max(0, Math.round(liabilities.totalOpenDebtsCents)),
      debtsCount: Math.max(0, Math.round(liabilities.debtsCount)),
    },
  };
}
