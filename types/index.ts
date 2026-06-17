import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  DEBT_STATUS_VALUES,
  DEBT_TYPE_VALUES,
  COST_ANALYSIS_KIND_VALUES,
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_TYPE_VALUES,
  EXPENSE_OCCURRENCE_TYPE_VALUES,
  FUTURE_EXPENSE_STATUS_VALUES,
  INCOME_CATEGORY_VALUES,
  FUTURE_INCOME_STATUS_VALUES,
  MONTHLY_CLOSING_STATUS_VALUES,
  INCOME_PAYMENT_METHOD_VALUES,
  PAYMENT_METHOD_VALUES,
  PROPOSAL_STATUS_VALUES,
  DEBT_ATTACHMENT_TYPE_VALUES,
  STATEMENT_IMPORT_BATCH_STATUS_VALUES,
  STATEMENT_CATEGORIZATION_RULE_MATCH_TYPE_VALUES,
  STATEMENT_IMPORT_ROW_ENTRY_TYPE_VALUES,
  STATEMENT_IMPORT_ROW_STATUS_VALUES,
  STATEMENT_IMPORT_SOURCE_VALUES,
  debts,
  cashFlowSettings,
  monthlyIncomeEntries,
  futureIncomeReceivables,
  monthlyClosings,
  monthlyIncomes,
  monthlyExpenseEntries,
  monthlyExpenses,
  futureExpensePayables,
  debtAttachments,
  debtProposals,
  debtValueUpdates,
  costAnalyses,
  costAnalysisItems,
  statementCategorizationRules,
  statementImportBatches,
  statementImportRows,
} from "@/lib/db/schema";

export type Debt = InferSelectModel<typeof debts>;
export type NewDebt = InferInsertModel<typeof debts>;

export type DebtProposal = InferSelectModel<typeof debtProposals>;
export type NewDebtProposal = InferInsertModel<typeof debtProposals>;

export type DebtValueUpdate = InferSelectModel<typeof debtValueUpdates>;
export type NewDebtValueUpdate = InferInsertModel<typeof debtValueUpdates>;
export type DebtAttachment = InferSelectModel<typeof debtAttachments>;
export type NewDebtAttachment = InferInsertModel<typeof debtAttachments>;

export type CostAnalysis = InferSelectModel<typeof costAnalyses>;
export type NewCostAnalysis = InferInsertModel<typeof costAnalyses>;
export type CostAnalysisItem = InferSelectModel<typeof costAnalysisItems>;
export type NewCostAnalysisItem = InferInsertModel<typeof costAnalysisItems>;

export type MonthlyExpense = InferSelectModel<typeof monthlyExpenses>;
export type NewMonthlyExpense = InferInsertModel<typeof monthlyExpenses>;
export type MonthlyExpenseEntry = InferSelectModel<typeof monthlyExpenseEntries>;
export type NewMonthlyExpenseEntry = InferInsertModel<typeof monthlyExpenseEntries>;
export type FutureExpensePayable = InferSelectModel<typeof futureExpensePayables>;
export type NewFutureExpensePayable = InferInsertModel<typeof futureExpensePayables>;
export type MonthlyIncome = InferSelectModel<typeof monthlyIncomes>;
export type NewMonthlyIncome = InferInsertModel<typeof monthlyIncomes>;
export type MonthlyIncomeEntry = InferSelectModel<typeof monthlyIncomeEntries>;
export type NewMonthlyIncomeEntry = InferInsertModel<typeof monthlyIncomeEntries>;
export type FutureIncomeReceivable = InferSelectModel<typeof futureIncomeReceivables>;
export type NewFutureIncomeReceivable = InferInsertModel<typeof futureIncomeReceivables>;
export type MonthlyClosing = InferSelectModel<typeof monthlyClosings>;
export type NewMonthlyClosing = InferInsertModel<typeof monthlyClosings>;
export type CashFlowSettings = InferSelectModel<typeof cashFlowSettings>;
export type NewCashFlowSettings = InferInsertModel<typeof cashFlowSettings>;

export type DebtStatus = (typeof DEBT_STATUS_VALUES)[number];
export type DebtType = (typeof DEBT_TYPE_VALUES)[number];
export type DebtProposalStatus = (typeof PROPOSAL_STATUS_VALUES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number];
export type ExpenseType = (typeof EXPENSE_TYPE_VALUES)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];
export type FutureExpenseStatus = (typeof FUTURE_EXPENSE_STATUS_VALUES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORY_VALUES)[number];
export type IncomePaymentMethod = (typeof INCOME_PAYMENT_METHOD_VALUES)[number];
export type FutureIncomeStatus = (typeof FUTURE_INCOME_STATUS_VALUES)[number];
export type MonthlyClosingStatus = (typeof MONTHLY_CLOSING_STATUS_VALUES)[number];
export type ExpenseOccurrenceType = (typeof EXPENSE_OCCURRENCE_TYPE_VALUES)[number];
export type DebtAttachmentType = (typeof DEBT_ATTACHMENT_TYPE_VALUES)[number];
export type CostAnalysisKind = (typeof COST_ANALYSIS_KIND_VALUES)[number];

export type StatementImportBatch = InferSelectModel<typeof statementImportBatches>;
export type NewStatementImportBatch = InferInsertModel<typeof statementImportBatches>;
export type StatementImportRow = Omit<InferSelectModel<typeof statementImportRows>, "status"> & {
  status: StatementImportRowStatus;
  suggestedRuleId?: string | null;
  suggestedMatchType?: StatementCategorizationRuleMatchType | null;
  suggestedCategory?: string | null;
  suggestedExpenseType?: ExpenseType | null;
  suggestedOccurrenceType?: ExpenseOccurrenceType | null;
  suggestedMonthlyExpenseId?: string | null;
  suggestedMonthlyIncomeId?: string | null;
  isSuggested?: boolean;
};
export type NewStatementImportRow = InferInsertModel<typeof statementImportRows>;
export type StatementCategorizationRule = InferSelectModel<typeof statementCategorizationRules>;
export type NewStatementCategorizationRule = InferInsertModel<typeof statementCategorizationRules>;
export type StatementImportSource = (typeof STATEMENT_IMPORT_SOURCE_VALUES)[number];
export type StatementImportBatchStatus = (typeof STATEMENT_IMPORT_BATCH_STATUS_VALUES)[number];
export type StatementImportRowStatus = (typeof STATEMENT_IMPORT_ROW_STATUS_VALUES)[number];
export type StatementImportRowEntryType = (typeof STATEMENT_IMPORT_ROW_ENTRY_TYPE_VALUES)[number];
export type StatementCategorizationRuleMatchType =
  (typeof STATEMENT_CATEGORIZATION_RULE_MATCH_TYPE_VALUES)[number];
