import { formatBRL } from "@/lib/calculations";
import { getPatrimonyAssetClass, type PatrimonyAssetClass } from "@/lib/patrimony";
import type { PatrimonyAsset, PatrimonyAssetType } from "@/types";

export const PATRIMONY_GUIDED_ASSET_CATEGORY_VALUES = [
  "cash_account",
  "reserve",
  "investment",
  "pension",
  "vehicle",
  "real_estate",
  "other",
] as const;

export type PatrimonyGuidedAssetCategory = (typeof PATRIMONY_GUIDED_ASSET_CATEGORY_VALUES)[number];

export type PatrimonyGuidedAssetFormValues = {
  name: string;
  institution: string;
  productName: string;
  assetType: PatrimonyAssetType;
  objective: string;
  balance: string;
  liquidity: string;
  profitabilityLabel: string;
  isReserved: "true" | "false";
  notes: string;
};

const GUIDED_CATEGORY_LABELS: Record<PatrimonyGuidedAssetCategory, string> = {
  cash_account: "Conta/Caixa",
  reserve: "Reserva/provisionamento",
  investment: "Investimento",
  pension: "Previdência",
  vehicle: "Veículo",
  real_estate: "Imóvel/outro bem",
  other: "Outro",
};

const GUIDED_CATEGORY_DESCRIPTIONS: Record<PatrimonyGuidedAssetCategory, string> = {
  cash_account: "Dinheiro livre para uso imediato.",
  reserve: "Dinheiro separado para um objetivo específico.",
  investment: "Aplicações financeiras com alguma rentabilidade.",
  pension: "Recursos de longo prazo ou aposentadoria.",
  vehicle: "Bem de uso, como carro ou moto.",
  real_estate: "Imóvel ou bem de uso patrimonial.",
  other: "Quando o cadastro não se encaixar nas opções acima.",
};

type PresetDefaults = Pick<
  PatrimonyGuidedAssetFormValues,
  "assetType" | "institution" | "productName" | "objective" | "liquidity" | "isReserved"
>;

function normalizeGuidedAssetCategory(category: PatrimonyAssetClass): PatrimonyGuidedAssetCategory {
  return category;
}

export function getPatrimonyGuidedAssetCategoryLabel(category: PatrimonyGuidedAssetCategory): string {
  return GUIDED_CATEGORY_LABELS[category];
}

export function getPatrimonyGuidedAssetCategoryDescription(
  category: PatrimonyGuidedAssetCategory
): string {
  return GUIDED_CATEGORY_DESCRIPTIONS[category];
}

export function getPatrimonyGuidedAssetCategoryDefaults(
  category: PatrimonyGuidedAssetCategory
): PresetDefaults {
  switch (category) {
    case "cash_account":
      return {
        assetType: "checking_account",
        institution: "",
        productName: "",
        objective: "Livre",
        liquidity: "Imediata",
        isReserved: "false",
      };
    case "reserve":
      return {
        assetType: "piggy_bank",
        institution: "",
        productName: "Reserva / provisionamento",
        objective: "Emergência",
        liquidity: "Imediata",
        isReserved: "true",
      };
    case "investment":
      return {
        assetType: "cdb",
        institution: "",
        productName: "CDB",
        objective: "Investimento",
        liquidity: "Alta",
        isReserved: "false",
      };
    case "pension":
      return {
        assetType: "other",
        institution: "Previ",
        productName: "Previdência",
        objective: "Aposentadoria / Longo prazo",
        liquidity: "Muito baixa",
        isReserved: "true",
      };
    case "vehicle":
      return {
        assetType: "other",
        institution: "",
        productName: "Veículo",
        objective: "Transporte familiar",
        liquidity: "Baixa",
        isReserved: "false",
      };
    case "real_estate":
      return {
        assetType: "other",
        institution: "",
        productName: "Imóvel",
        objective: "Moradia / Patrimônio de uso",
        liquidity: "Baixa",
        isReserved: "false",
      };
    case "other":
      return {
        assetType: "other",
        institution: "",
        productName: "",
        objective: "Outro",
        liquidity: "Média",
        isReserved: "false",
      };
  }
}

export function getPatrimonyGuidedAssetCategoryFromAsset(
  asset: PatrimonyAsset
): PatrimonyGuidedAssetCategory {
  return normalizeGuidedAssetCategory(getPatrimonyAssetClass(asset));
}

export function getPatrimonyGuidedAssetFormInitialValues(
  asset?: PatrimonyAsset
): {
  category: PatrimonyGuidedAssetCategory;
  values: PatrimonyGuidedAssetFormValues;
} {
  const category = asset ? getPatrimonyGuidedAssetCategoryFromAsset(asset) : "cash_account";
  const defaults = getPatrimonyGuidedAssetCategoryDefaults(category);

  return {
    category,
    values: {
      name: asset?.name ?? "",
      institution: asset?.institution ?? defaults.institution,
      productName: asset?.productName ?? defaults.productName,
      assetType: asset?.assetType ?? defaults.assetType,
      objective: asset?.objective ?? defaults.objective,
      balance: typeof asset?.balanceCents === "number" ? formatBRL(asset.balanceCents) : "",
      liquidity: asset?.liquidity ?? defaults.liquidity,
      profitabilityLabel: asset?.profitabilityLabel ?? "",
      isReserved: asset ? (asset.isReserved ? "true" : "false") : defaults.isReserved,
      notes: asset?.notes ?? "",
    },
  };
}

export function applyPatrimonyGuidedAssetCategory(
  values: PatrimonyGuidedAssetFormValues,
  category: PatrimonyGuidedAssetCategory
): PatrimonyGuidedAssetFormValues {
  const defaults = getPatrimonyGuidedAssetCategoryDefaults(category);

  return {
    ...values,
    assetType: defaults.assetType,
    institution: defaults.institution,
    productName: defaults.productName,
    objective: defaults.objective,
    liquidity: defaults.liquidity,
    isReserved: defaults.isReserved,
  };
}
