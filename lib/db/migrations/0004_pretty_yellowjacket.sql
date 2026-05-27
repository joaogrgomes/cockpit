CREATE TABLE "monthly_income_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_income_id" uuid NOT NULL,
	"period_month" text NOT NULL,
	"amount" integer NOT NULL,
	"received_at" date NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_income_entries_amount_positive" CHECK ("monthly_income_entries"."amount" > 0),
	CONSTRAINT "monthly_income_entries_period_month_valid" CHECK ("monthly_income_entries"."period_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_income_entries_payment_method_valid" CHECK ("monthly_income_entries"."payment_method" IS NULL OR "monthly_income_entries"."payment_method" IN ('pix','transferencia','deposito','dinheiro','outro'))
);
--> statement-breakpoint
CREATE TABLE "monthly_incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"expected_day" integer,
	"payment_method" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_incomes_amount_positive" CHECK ("monthly_incomes"."amount" > 0),
	CONSTRAINT "monthly_incomes_expected_day_valid" CHECK ("monthly_incomes"."expected_day" IS NULL OR ("monthly_incomes"."expected_day" BETWEEN 1 AND 31)),
	CONSTRAINT "monthly_incomes_category_valid" CHECK ("monthly_incomes"."category" IN ('salario','freela','reembolso','beneficio','venda','rendimento','presente','outros')),
	CONSTRAINT "monthly_incomes_payment_method_valid" CHECK ("monthly_incomes"."payment_method" IS NULL OR "monthly_incomes"."payment_method" IN ('pix','transferencia','deposito','dinheiro','outro'))
);
--> statement-breakpoint
ALTER TABLE "monthly_income_entries" ADD CONSTRAINT "monthly_income_entries_monthly_income_id_monthly_incomes_id_fk" FOREIGN KEY ("monthly_income_id") REFERENCES "public"."monthly_incomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_monthly_income_entries_period_month" ON "monthly_income_entries" USING btree ("period_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_income_entries_income_period" ON "monthly_income_entries" USING btree ("monthly_income_id","period_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_income_entries_received_at" ON "monthly_income_entries" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_monthly_incomes_active_expected_day" ON "monthly_incomes" USING btree ("is_active","expected_day");--> statement-breakpoint
CREATE INDEX "idx_monthly_incomes_category" ON "monthly_incomes" USING btree ("category");--> statement-breakpoint
ALTER TABLE "monthly_incomes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "monthly_income_entries" ENABLE ROW LEVEL SECURITY;
