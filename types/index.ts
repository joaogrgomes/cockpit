import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  DEBT_STATUS_VALUES,
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  INCOME_CATEGORY_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  PAYMENT_METHOD_VALUES,
  PROPOSAL_STATUS_VALUES,
  debts,
  monthlyIncomeEntries,
  monthlyIncomes,
  monthlyExpenseEntries,
  monthlyExpenses,
  debtProposals,
  debtValueUpdates,
} from "@/lib/db/schema";

export type Debt = InferSelectModel<typeof debts>;
export type NewDebt = InferInsertModel<typeof debts>;

export type DebtProposal = InferSelectModel<typeof debtProposals>;
export type NewDebtProposal = InferInsertModel<typeof debtProposals>;

export type DebtValueUpdate = InferSelectModel<typeof debtValueUpdates>;
export type NewDebtValueUpdate = InferInsertModel<typeof debtValueUpdates>;

export type MonthlyExpense = InferSelectModel<typeof monthlyExpenses>;
export type NewMonthlyExpense = InferInsertModel<typeof monthlyExpenses>;
export type MonthlyExpenseEntry = InferSelectModel<typeof monthlyExpenseEntries>;
export type NewMonthlyExpenseEntry = InferInsertModel<typeof monthlyExpenseEntries>;
export type MonthlyIncome = InferSelectModel<typeof monthlyIncomes>;
export type NewMonthlyIncome = InferInsertModel<typeof monthlyIncomes>;
export type MonthlyIncomeEntry = InferSelectModel<typeof monthlyIncomeEntries>;
export type NewMonthlyIncomeEntry = InferInsertModel<typeof monthlyIncomeEntries>;

export type DebtStatus = (typeof DEBT_STATUS_VALUES)[number];
export type DebtProposalStatus = (typeof PROPOSAL_STATUS_VALUES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number];
export type ExpenseType = (typeof EXPENSE_TYPE_VALUES)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORY_VALUES)[number];
export type IncomePaymentMethod = (typeof INCOME_PAYMENT_METHOD_VALUES)[number];
