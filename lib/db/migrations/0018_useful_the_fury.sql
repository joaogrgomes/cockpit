CREATE TABLE "statement_categorization_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"normalized_pattern" text NOT NULL,
	"match_type" text DEFAULT 'exact' NOT NULL,
	"direction" text NOT NULL,
	"category" text NOT NULL,
	"expense_type" text,
	"occurrence_type" text,
	"monthly_expense_id" uuid,
	"monthly_income_id" uuid,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_categorization_rules_match_type_valid" CHECK ("statement_categorization_rules"."match_type" IN ('exact','contains')),
	CONSTRAINT "statement_categorization_rules_direction_valid" CHECK ("statement_categorization_rules"."direction" IN ('income','expense')),
	CONSTRAINT "statement_categorization_rules_usage_count_valid" CHECK ("statement_categorization_rules"."usage_count" > 0),
	CONSTRAINT "statement_categorization_rules_monthly_plan_single_valid" CHECK ("statement_categorization_rules"."monthly_expense_id" IS NULL OR "statement_categorization_rules"."monthly_income_id" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "statement_categorization_rules" ADD CONSTRAINT "statement_categorization_rules_monthly_expense_id_monthly_expenses_id_fk" FOREIGN KEY ("monthly_expense_id") REFERENCES "public"."monthly_expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_categorization_rules" ADD CONSTRAINT "statement_categorization_rules_monthly_income_id_monthly_incomes_id_fk" FOREIGN KEY ("monthly_income_id") REFERENCES "public"."monthly_incomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_statement_categorization_rules_unique" ON "statement_categorization_rules" USING btree ("direction","match_type","normalized_pattern");--> statement-breakpoint
CREATE INDEX "idx_statement_categorization_rules_lookup" ON "statement_categorization_rules" USING btree ("direction","normalized_pattern");