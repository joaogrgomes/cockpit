import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  EXPENSE_TYPE_VALUES,
  FUTURE_EXPENSE_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
} from "@/lib/db/schema";
import type {
  ExpenseCategory,
  ExpenseOccurrenceType,
  ExpenseType,
  FutureExpenseStatus,
  PaymentMethod,
} from "@/types";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  moradia: "Moradia",
  dividas: "Dívidas",
  transporte: "Transporte",
  alimentacao: "Alimentação",
  esportes: "Esportes",
  beleza_cuidados: "Beleza e cuidados",
  reserva: "Reserva",
  doacoes: "Doações",
  lazer: "Lazer",
  educacao: "Educação",
  saude: "Saúde",
  compras: "Compras",
  servicos: "Serviços",
  assinaturas: "Assinaturas",
  familia: "Família",
  impostos: "Impostos",
  outros: "Outros",
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  fixo: "Fixo",
  variavel: "Variável",
};

export const EXPENSE_OCCURRENCE_TYPE_LABELS: Record<ExpenseOccurrenceType, string> = {
  planned_one_off: "Esporádico planejado",
  unexpected: "Imprevisto",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao: "Cartão",
  debito_em_conta: "Débito em conta",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

export const FUTURE_EXPENSE_STATUS_LABELS: Record<FutureExpenseStatus, string> = {
  previsto: "Previsto",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  EXPENSE_TYPE_VALUES,
  FUTURE_EXPENSE_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
};

export function getExpenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORY_LABELS[value as ExpenseCategory] ?? value;
}

export function getExpenseTypeLabel(value: string): string {
  return EXPENSE_TYPE_LABELS[value as ExpenseType] ?? value;
}

export function getExpenseOccurrenceTypeLabel(value: string | null): string {
  if (!value) return "-";
  return EXPENSE_OCCURRENCE_TYPE_LABELS[value as ExpenseOccurrenceType] ?? value;
}

export function getPaymentMethodLabel(value: string | null): string {
  if (!value) return "-";
  return PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value;
}

export function getFutureExpenseStatusLabel(value: string): string {
  return FUTURE_EXPENSE_STATUS_LABELS[value as FutureExpenseStatus] ?? value;
}
