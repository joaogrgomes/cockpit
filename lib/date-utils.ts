const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string | null | undefined): value is string {
  return typeof value === "string" && DATE_ONLY_REGEX.test(value);
}

export function normalizeDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    if (DATE_ONLY_REGEX.test(value)) return value;

    const datePart = value.slice(0, 10);
    if (DATE_ONLY_REGEX.test(datePart)) return datePart;

    return null;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnlyBR(value: string | Date | null | undefined): string {
  if (!value) return "—";

  const normalized = normalizeDateOnly(value);
  if (!normalized) return "—";

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

export function getLocalDateInputValue(date: Date = new Date()): string {
  return normalizeDateOnly(date) ?? "";
}
