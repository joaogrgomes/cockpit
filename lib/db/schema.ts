import { sql } from "drizzle-orm";
import {
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
  "suspensa",
] as const;

export const PROPOSAL_STATUS_VALUES = [
  "ativa",
  "expirada",
  "recusada",
  "aceita",
  "substituida",
] as const;

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
      sql`${table.status} IN ('em_aberto','em_atraso','em_negociacao','parcelada','quitada','suspensa')`
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
