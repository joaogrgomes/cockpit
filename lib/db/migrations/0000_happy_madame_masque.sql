CREATE TABLE "debt_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"proposed_value" integer NOT NULL,
	"proposed_at" date NOT NULL,
	"expires_at" date,
	"origin" text,
	"status" text DEFAULT 'ativa' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_proposals_proposed_value_positive" CHECK ("debt_proposals"."proposed_value" > 0),
	CONSTRAINT "debt_proposals_expiry_valid" CHECK ("debt_proposals"."expires_at" IS NULL OR "debt_proposals"."expires_at" >= "debt_proposals"."proposed_at"),
	CONSTRAINT "debt_proposals_status_valid" CHECK ("debt_proposals"."status" IN ('ativa','expirada','recusada','aceita','substituida'))
);
--> statement-breakpoint
CREATE TABLE "debt_value_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"recorded_value" integer NOT NULL,
	"recorded_at" date NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_value_updates_recorded_value_positive" CHECK ("debt_value_updates"."recorded_value" > 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"creditor" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'em_aberto' NOT NULL,
	"current_value" integer NOT NULL,
	"original_value" integer,
	"monthly_payment" integer,
	"due_day" integer,
	"due_date" date,
	"total_installments" integer,
	"paid_installments" integer,
	"overdue_since" date,
	"priority" text,
	"perceived_risk" text,
	"notes" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_current_value_positive" CHECK ("debts"."current_value" > 0),
	CONSTRAINT "debts_original_value_positive" CHECK ("debts"."original_value" IS NULL OR "debts"."original_value" > 0),
	CONSTRAINT "debts_monthly_payment_positive" CHECK ("debts"."monthly_payment" IS NULL OR "debts"."monthly_payment" > 0),
	CONSTRAINT "debts_due_day_valid" CHECK ("debts"."due_day" IS NULL OR ("debts"."due_day" BETWEEN 1 AND 31)),
	CONSTRAINT "debts_total_installments_positive" CHECK ("debts"."total_installments" IS NULL OR "debts"."total_installments" > 0),
	CONSTRAINT "debts_paid_installments_non_negative" CHECK ("debts"."paid_installments" IS NULL OR "debts"."paid_installments" >= 0),
	CONSTRAINT "debts_paid_installments_valid" CHECK ("debts"."paid_installments" IS NULL OR "debts"."total_installments" IS NULL OR "debts"."paid_installments" <= "debts"."total_installments"),
	CONSTRAINT "debts_status_valid" CHECK ("debts"."status" IN ('em_aberto','em_atraso','em_negociacao','parcelada','quitada','suspensa'))
);
--> statement-breakpoint
ALTER TABLE "debt_proposals" ADD CONSTRAINT "debt_proposals_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_value_updates" ADD CONSTRAINT "debt_value_updates_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_debt_proposals_debt_status" ON "debt_proposals" USING btree ("debt_id","status");--> statement-breakpoint
CREATE INDEX "idx_debt_value_updates_debt_date" ON "debt_value_updates" USING btree ("debt_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_debts_status" ON "debts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_proposal_per_debt" ON "debt_proposals" USING btree ("debt_id") WHERE "status" = 'ativa';--> statement-breakpoint
ALTER TABLE "debts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "debt_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "debt_value_updates" ENABLE ROW LEVEL SECURITY;
