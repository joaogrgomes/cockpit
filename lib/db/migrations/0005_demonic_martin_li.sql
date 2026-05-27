CREATE TABLE "cash_flow_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_month" text NOT NULL,
	"initial_balance" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_flow_settings_start_month_valid" CHECK ("cash_flow_settings"."start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "cash_flow_settings" ENABLE ROW LEVEL SECURITY;
