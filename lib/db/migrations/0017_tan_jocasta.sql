CREATE TABLE "statement_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'inter_csv' NOT NULL,
	"original_filename" text,
	"period_start" date,
	"period_end" date,
	"status" text DEFAULT 'parsed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_import_batches_source_valid" CHECK ("statement_import_batches"."source" IN ('inter_csv')),
	CONSTRAINT "statement_import_batches_status_valid" CHECK ("statement_import_batches"."status" IN ('parsed','partially_committed','committed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "statement_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"source" text DEFAULT 'inter_csv' NOT NULL,
	"row_index" integer NOT NULL,
	"row_hash" text NOT NULL,
	"external_id" text,
	"transaction_date" date NOT NULL,
	"raw_history" text,
	"raw_description" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_after_cents" integer,
	"direction" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_entry_type" text,
	"created_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_import_rows_source_valid" CHECK ("statement_import_rows"."source" IN ('inter_csv')),
	CONSTRAINT "statement_import_rows_row_index_positive" CHECK ("statement_import_rows"."row_index" > 0),
	CONSTRAINT "statement_import_rows_amount_positive" CHECK ("statement_import_rows"."amount_cents" > 0),
	CONSTRAINT "statement_import_rows_direction_valid" CHECK ("statement_import_rows"."direction" IN ('income','expense')),
	CONSTRAINT "statement_import_rows_status_valid" CHECK ("statement_import_rows"."status" IN ('pending','ignored','committed','skipped_duplicate')),
	CONSTRAINT "statement_import_rows_created_entry_type_valid" CHECK ("statement_import_rows"."created_entry_type" IS NULL OR "statement_import_rows"."created_entry_type" IN ('monthly_income_entry','monthly_expense_entry'))
);
--> statement-breakpoint
ALTER TABLE "statement_import_rows" ADD CONSTRAINT "statement_import_rows_batch_id_statement_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."statement_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_statement_import_rows_source_hash" ON "statement_import_rows" USING btree ("source","row_hash");--> statement-breakpoint
CREATE INDEX "idx_statement_import_rows_batch_id" ON "statement_import_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_statement_import_rows_row_hash" ON "statement_import_rows" USING btree ("row_hash");