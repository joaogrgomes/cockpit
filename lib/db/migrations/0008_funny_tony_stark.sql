CREATE TABLE "monthly_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_month" text NOT NULL,
	"status" text DEFAULT 'closed' NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_closings_period_month_unique" UNIQUE("period_month"),
	CONSTRAINT "monthly_closings_period_month_valid" CHECK ("monthly_closings"."period_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "monthly_closings_status_closed_only" CHECK ("monthly_closings"."status" = 'closed')
);
--> statement-breakpoint
ALTER TABLE "monthly_closings" ENABLE ROW LEVEL SECURITY;
