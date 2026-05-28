CREATE TABLE "future_income_receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"expected_amount" integer NOT NULL,
	"expected_date" date NOT NULL,
	"status" text DEFAULT 'prevista' NOT NULL,
	"received_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "future_income_receivables_expected_amount_positive" CHECK ("future_income_receivables"."expected_amount" > 0),
	CONSTRAINT "future_income_receivables_status_valid" CHECK ("future_income_receivables"."status" IN ('prevista','recebida','cancelada')),
	CONSTRAINT "future_income_receivables_category_valid" CHECK ("future_income_receivables"."category" IN ('salario','freela','reembolso','beneficio','venda','rendimento','presente','outros'))
);
--> statement-breakpoint
ALTER TABLE "future_income_receivables" ADD CONSTRAINT "future_income_receivables_received_entry_id_monthly_income_entries_id_fk" FOREIGN KEY ("received_entry_id") REFERENCES "public"."monthly_income_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_future_income_receivables_status_date" ON "future_income_receivables" USING btree ("status","expected_date");--> statement-breakpoint
CREATE INDEX "idx_future_income_receivables_expected_date" ON "future_income_receivables" USING btree ("expected_date");--> statement-breakpoint
CREATE INDEX "idx_future_income_receivables_category" ON "future_income_receivables" USING btree ("category");--> statement-breakpoint
ALTER TABLE "future_income_receivables" ENABLE ROW LEVEL SECURITY;
