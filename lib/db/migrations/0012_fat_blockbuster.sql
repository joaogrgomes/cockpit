CREATE TABLE "debt_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"type" text NOT NULL,
	"filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_attachments_type_valid" CHECK ("debt_attachments"."type" IN ('proposal_slip','whatsapp_screenshot','payment_receipt','serasa_clearance','other')),
	CONSTRAINT "debt_attachments_size_bytes_positive" CHECK ("debt_attachments"."size_bytes" IS NULL OR "debt_attachments"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "debts" DROP CONSTRAINT "debts_status_valid";--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "paid_at" date;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "paid_amount" integer;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "clearance_due_date" date;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "cleared_at" date;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "payment_notes" text;--> statement-breakpoint
ALTER TABLE "debt_attachments" ADD CONSTRAINT "debt_attachments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_debt_attachments_debt_created" ON "debt_attachments" USING btree ("debt_id","created_at");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_paid_amount_positive" CHECK ("debts"."paid_amount" IS NULL OR "debts"."paid_amount" > 0);--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_payment_method_valid" CHECK ("debts"."payment_method" IS NULL OR "debts"."payment_method" IN ('pix','boleto','cartao','debito_em_conta','dinheiro','transferencia','outro'));--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_status_valid" CHECK ("debts"."status" IN ('em_aberto','em_atraso','em_negociacao','parcelada','quitada','aguardando_baixa','baixada','arquivada','suspensa'));