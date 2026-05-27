CREATE TABLE "monthly_expense_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_expense_id" uuid NOT NULL,
	"period_month" text NOT NULL,
	"amount" integer NOT NULL,
	"paid_at" date NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_expense_entries_amount_positive" CHECK ("monthly_expense_entries"."amount" > 0),
	CONSTRAINT "monthly_expense_entries_period_month_valid" CHECK ("monthly_expense_entries"."period_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_expense_entries_payment_method_valid" CHECK ("monthly_expense_entries"."payment_method" IS NULL OR "monthly_expense_entries"."payment_method" IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro'))
);
--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD CONSTRAINT "monthly_expense_entries_monthly_expense_id_monthly_expenses_id_fk" FOREIGN KEY ("monthly_expense_id") REFERENCES "public"."monthly_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_monthly_expense_entries_period_month" ON "monthly_expense_entries" USING btree ("period_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_expense_entries_expense_period" ON "monthly_expense_entries" USING btree ("monthly_expense_id","period_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_expense_entries_paid_at" ON "monthly_expense_entries" USING btree ("paid_at");--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ENABLE ROW LEVEL SECURITY;
