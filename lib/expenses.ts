import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
} from "@/lib/db/schema";
import type { ExpenseCategory, ExpenseType, PaymentMethod } from "@/types";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  moradia: "Moradia",
  dividas: "Dívidas",
  transporte: "Transporte",
  alimentacao: "Alimentação",
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao: "Cartão",
  debito_em_conta: "Débito em conta",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

export { EXPENSE_CATEGORY_VALUES, EXPENSE_TYPE_VALUES, PAYMENT_METHOD_VALUES };

export function getExpenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORY_LABELS[value as ExpenseCategory] ?? value;
}

export function getExpenseTypeLabel(value: string): string {
  return EXPENSE_TYPE_LABELS[value as ExpenseType] ?? value;
}

export function getPaymentMethodLabel(value: string | null): string {
  if (!value) return "-";
  return PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value;
}
