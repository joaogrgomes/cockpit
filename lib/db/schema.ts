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

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    creditor: text("creditor").notNull(),
    type: text("type").notNull(),
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
    check(
      "debts_paid_amount_positive",
      sql`${table.paidAmount} IS NULL OR ${table.paidAmount} > 0`
    ),
    check(
      "debts_payment_method_valid",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro')`
    ),
    index("idx_debts_status").on(table.status),
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
