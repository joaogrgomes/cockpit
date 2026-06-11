ALTER TABLE "monthly_expenses" ADD COLUMN "start_month" text;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD COLUMN "end_month" text;--> statement-breakpoint
ALTER TABLE "monthly_incomes" ADD COLUMN "start_month" text;--> statement-breakpoint
ALTER TABLE "monthly_incomes" ADD COLUMN "end_month" text;--> statement-breakpoint
UPDATE "monthly_expenses"
SET "start_month" = COALESCE(
  (SELECT "start_month" FROM "cash_flow_settings" ORDER BY "created_at" ASC LIMIT 1),
  '2026-01'
)
WHERE "start_month" IS NULL;--> statement-breakpoint
UPDATE "monthly_incomes"
SET "start_month" = COALESCE(
  (SELECT "start_month" FROM "cash_flow_settings" ORDER BY "created_at" ASC LIMIT 1),
  '2026-01'
)
WHERE "start_month" IS NULL;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ALTER COLUMN "start_month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_incomes" ALTER COLUMN "start_month" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_monthly_expenses_period" ON "monthly_expenses" USING btree ("start_month","end_month");--> statement-breakpoint
CREATE INDEX "idx_monthly_incomes_period" ON "monthly_incomes" USING btree ("start_month","end_month");--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_start_month_valid" CHECK ("monthly_expenses"."start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_end_month_valid" CHECK ("monthly_expenses"."end_month" IS NULL OR ("monthly_expenses"."end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "monthly_expenses"."end_month" >= "monthly_expenses"."start_month"));--> statement-breakpoint
ALTER TABLE "monthly_incomes" ADD CONSTRAINT "monthly_incomes_start_month_valid" CHECK ("monthly_incomes"."start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
ALTER TABLE "monthly_incomes" ADD CONSTRAINT "monthly_incomes_end_month_valid" CHECK ("monthly_incomes"."end_month" IS NULL OR ("monthly_incomes"."end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "monthly_incomes"."end_month" >= "monthly_incomes"."start_month"));
