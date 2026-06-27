CREATE TABLE "patrimony_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"product_name" text,
	"asset_type" text NOT NULL,
	"objective" text NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"liquidity" text,
	"profitability_label" text,
	"is_reserved" boolean DEFAULT true NOT NULL,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patrimony_assets_name_required" CHECK ("patrimony_assets"."name" <> ''),
	CONSTRAINT "patrimony_assets_objective_required" CHECK ("patrimony_assets"."objective" <> ''),
	CONSTRAINT "patrimony_assets_balance_non_negative" CHECK ("patrimony_assets"."balance_cents" >= 0),
	CONSTRAINT "patrimony_assets_asset_type_valid" CHECK ("patrimony_assets"."asset_type" IN ('checking_account','savings','piggy_bank','cdb','treasury','fund','cash','other')),
	CONSTRAINT "patrimony_assets_status_valid" CHECK ("patrimony_assets"."status" IN ('active','archived'))
);
--> statement-breakpoint
CREATE INDEX "idx_patrimony_assets_status" ON "patrimony_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_patrimony_assets_type" ON "patrimony_assets" USING btree ("asset_type");