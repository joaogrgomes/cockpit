CREATE TABLE "future_expense_payables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"expense_type" text NOT NULL,
	"expected_amount" integer NOT NULL,
	"expected_date" date NOT NULL,
	"status" text DEFAULT 'previsto' NOT NULL,
	"realized_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "future_expense_payables_expected_amount_positive" CHECK ("future_expense_payables"."expected_amount" > 0),
	CONSTRAINT "future_expense_payables_status_valid" CHECK ("future_expense_payables"."status" IN ('previsto','realizado','cancelado')),
	CONSTRAINT "future_expense_payables_category_valid" CHECK ("future_expense_payables"."category" IN ('moradia','dividas','transporte','alimentacao','esportes','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros')),
	CONSTRAINT "future_expense_payables_type_valid" CHECK ("future_expense_payables"."expense_type" IN ('fixo','variavel'))
);
--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ALTER COLUMN "monthly_expense_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD COLUMN "expense_type" text;--> statement-breakpoint
ALTER TABLE "future_expense_payables" ADD CONSTRAINT "future_expense_payables_realized_entry_id_monthly_expense_entries_id_fk" FOREIGN KEY ("realized_entry_id") REFERENCES "public"."monthly_expense_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_future_expense_payables_status_date" ON "future_expense_payables" USING btree ("status","expected_date");--> statement-breakpoint
CREATE INDEX "idx_future_expense_payables_expected_date" ON "future_expense_payables" USING btree ("expected_date");--> statement-breakpoint
CREATE INDEX "idx_future_expense_payables_category" ON "future_expense_payables" USING btree ("category");--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD CONSTRAINT "monthly_expense_entries_category_valid" CHECK ("monthly_expense_entries"."category" IS NULL OR "monthly_expense_entries"."category" IN ('moradia','dividas','transporte','alimentacao','esportes','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros'));--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD CONSTRAINT "monthly_expense_entries_type_valid" CHECK ("monthly_expense_entries"."expense_type" IS NULL OR "monthly_expense_entries"."expense_type" IN ('fixo','variavel'));--> statement-breakpoint
ALTER TABLE "monthly_expense_entries" ADD CONSTRAINT "monthly_expense_entries_requires_fields_when_unlinked" CHECK ("monthly_expense_entries"."monthly_expense_id" IS NOT NULL OR ("monthly_expense_entries"."name" IS NOT NULL AND "monthly_expense_entries"."category" IS NOT NULL AND "monthly_expense_entries"."expense_type" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "future_expense_payables" ENABLE ROW LEVEL SECURITY;
