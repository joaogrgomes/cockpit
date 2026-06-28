CREATE TABLE "monthly_expense_pauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_expense_id" uuid NOT NULL,
	"start_month" text NOT NULL,
	"end_month" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_expense_pauses_start_month_valid" CHECK ("monthly_expense_pauses"."start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_expense_pauses_end_month_valid" CHECK ("monthly_expense_pauses"."end_month" IS NULL OR ("monthly_expense_pauses"."end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "monthly_expense_pauses"."end_month" >= "monthly_expense_pauses"."start_month"))
);
--> statement-breakpoint
ALTER TABLE "monthly_expense_pauses" ADD CONSTRAINT "monthly_expense_pauses_monthly_expense_id_monthly_expenses_id_fk" FOREIGN KEY ("monthly_expense_id") REFERENCES "public"."monthly_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_monthly_expense_pauses_expense_month" ON "monthly_expense_pauses" USING btree ("monthly_expense_id","start_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_expense_pauses_expense" ON "monthly_expense_pauses" USING btree ("monthly_expense_id");