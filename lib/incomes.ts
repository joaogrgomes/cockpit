import {
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
} from "@/lib/db/schema";
import type { IncomeCategory, IncomePaymentMethod } from "@/types";

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salario: "Salário",
  freela: "Freela",
  reembolso: "Reembolso",
  beneficio: "Benefício",
  venda: "Venda",
  rendimento: "Rendimento",
  presente: "Presente",
  outros: "Outros",
};

export const INCOME_PAYMENT_METHOD_LABELS: Record<IncomePaymentMethod, string> = {
  pix: "Pix",
  transferencia: "Transferência",
  deposito: "Depósito",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export { INCOME_CATEGORY_VALUES, INCOME_PAYMENT_METHOD_VALUES };

export function getIncomeCategoryLabel(value: string): string {
  return INCOME_CATEGORY_LABELS[value as IncomeCategory] ?? value;
}

export function getIncomePaymentMethodLabel(value: string | null): string {
  if (!value) return "-";
  return INCOME_PAYMENT_METHOD_LABELS[value as IncomePaymentMethod] ?? value;
}
