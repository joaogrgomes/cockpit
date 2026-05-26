CREATE TABLE "monthly_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"expense_type" text NOT NULL,
	"payment_method" text,
	"due_day" integer,
	"due_label" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_expenses_amount_positive" CHECK ("monthly_expenses"."amount" > 0),
	CONSTRAINT "monthly_expenses_due_day_valid" CHECK ("monthly_expenses"."due_day" IS NULL OR ("monthly_expenses"."due_day" BETWEEN 1 AND 31)),
	CONSTRAINT "monthly_expenses_type_valid" CHECK ("monthly_expenses"."expense_type" IN ('fixo','variavel')),
	CONSTRAINT "monthly_expenses_category_valid" CHECK ("monthly_expenses"."category" IN ('moradia','dividas','transporte','alimentacao','reserva','doacoes','lazer','educacao','saude','compras','servicos','assinaturas','familia','impostos','outros')),
	CONSTRAINT "monthly_expenses_payment_method_valid" CHECK ("monthly_expenses"."payment_method" IS NULL OR "monthly_expenses"."payment_method" IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro'))
);
--> statement-breakpoint
CREATE INDEX "idx_monthly_expenses_active_due_day" ON "monthly_expenses" USING btree ("is_active","due_day");--> statement-breakpoint
CREATE INDEX "idx_monthly_expenses_category_type" ON "monthly_expenses" USING btree ("category","expense_type");--> statement-breakpoint
ALTER TABLE "monthly_expenses" ENABLE ROW LEVEL SECURITY;
