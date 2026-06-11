ALTER TABLE "debts" ADD COLUMN "debt_type" text DEFAULT 'payoff' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_debts_debt_type" ON "debts" USING btree ("debt_type");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_debt_type_valid" CHECK ("debts"."debt_type" IN ('payoff','structural'));