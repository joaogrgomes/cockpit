CREATE TABLE "debt_settlement_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"installments" integer NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"upfront_amount_cents" integer DEFAULT 0 NOT NULL,
	"monthly_installment_cents" integer,
	"first_due_date" date,
	"valid_until" date,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_settlement_options_kind_valid" CHECK ("debt_settlement_options"."kind" IN ('cash','installment')),
	CONSTRAINT "debt_settlement_options_installments_valid" CHECK ("debt_settlement_options"."installments" > 0),
	CONSTRAINT "debt_settlement_options_total_amount_positive" CHECK ("debt_settlement_options"."total_amount_cents" > 0),
	CONSTRAINT "debt_settlement_options_upfront_amount_non_negative" CHECK ("debt_settlement_options"."upfront_amount_cents" >= 0),
	CONSTRAINT "debt_settlement_options_monthly_installment_positive" CHECK ("debt_settlement_options"."monthly_installment_cents" IS NULL OR "debt_settlement_options"."monthly_installment_cents" > 0),
	CONSTRAINT "debt_settlement_options_status_valid" CHECK ("debt_settlement_options"."status" IN ('active','expired','accepted','rejected','archived')),
	CONSTRAINT "debt_settlement_options_cash_fields_valid" CHECK (("debt_settlement_options"."kind" <> 'cash') OR ("debt_settlement_options"."installments" = 1 AND "debt_settlement_options"."monthly_installment_cents" IS NULL AND "debt_settlement_options"."upfront_amount_cents" = "debt_settlement_options"."total_amount_cents")),
	CONSTRAINT "debt_settlement_options_installment_fields_valid" CHECK (("debt_settlement_options"."kind" <> 'installment') OR ("debt_settlement_options"."installments" > 1 AND "debt_settlement_options"."monthly_installment_cents" IS NOT NULL AND "debt_settlement_options"."first_due_date" IS NOT NULL)),
	CONSTRAINT "debt_settlement_options_valid_until_valid" CHECK ("debt_settlement_options"."valid_until" IS NULL OR "debt_settlement_options"."first_due_date" IS NULL OR "debt_settlement_options"."valid_until" >= "debt_settlement_options"."first_due_date")
);
--> statement-breakpoint
ALTER TABLE "debt_settlement_options" ADD CONSTRAINT "debt_settlement_options_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_debt_settlement_options_debt_status" ON "debt_settlement_options" USING btree ("debt_id","status");--> statement-breakpoint
CREATE INDEX "idx_debt_settlement_options_debt_created" ON "debt_settlement_options" USING btree ("debt_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_debt_settlement_options_debt_accepted" ON "debt_settlement_options" USING btree ("debt_id") WHERE "status" = 'accepted';
