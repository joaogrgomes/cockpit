CREATE TABLE "budget_area_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"base_income_cents" integer NOT NULL,
	"needs_percent" integer NOT NULL,
	"debt_payment_percent" integer NOT NULL,
	"emergency_reserve_percent" integer NOT NULL,
	"flexible_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_area_settings_scope_valid" CHECK ("budget_area_settings"."scope" = 'global'),
	CONSTRAINT "budget_area_settings_base_income_positive" CHECK ("budget_area_settings"."base_income_cents" > 0),
	CONSTRAINT "budget_area_settings_needs_percent_valid" CHECK ("budget_area_settings"."needs_percent" >= 0),
	CONSTRAINT "budget_area_settings_debt_payment_percent_valid" CHECK ("budget_area_settings"."debt_payment_percent" >= 0),
	CONSTRAINT "budget_area_settings_emergency_reserve_percent_valid" CHECK ("budget_area_settings"."emergency_reserve_percent" >= 0),
	CONSTRAINT "budget_area_settings_flexible_percent_valid" CHECK ("budget_area_settings"."flexible_percent" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_budget_area_settings_scope" ON "budget_area_settings" USING btree ("scope");