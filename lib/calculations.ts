export function calcAdditions(currentValue: number, originalValue: number | null) {
  if (originalValue === null) return null;
  return currentValue - originalValue;
}

export function calcGrowthPct(currentValue: number, originalValue: number | null) {
  if (!originalValue || originalValue === 0) return null;
  return ((currentValue - originalValue) / originalValue) * 100;
}

export function calcDiscountValue(currentValue: number, proposedValue: number) {
  return currentValue - proposedValue;
}

export function calcDiscountPct(currentValue: number, proposedValue: number) {
  if (currentValue === 0) return null;
  return ((currentValue - proposedValue) / currentValue) * 100;
}

export function calcRemainingInstallments(total: number | null, paid: number | null) {
  if (total === null || paid === null) return null;
  return total - paid;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parseBRL(value: string): number {
  const clean = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(clean);
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}
