import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const DEBT_STATUS_VALUES = [
  "em_aberto",
  "em_atraso",
  "em_negociacao",
  "parcelada",
  "quitada",
  "aguardando_baixa",
  "baixada",
  "arquivada",
  "suspensa",
] as const;

export const DEBT_TYPE_VALUES = ["payoff", "structural"] as const;

export const DEBT_CLOSED_STATUS_VALUES = [
  "quitada",
  "aguardando_baixa",
  "baixada",
  "arquivada",
] as const;

export const DEBT_ATTACHMENT_TYPE_VALUES = [
  "proposal_slip",
  "whatsapp_screenshot",
  "payment_receipt",
  "serasa_clearance",
  "other",
] as const;

export const PROPOSAL_STATUS_VALUES = [
  "ativa",
  "expirada",
  "recusada",
  "aceita",
  "substituida",
] as const;

export const DEBT_SETTLEMENT_OPTION_KIND_VALUES = ["cash", "installment"] as const;
export const DEBT_SETTLEMENT_OPTION_STATUS_VALUES = [
  "active",
  "expired",
  "accepted",
  "rejected",
  "archived",
] as const;

export const STATEMENT_IMPORT_SOURCE_VALUES = ["inter_csv"] as const;
export const STATEMENT_IMPORT_BATCH_STATUS_VALUES = [
  "parsed",
  "partially_committed",
  "committed",
  "cancelled",
] as const;
export const STATEMENT_IMPORT_ROW_STATUS_VALUES = [
  "pending",
  "ignored",
  "committed",
  "skipped_duplicate",
] as const;
export const STATEMENT_IMPORT_ROW_ENTRY_TYPE_VALUES = [
  "monthly_income_entry",
  "monthly_expense_entry",
] as const;
export const STATEMENT_CATEGORIZATION_RULE_MATCH_TYPE_VALUES = ["exact", "contains"] as const;

export const EXPENSE_CATEGORY_VALUES = [
  "moradia",
  "dividas",
  "transporte",
  "alimentacao",
  "esportes",
  "beleza_cuidados",
  "reserva",
  "doacoes",
  "lazer",
  "educacao",
  "saude",
  "compras",
  "servicos",
  "assinaturas",
  "familia",
  "impostos",
  "outros",
] as const;

export const EXPENSE_TYPE_VALUES = ["fixo", "variavel"] as const;

export const PAYMENT_METHOD_VALUES = [
  "pix",
  "boleto",
  "cartao",
  "debito_em_conta",
  "dinheiro",
  "transferencia",
  "outro",
] as const;

export const INCOME_CATEGORY_VALUES = [
  "salario",
  "freela",
  "reembolso",
  "beneficio",
  "venda",
  "rendimento",
  "presente",
  "outros",
] as const;

export const INCOME_PAYMENT_METHOD_VALUES = [
  "pix",
  "transferencia",
  "deposito",
  "dinheiro",
  "outro",
] as const;

export const FUTURE_INCOME_STATUS_VALUES = [
  "prevista",
  "recebida",
  "cancelada",
] as const;

export const FUTURE_EXPENSE_STATUS_VALUES = [
  "previsto",
  "realizado",
  "cancelado",
] as const;

export const EXPENSE_OCCURRENCE_TYPE_VALUES = [
  "planned_one_off",
  "unexpected",
] as const;

export const MONTHLY_CLOSING_STATUS_VALUES = ["closed"] as const;

export const COST_ANALYSIS_KIND_VALUES = [
  "cash",
  "economic",
  "provision",
] as const;

export const PATRIMONY_ASSET_TYPE_VALUES = [
  "checking_account",
  "savings",
  "piggy_bank",
  "cdb",
  "treasury",
  "fund",
  "cash",
  "other",
] as const;

export const PATRIMONY_ASSET_STATUS_VALUES = ["active", "archived"] as const;
export const BUDGET_AREA_SETTINGS_SCOPE_VALUES = ["global"] as const;

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    creditor: text("creditor").notNull(),
    type: text("type").notNull(),
    debtType: text("debt_type").notNull().default("payoff"),
    status: text("status").notNull().default("em_aberto"),
    currentValue: integer("current_value").notNull(),
    originalValue: integer("original_value"),
    monthlyPayment: integer("monthly_payment"),
    dueDay: integer("due_day"),
    dueDate: date("due_date"),
    totalInstallments: integer("total_installments"),
    paidInstallments: integer("paid_installments"),
    overdueSince: date("overdue_since"),
    paidAt: date("paid_at"),
    paidAmount: integer("paid_amount"),
    paymentMethod: text("payment_method"),
    clearanceDueDate: date("clearance_due_date"),
    clearedAt: date("cleared_at"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    paymentNotes: text("payment_notes"),
    priority: text("priority"),
    perceivedRisk: text("perceived_risk"),
    notes: text("notes"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("debts_current_value_positive", sql`${table.currentValue} > 0`),
    check("debts_original_value_positive", sql`${table.originalValue} IS NULL OR ${table.originalValue} > 0`),
    check("debts_monthly_payment_positive", sql`${table.monthlyPayment} IS NULL OR ${table.monthlyPayment} > 0`),
    check("debts_due_day_valid", sql`${table.dueDay} IS NULL OR (${table.dueDay} BETWEEN 1 AND 31)`),
    check(
      "debts_total_installments_positive",
      sql`${table.totalInstallments} IS NULL OR ${table.totalInstallments} > 0`
    ),
    check("debts_paid_installments_non_negative", sql`${table.paidInstallments} IS NULL OR ${table.paidInstallments} >= 0`),
    check(
      "debts_paid_installments_valid",
      sql`${table.paidInstallments} IS NULL OR ${table.totalInstallments} IS NULL OR ${table.paidInstallments} <= ${table.totalInstallments}`
    ),
    check(
      "debts_status_valid",
      sql`${table.status} IN ('em_aberto','em_atraso','em_negociacao','parcelada','quitada','aguardando_baixa','baixada','arquivada','suspensa')`
    ),
    check("debts_debt_type_valid", sql`${table.debtType} IN ('payoff','structural')`),
    check(
      "debts_paid_amount_positive",
      sql`${table.paidAmount} IS NULL OR ${table.paidAmount} > 0`
    ),
    check(
      "debts_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro')`
    ),
    index("idx_debts_status").on(table.status),
    index("idx_debts_debt_type").on(table.debtType),
  ]
);

export const debtProposals = pgTable(
  "debt_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    proposedValue: integer("proposed_value").notNull(),
    proposedAt: date("proposed_at").notNull(),
    expiresAt: date("expires_at"),
    origin: text("origin"),
    status: text("status").notNull().default("ativa"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("debt_proposals_proposed_value_positive", sql`${table.proposedValue} > 0`),
    check(
      "debt_proposals_expiry_valid",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} >= ${table.proposedAt}`
    ),
    check(
      "debt_proposals_status_valid",
      sql`${table.status} IN ('ativa','expirada','recusada','aceita','substituida')`
    ),
    index("idx_debt_proposals_debt_status").on(table.debtId, table.status),
  ]
);

export const debtSettlementOptions = pgTable(
  "debt_settlement_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    installments: integer("installments").notNull(),
    totalAmountCents: integer("total_amount_cents").notNull(),
    upfrontAmountCents: integer("upfront_amount_cents").notNull().default(0),
    monthlyInstallmentCents: integer("monthly_installment_cents"),
    firstDueDate: date("first_due_date"),
    validUntil: date("valid_until"),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "debt_settlement_options_kind_valid",
      sql`${table.kind} IN ('cash','installment')`
    ),
    check(
      "debt_settlement_options_installments_valid",
      sql`${table.installments} > 0`
    ),
    check(
      "debt_settlement_options_total_amount_positive",
      sql`${table.totalAmountCents} > 0`
    ),
    check(
      "debt_settlement_options_upfront_amount_non_negative",
      sql`${table.upfrontAmountCents} >= 0`
    ),
    check(
      "debt_settlement_options_monthly_installment_positive",
      sql`${table.monthlyInstallmentCents} IS NULL OR ${table.monthlyInstallmentCents} > 0`
    ),
    check(
      "debt_settlement_options_status_valid",
      sql`${table.status} IN ('active','expired','accepted','rejected','archived')`
    ),
    check(
      "debt_settlement_options_cash_fields_valid",
      sql`(${table.kind} <> 'cash') OR (${table.installments} = 1 AND ${table.monthlyInstallmentCents} IS NULL AND ${table.upfrontAmountCents} = ${table.totalAmountCents})`
    ),
    check(
      "debt_settlement_options_installment_fields_valid",
      sql`(${table.kind} <> 'installment') OR (${table.installments} > 1 AND ${table.monthlyInstallmentCents} IS NOT NULL AND ${table.firstDueDate} IS NOT NULL)`
    ),
    check(
      "debt_settlement_options_valid_until_valid",
      sql`${table.validUntil} IS NULL OR ${table.firstDueDate} IS NULL OR ${table.validUntil} >= ${table.firstDueDate}`
    ),
    index("idx_debt_settlement_options_debt_status").on(table.debtId, table.status),
    index("idx_debt_settlement_options_debt_created").on(table.debtId, table.createdAt),
  ]
);

export const debtValueUpdates = pgTable(
  "debt_value_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    recordedValue: integer("recorded_value").notNull(),
    recordedAt: date("recorded_at").notNull(),
    source: text("source"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("debt_value_updates_recorded_value_positive", sql`${table.recordedValue} > 0`),
    index("idx_debt_value_updates_debt_date").on(table.debtId, table.recordedAt),
  ]
);

export const debtAttachments = pgTable(
  "debt_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "debt_attachments_type_valid",
      sql`${table.type} IN ('proposal_slip','whatsapp_screenshot','payment_receipt','serasa_clearance','other')`
    ),
    check("debt_attachments_size_bytes_positive", sql`${table.sizeBytes} IS NULL OR ${table.sizeBytes} > 0`),
    index("idx_debt_attachments_debt_created").on(table.debtId, table.createdAt),
  ]
);

export const costAnalyses = pgTable(
  "cost_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    baseNetIncomeCents: integer("base_net_income_cents").notNull().default(0),
    baseGrossIncomeCents: integer("base_gross_income_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cost_analyses_base_net_income_non_negative", sql`${table.baseNetIncomeCents} >= 0`),
    check("cost_analyses_base_gross_income_non_negative", sql`${table.baseGrossIncomeCents} >= 0`),
    uniqueIndex("ux_cost_analyses_slug").on(table.slug),
  ]
);

export const costAnalysisItems = pgTable(
  "cost_analysis_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    costAnalysisId: uuid("cost_analysis_id")
      .notNull()
      .references(() => costAnalyses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    monthlyAmountCents: integer("monthly_amount_cents").notNull().default(0),
    costKind: text("cost_kind").notNull(),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cost_analysis_items_monthly_amount_non_negative", sql`${table.monthlyAmountCents} >= 0`),
    check(
      "cost_analysis_items_cost_kind_valid",
      sql`${table.costKind} IN ('cash','economic','provision')`
    ),
    index("idx_cost_analysis_items_analysis_sort").on(table.costAnalysisId, table.sortOrder),
  ]
);

export const patrimonyAssets = pgTable(
  "patrimony_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    institution: text("institution"),
    productName: text("product_name"),
    assetType: text("asset_type").notNull(),
    objective: text("objective").notNull(),
    balanceCents: integer("balance_cents").notNull().default(0),
    liquidity: text("liquidity"),
    profitabilityLabel: text("profitability_label"),
    isReserved: boolean("is_reserved").notNull().default(true),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("patrimony_assets_name_required", sql`${table.name} <> ''`),
    check("patrimony_assets_objective_required", sql`${table.objective} <> ''`),
    check("patrimony_assets_balance_non_negative", sql`${table.balanceCents} >= 0`),
    check(
      "patrimony_assets_asset_type_valid",
      sql`${table.assetType} IN ('checking_account','savings','piggy_bank','cdb','treasury','fund','cash','other')`
    ),
    check("patrimony_assets_status_valid", sql`${table.status} IN ('active','archived')`),
    index("idx_patrimony_assets_status").on(table.status),
    index("idx_patrimony_assets_type").on(table.assetType),
  ]
);

export const monthlyExpenses = pgTable(
  "monthly_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    expenseType: text("expense_type").notNull(),
    startMonth: text("start_month").notNull(),
    endMonth: text("end_month"),
    paymentMethod: text("payment_method"),
    dueDay: integer("due_day"),
    dueLabel: text("due_label"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("monthly_expenses_amount_positive", sql`${table.amount} > 0`),
    check("monthly_expenses_due_day_valid", sql`${table.dueDay} IS NULL OR (${table.dueDay} BETWEEN 1 AND 31)`),
    check(
      "monthly_expenses_type_valid",
      sql`${table.expenseType} IN ('fixo','variavel')`
    ),
    check(
      "monthly_expenses_start_month_valid",
      sql`${table.startMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check(
      "monthly_expenses_end_month_valid",
      sql`${table.endMonth} IS NULL OR (${table.endMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND ${table.endMonth} >= ${table.startMonth})`
    ),
    check(
      "monthly_expenses_category_valid",
      sql`${table.category} IN ('moradia','dividas','transporte','alimentacao','esportes','beleza_cuidados','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros')`
    ),
    check(
      "monthly_expenses_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro')`
    ),
    index("idx_monthly_expenses_active_due_day").on(table.isActive, table.dueDay),
    index("idx_monthly_expenses_category_type").on(table.category, table.expenseType),
    index("idx_monthly_expenses_period").on(table.startMonth, table.endMonth),
  ]
);

export const monthlyExpensePauses = pgTable(
  "monthly_expense_pauses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monthlyExpenseId: uuid("monthly_expense_id")
      .notNull()
      .references(() => monthlyExpenses.id, { onDelete: "cascade" }),
    startMonth: text("start_month").notNull(),
    endMonth: text("end_month"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "monthly_expense_pauses_start_month_valid",
      sql`${table.startMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check(
      "monthly_expense_pauses_end_month_valid",
      sql`${table.endMonth} IS NULL OR (${table.endMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND ${table.endMonth} >= ${table.startMonth})`
    ),
    index("idx_monthly_expense_pauses_expense_month").on(table.monthlyExpenseId, table.startMonth),
    index("idx_monthly_expense_pauses_expense").on(table.monthlyExpenseId),
  ]
);

export const monthlyExpenseEntries = pgTable(
  "monthly_expense_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monthlyExpenseId: uuid("monthly_expense_id").references(() => monthlyExpenses.id, {
      onDelete: "cascade",
    }),
    name: text("name"),
    category: text("category"),
    expenseType: text("expense_type"),
    occurrenceType: text("occurrence_type"),
    periodMonth: text("period_month").notNull(),
    amount: integer("amount").notNull(),
    paidAt: date("paid_at").notNull(),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("monthly_expense_entries_amount_positive", sql`${table.amount} > 0`),
    check(
      "monthly_expense_entries_period_month_valid",
      sql`${table.periodMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check(
      "monthly_expense_entries_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro')`
    ),
    check(
      "monthly_expense_entries_category_valid",
      sql`${table.category} IS NULL OR ${table.category} IN ('moradia','dividas','transporte','alimentacao','esportes','beleza_cuidados','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros')`
    ),
    check(
      "monthly_expense_entries_type_valid",
      sql`${table.expenseType} IS NULL OR ${table.expenseType} IN ('fixo','variavel')`
    ),
    check(
      "monthly_expense_entries_occurrence_type_valid",
      sql`${table.occurrenceType} IS NULL OR ${table.occurrenceType} IN ('planned_one_off','unexpected')`
    ),
    check(
      "monthly_expense_entries_requires_fields_when_unlinked",
      sql`${table.monthlyExpenseId} IS NOT NULL OR (${table.name} IS NOT NULL AND ${table.category} IS NOT NULL AND ${table.expenseType} IS NOT NULL AND ${table.occurrenceType} IS NOT NULL)`
    ),
    index("idx_monthly_expense_entries_period_month").on(table.periodMonth),
    index("idx_monthly_expense_entries_expense_period").on(
      table.monthlyExpenseId,
      table.periodMonth
    ),
    index("idx_monthly_expense_entries_paid_at").on(table.paidAt),
  ]
);

export const futureExpensePayables = pgTable(
  "future_expense_payables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    expenseType: text("expense_type").notNull(),
    occurrenceType: text("occurrence_type").notNull().default("planned_one_off"),
    expectedAmount: integer("expected_amount").notNull(),
    expectedDate: date("expected_date").notNull(),
    status: text("status").notNull().default("previsto"),
    costAnalysisItemId: uuid("cost_analysis_item_id").references(() => costAnalysisItems.id, {
      onDelete: "set null",
    }),
    realizedEntryId: uuid("realized_entry_id").references(() => monthlyExpenseEntries.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("future_expense_payables_expected_amount_positive", sql`${table.expectedAmount} > 0`),
    check(
      "future_expense_payables_status_valid",
      sql`${table.status} IN ('previsto','realizado','cancelado')`
    ),
    check(
      "future_expense_payables_category_valid",
      sql`${table.category} IN ('moradia','dividas','transporte','alimentacao','esportes','beleza_cuidados','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros')`
    ),
    check(
      "future_expense_payables_type_valid",
      sql`${table.expenseType} IN ('fixo','variavel')`
    ),
    check(
      "future_expense_payables_occurrence_type_valid",
      sql`${table.occurrenceType} IN ('planned_one_off','unexpected')`
    ),
    index("idx_future_expense_payables_status_date").on(table.status, table.expectedDate),
    index("idx_future_expense_payables_expected_date").on(table.expectedDate),
    index("idx_future_expense_payables_category").on(table.category),
    index("idx_future_expense_payables_cost_analysis_item").on(table.costAnalysisItemId),
  ]
);

export const monthlyIncomes = pgTable(
  "monthly_incomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    expectedDay: integer("expected_day"),
    startMonth: text("start_month").notNull(),
    endMonth: text("end_month"),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("monthly_incomes_amount_positive", sql`${table.amount} > 0`),
    check(
      "monthly_incomes_expected_day_valid",
      sql`${table.expectedDay} IS NULL OR (${table.expectedDay} BETWEEN 1 AND 31)`
    ),
    check(
      "monthly_incomes_category_valid",
      sql`${table.category} IN ('salario','freela','reembolso','beneficio','venda','rendimento','presente','outros')`
    ),
    check(
      "monthly_incomes_start_month_valid",
      sql`${table.startMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check(
      "monthly_incomes_end_month_valid",
      sql`${table.endMonth} IS NULL OR (${table.endMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND ${table.endMonth} >= ${table.startMonth})`
    ),
    check(
      "monthly_incomes_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','transferencia','deposito','dinheiro','outro')`
    ),
    index("idx_monthly_incomes_active_expected_day").on(table.isActive, table.expectedDay),
    index("idx_monthly_incomes_category").on(table.category),
    index("idx_monthly_incomes_period").on(table.startMonth, table.endMonth),
  ]
);

export const monthlyIncomeEntries = pgTable(
  "monthly_income_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monthlyIncomeId: uuid("monthly_income_id").references(() => monthlyIncomes.id, {
      onDelete: "cascade",
    }),
    name: text("name"),
    category: text("category"),
    periodMonth: text("period_month").notNull(),
    amount: integer("amount").notNull(),
    receivedAt: date("received_at").notNull(),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("monthly_income_entries_amount_positive", sql`${table.amount} > 0`),
    check(
      "monthly_income_entries_period_month_valid",
      sql`${table.periodMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check(
      "monthly_income_entries_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','transferencia','deposito','dinheiro','outro')`
    ),
    check(
      "monthly_income_entries_category_valid",
      sql`${table.category} IS NULL OR ${table.category} IN ('salario','freela','reembolso','beneficio','venda','rendimento','presente','outros')`
    ),
    check(
      "monthly_income_entries_requires_name_category_when_unlinked",
      sql`${table.monthlyIncomeId} IS NOT NULL OR (${table.name} IS NOT NULL AND ${table.category} IS NOT NULL)`
    ),
    index("idx_monthly_income_entries_period_month").on(table.periodMonth),
    index("idx_monthly_income_entries_income_period").on(
      table.monthlyIncomeId,
      table.periodMonth
    ),
    index("idx_monthly_income_entries_received_at").on(table.receivedAt),
  ]
);

export const futureIncomeReceivables = pgTable(
  "future_income_receivables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    expectedAmount: integer("expected_amount").notNull(),
    expectedDate: date("expected_date").notNull(),
    status: text("status").notNull().default("prevista"),
    receivedEntryId: uuid("received_entry_id").references(() => monthlyIncomeEntries.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("future_income_receivables_expected_amount_positive", sql`${table.expectedAmount} > 0`),
    check(
      "future_income_receivables_status_valid",
      sql`${table.status} IN ('prevista','recebida','cancelada')`
    ),
    check(
      "future_income_receivables_category_valid",
      sql`${table.category} IN ('salario','freela','reembolso','beneficio','venda','rendimento','presente','outros')`
    ),
    index("idx_future_income_receivables_status_date").on(table.status, table.expectedDate),
    index("idx_future_income_receivables_expected_date").on(table.expectedDate),
    index("idx_future_income_receivables_category").on(table.category),
  ]
);

export const statementImportBatches = pgTable(
  "statement_import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull().default("inter_csv"),
    originalFilename: text("original_filename"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    status: text("status").notNull().default("parsed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "statement_import_batches_source_valid",
      sql`${table.source} IN ('inter_csv')`
    ),
    check(
      "statement_import_batches_status_valid",
      sql`${table.status} IN ('parsed','partially_committed','committed','cancelled')`
    ),
  ]
);

export const statementImportRows = pgTable(
  "statement_import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => statementImportBatches.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("inter_csv"),
    rowIndex: integer("row_index").notNull(),
    rowHash: text("row_hash").notNull(),
    externalId: text("external_id"),
    transactionDate: date("transaction_date").notNull(),
    rawHistory: text("raw_history"),
    rawDescription: text("raw_description").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    balanceAfterCents: integer("balance_after_cents"),
    direction: text("direction").notNull(),
    status: text("status").notNull().default("pending"),
    createdEntryType: text("created_entry_type"),
    createdEntryId: uuid("created_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "statement_import_rows_source_valid",
      sql`${table.source} IN ('inter_csv')`
    ),
    check("statement_import_rows_row_index_positive", sql`${table.rowIndex} > 0`),
    check("statement_import_rows_amount_positive", sql`${table.amountCents} > 0`),
    check(
      "statement_import_rows_direction_valid",
      sql`${table.direction} IN ('income','expense')`
    ),
    check(
      "statement_import_rows_status_valid",
      sql`${table.status} IN ('pending','ignored','committed','skipped_duplicate')`
    ),
    check(
      "statement_import_rows_created_entry_type_valid",
      sql`${table.createdEntryType} IS NULL OR ${table.createdEntryType} IN ('monthly_income_entry','monthly_expense_entry')`
    ),
    uniqueIndex("ux_statement_import_rows_source_hash").on(table.source, table.rowHash),
    index("idx_statement_import_rows_batch_id").on(table.batchId),
    index("idx_statement_import_rows_row_hash").on(table.rowHash),
  ]
);

export const statementCategorizationRules = pgTable(
  "statement_categorization_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pattern: text("pattern").notNull(),
    normalizedPattern: text("normalized_pattern").notNull(),
    matchType: text("match_type").notNull().default("exact"),
    direction: text("direction").notNull(),
    category: text("category").notNull(),
    expenseType: text("expense_type"),
    occurrenceType: text("occurrence_type"),
    monthlyExpenseId: uuid("monthly_expense_id").references(() => monthlyExpenses.id, {
      onDelete: "set null",
    }),
    monthlyIncomeId: uuid("monthly_income_id").references(() => monthlyIncomes.id, {
      onDelete: "set null",
    }),
    usageCount: integer("usage_count").notNull().default(1),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "statement_categorization_rules_match_type_valid",
      sql`${table.matchType} IN ('exact','contains')`
    ),
    check(
      "statement_categorization_rules_direction_valid",
      sql`${table.direction} IN ('income','expense')`
    ),
    check("statement_categorization_rules_usage_count_valid", sql`${table.usageCount} > 0`),
    check(
      "statement_categorization_rules_monthly_plan_single_valid",
      sql`${table.monthlyExpenseId} IS NULL OR ${table.monthlyIncomeId} IS NULL`
    ),
    uniqueIndex("ux_statement_categorization_rules_unique").on(
      table.direction,
      table.matchType,
      table.normalizedPattern
    ),
    index("idx_statement_categorization_rules_lookup").on(
      table.direction,
      table.normalizedPattern
    ),
  ]
);

export const monthlyClosings = pgTable(
  "monthly_closings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodMonth: text("period_month").notNull().unique(),
    status: text("status").notNull().default("closed"),
    closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "monthly_closings_period_month_valid",
      sql`${table.periodMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
    check("monthly_closings_status_closed_only", sql`${table.status} = 'closed'`),
  ]
);

export const cashFlowSettings = pgTable(
  "cash_flow_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startMonth: text("start_month").notNull(),
    initialBalance: integer("initial_balance").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "cash_flow_settings_start_month_valid",
      sql`${table.startMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`
    ),
  ]
);

export const budgetAreaSettings = pgTable(
  "budget_area_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: text("scope").notNull().default("global"),
    baseIncomeCents: integer("base_income_cents").notNull(),
    needsPercent: integer("needs_percent").notNull(),
    debtPaymentPercent: integer("debt_payment_percent").notNull(),
    emergencyReservePercent: integer("emergency_reserve_percent").notNull(),
    flexiblePercent: integer("flexible_percent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "budget_area_settings_scope_valid",
      sql`${table.scope} = 'global'`
    ),
    check("budget_area_settings_base_income_positive", sql`${table.baseIncomeCents} > 0`),
    check("budget_area_settings_needs_percent_valid", sql`${table.needsPercent} >= 0`),
    check("budget_area_settings_debt_payment_percent_valid", sql`${table.debtPaymentPercent} >= 0`),
    check(
      "budget_area_settings_emergency_reserve_percent_valid",
      sql`${table.emergencyReservePercent} >= 0`
    ),
    check("budget_area_settings_flexible_percent_valid", sql`${table.flexiblePercent} >= 0`),
    uniqueIndex("ux_budget_area_settings_scope").on(table.scope),
  ]
);
