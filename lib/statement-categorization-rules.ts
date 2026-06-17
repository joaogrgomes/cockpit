import type {
  StatementCategorizationRule,
  StatementCategorizationRuleMatchType,
} from "@/types";
import type { StatementImportDirection } from "@/lib/statement-import";

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

export type StatementCategorizationRuleMatchCandidate = Omit<
  StatementCategorizationRule,
  "matchType"
> & {
  matchType: StatementCategorizationRuleMatchType;
  isSuggested?: boolean;
};

export function normalizeStatementCategorizationText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "");
}

export function normalizeStatementCategorizationPattern(value: string): string {
  return normalizeStatementCategorizationText(value);
}

export function isStatementCategorizationRuleMatchType(
  value: string
): value is StatementCategorizationRuleMatchType {
  return value === "exact" || value === "contains";
}

export function parseStatementCategorizationRuleMatchType(
  value: string
): StatementCategorizationRuleMatchType {
  return isStatementCategorizationRuleMatchType(value) ? value : "exact";
}

function compareRulePriority(left: StatementCategorizationRuleMatchCandidate, right: StatementCategorizationRuleMatchCandidate): number {
  if (left.matchType !== right.matchType) {
    return left.matchType === "exact" ? -1 : 1;
  }

  if (left.normalizedPattern.length !== right.normalizedPattern.length) {
    return right.normalizedPattern.length - left.normalizedPattern.length;
  }

  const leftUsage = left.usageCount ?? 0;
  const rightUsage = right.usageCount ?? 0;
  if (leftUsage !== rightUsage) {
    return rightUsage - leftUsage;
  }

  const leftUpdatedAt = left.lastUsedAt instanceof Date ? left.lastUsedAt.getTime() : 0;
  const rightUpdatedAt = right.lastUsedAt instanceof Date ? right.lastUsedAt.getTime() : 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  const leftCreatedAt = left.createdAt instanceof Date ? left.createdAt.getTime() : 0;
  const rightCreatedAt = right.createdAt instanceof Date ? right.createdAt.getTime() : 0;
  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return left.id.localeCompare(right.id);
}

export function findBestStatementCategorizationRule(input: {
  description: string;
  direction: StatementImportDirection;
  rules: StatementCategorizationRuleMatchCandidate[];
}): StatementCategorizationRuleMatchCandidate | null {
  const normalizedDescription = normalizeStatementCategorizationPattern(input.description);
  if (!normalizedDescription) {
    return null;
  }

  const matchingRules = input.rules.filter((rule) => {
    if (rule.direction !== input.direction) {
      return false;
    }

    if (rule.matchType === "exact") {
      return rule.normalizedPattern === normalizedDescription;
    }

    return normalizedDescription.includes(rule.normalizedPattern);
  });

  if (matchingRules.length === 0) {
    return null;
  }

  return matchingRules.slice().sort(compareRulePriority)[0] ?? null;
}
