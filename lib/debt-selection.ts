import { normalizeDateOnly } from "@/lib/date-utils";
import type { Debt, DebtProposal, DebtStatus, DebtType } from "@/types";

export type DebtPayoffProposalView = DebtProposal & {
  isCurrent: boolean;
  isExpired: boolean;
};

export type DebtSelectionItem = Debt & {
  latestPayoffProposal: DebtPayoffProposalView | null;
  hasPayoffProposal: boolean;
};

export type DebtSelectionFilters = {
  searchText: string;
  includedCreditors: string[];
  excludedCreditors: string[];
  debtTypes: DebtType[];
  statuses: DebtStatus[];
  proposalAvailability: "all" | "with" | "without";
  sort: "current_desc" | "current_asc";
};

export type DebtSelectionSummary = {
  filteredCount: number;
  totalCurrentValueCents: number;
  totalProposalValueCents: number;
  debtsWithoutProposalCount: number;
  debtsWithoutProposal: Array<{
    id: string;
    name: string;
    creditor: string;
  }>;
  estimatedSavingsCents: number;
  expiredProposalCount: number;
};

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

function compareDateOnlyDescending(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  const aNormalized = normalizeDateOnly(a) ?? "";
  const bNormalized = normalizeDateOnly(b) ?? "";

  if (aNormalized === bNormalized) return 0;
  return aNormalized < bNormalized ? 1 : -1;
}

function compareDateTimeDescending(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): number {
  const aTime = a instanceof Date ? a.getTime() : new Date(a ?? 0).getTime();
  const bTime = b instanceof Date ? b.getTime() : new Date(b ?? 0).getTime();

  if (aTime === bTime) return 0;
  return bTime - aTime;
}

export function isCurrentPayoffProposal(proposal: DebtProposal): boolean {
  if (proposal.status !== "ativa") {
    return false;
  }

  const expiresAt = normalizeDateOnly(proposal.expiresAt);
  return !expiresAt || expiresAt >= normalizeDateOnly(new Date())!;
}

export function isExpiredPayoffProposal(proposal: DebtProposal): boolean {
  if (proposal.status === "expirada") {
    return true;
  }

  if (proposal.status !== "ativa") {
    return false;
  }

  const expiresAt = normalizeDateOnly(proposal.expiresAt);
  if (!expiresAt) return false;

  return expiresAt < normalizeDateOnly(new Date())!;
}

export function selectLatestPayoffProposal(
  proposals: DebtProposal[] | null | undefined
): DebtPayoffProposalView | null {
  if (!proposals || proposals.length === 0) {
    return null;
  }

  const currentActive = proposals.filter((proposal) => isCurrentPayoffProposal(proposal));
  const candidatePool = currentActive.length > 0 ? currentActive : proposals;
  const selected = candidatePool.slice().sort((a, b) => {
    const proposedAtCmp = compareDateOnlyDescending(a.proposedAt, b.proposedAt);
    if (proposedAtCmp !== 0) return proposedAtCmp;

    const createdAtCmp = compareDateTimeDescending(a.createdAt, b.createdAt);
    if (createdAtCmp !== 0) return createdAtCmp;

    return a.id.localeCompare(b.id);
  })[0];

  if (!selected) {
    return null;
  }

  return {
    ...selected,
    isCurrent: currentActive.some((proposal) => proposal.id === selected.id),
    isExpired: isExpiredPayoffProposal(selected),
  };
}

export function filterDebtSelectionItems(
  items: DebtSelectionItem[],
  filters: DebtSelectionFilters
): DebtSelectionItem[] {
  const search = normalizeSearchText(filters.searchText);
  const includedCreditors = new Set(filters.includedCreditors);
  const excludedCreditors = new Set(filters.excludedCreditors);
  const selectedTypes = new Set(filters.debtTypes);
  const selectedStatuses = new Set(filters.statuses);

  return items.filter((item) => {
    if (search) {
      const haystack = normalizeSearchText(`${item.name} ${item.creditor}`);
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (includedCreditors.size > 0 && !includedCreditors.has(item.creditor)) {
      return false;
    }

    if (excludedCreditors.has(item.creditor)) {
      return false;
    }

    if (selectedTypes.size > 0 && !selectedTypes.has(item.debtType as DebtType)) {
      return false;
    }

    if (selectedStatuses.size > 0 && !selectedStatuses.has(item.status as DebtStatus)) {
      return false;
    }

    if (filters.proposalAvailability === "with" && !item.hasPayoffProposal) {
      return false;
    }

    if (filters.proposalAvailability === "without" && item.hasPayoffProposal) {
      return false;
    }

    return true;
  });
}

export function sortDebtSelectionItems(
  items: DebtSelectionItem[],
  sort: DebtSelectionFilters["sort"]
): DebtSelectionItem[] {
  return items.slice().sort((a, b) => {
    const currentValueCmp =
      sort === "current_asc" ? a.currentValue - b.currentValue : b.currentValue - a.currentValue;
    if (currentValueCmp !== 0) {
      return currentValueCmp;
    }

    const lastUpdatedCmp = compareDateTimeDescending(a.lastUpdatedAt, b.lastUpdatedAt);
    if (lastUpdatedCmp !== 0) {
      return lastUpdatedCmp;
    }

    return a.id.localeCompare(b.id);
  });
}

export function calculateDebtSelectionSummary(items: DebtSelectionItem[]): DebtSelectionSummary {
  let totalCurrentValueCents = 0;
  let totalProposalValueCents = 0;
  let estimatedSavingsCents = 0;
  let expiredProposalCount = 0;
  const debtsWithoutProposal: DebtSelectionSummary["debtsWithoutProposal"] = [];

  for (const item of items) {
    totalCurrentValueCents += item.currentValue;

    const proposal = item.latestPayoffProposal;
    if (!proposal) {
      debtsWithoutProposal.push({
        id: item.id,
        name: item.name,
        creditor: item.creditor,
      });
      continue;
    }

    totalProposalValueCents += proposal.proposedValue;
    estimatedSavingsCents += item.currentValue - proposal.proposedValue;

    if (proposal.isExpired) {
      expiredProposalCount += 1;
    }
  }

  return {
    filteredCount: items.length,
    totalCurrentValueCents,
    totalProposalValueCents,
    debtsWithoutProposalCount: debtsWithoutProposal.length,
    debtsWithoutProposal,
    estimatedSavingsCents,
    expiredProposalCount,
  };
}

export function setCreditorFilterMode(
  filters: Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors">,
  creditor: string,
  mode: "include" | "exclude"
): Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors"> {
  if (mode === "include") {
    return {
      includedCreditors: Array.from(new Set([...filters.includedCreditors, creditor])),
      excludedCreditors: filters.excludedCreditors.filter((item) => item !== creditor),
    };
  }

  return {
    includedCreditors: filters.includedCreditors.filter((item) => item !== creditor),
    excludedCreditors: Array.from(new Set([...filters.excludedCreditors, creditor])),
  };
}

export function toggleCreditorFilterMode(
  filters: Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors">,
  creditor: string,
  mode: "include" | "exclude"
): Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors"> {
  const isInTargetGroup =
    mode === "include"
      ? filters.includedCreditors.includes(creditor)
      : filters.excludedCreditors.includes(creditor);

  if (mode === "include") {
    return {
      includedCreditors: isInTargetGroup
        ? filters.includedCreditors.filter((item) => item !== creditor)
        : Array.from(new Set([...filters.includedCreditors, creditor])),
      excludedCreditors: filters.excludedCreditors.filter((item) => item !== creditor),
    };
  }

  return {
    includedCreditors: filters.includedCreditors.filter((item) => item !== creditor),
    excludedCreditors: isInTargetGroup
      ? filters.excludedCreditors.filter((item) => item !== creditor)
      : Array.from(new Set([...filters.excludedCreditors, creditor])),
  };
}

export function removeCreditorFromFilters(
  filters: Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors">,
  creditor: string
): Pick<DebtSelectionFilters, "includedCreditors" | "excludedCreditors"> {
  return {
    includedCreditors: filters.includedCreditors.filter((item) => item !== creditor),
    excludedCreditors: filters.excludedCreditors.filter((item) => item !== creditor),
  };
}
