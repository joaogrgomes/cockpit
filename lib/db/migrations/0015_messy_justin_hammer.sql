CREATE TABLE "cost_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"base_net_income_cents" integer DEFAULT 0 NOT NULL,
	"base_gross_income_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_analyses_base_net_income_non_negative" CHECK ("cost_analyses"."base_net_income_cents" >= 0),
	CONSTRAINT "cost_analyses_base_gross_income_non_negative" CHECK ("cost_analyses"."base_gross_income_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cost_analysis_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_analysis_id" uuid NOT NULL,
	"name" text NOT NULL,
	"monthly_amount_cents" integer DEFAULT 0 NOT NULL,
	"cost_kind" text NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_analysis_items_monthly_amount_non_negative" CHECK ("cost_analysis_items"."monthly_amount_cents" >= 0),
	CONSTRAINT "cost_analysis_items_cost_kind_valid" CHECK ("cost_analysis_items"."cost_kind" IN ('cash','economic','provision'))
);
--> statement-breakpoint
ALTER TABLE "cost_analysis_items" ADD CONSTRAINT "cost_analysis_items_cost_analysis_id_cost_analyses_id_fk" FOREIGN KEY ("cost_analysis_id") REFERENCES "public"."cost_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_cost_analyses_slug" ON "cost_analyses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cost_analysis_items_analysis_sort" ON "cost_analysis_items" USING btree ("cost_analysis_id","sort_order");

DO $$
DECLARE
  analysis_uuid uuid;
BEGIN
  INSERT INTO "cost_analyses" ("name", "slug", "description", "base_net_income_cents", "base_gross_income_cents")
  VALUES (
    'Custo total do carro',
    'carro',
    'Análise do custo mensal e anual de manter o carro.',
    0,
    0
  )
  ON CONFLICT ("slug") DO UPDATE
  SET "updated_at" = now()
  RETURNING "id" INTO analysis_uuid;

  IF analysis_uuid IS NULL THEN
    SELECT "id" INTO analysis_uuid
    FROM "cost_analyses"
    WHERE "slug" = 'carro'
    LIMIT 1;
  END IF;

  IF analysis_uuid IS NOT NULL THEN
    INSERT INTO "cost_analysis_items" (
      "cost_analysis_id",
      "name",
      "monthly_amount_cents",
      "cost_kind",
      "notes",
      "sort_order"
    )
    SELECT analysis_uuid, v.name, v.monthly_amount_cents, v.cost_kind, v.notes, v.sort_order
    FROM (
      VALUES
        ('Financiamento', 60500, 'cash', NULL::text, 0),
        ('Depreciação', 13000, 'economic', NULL::text, 1),
        ('Combustível', 65000, 'cash', NULL::text, 2),
        ('Estacionamento', 2500, 'cash', NULL::text, 3),
        ('IPVA', 18000, 'provision', NULL::text, 4),
        ('Custo de oportunidade', 0, 'economic', NULL::text, 5),
        ('Seguro', 20300, 'provision', NULL::text, 6),
        ('Pedágio', 500, 'cash', NULL::text, 7),
        ('Manutenção', 18000, 'provision', NULL::text, 8),
        ('Lavagem', 6000, 'cash', NULL::text, 9)
    ) AS v(name, monthly_amount_cents, cost_kind, notes, sort_order)
    WHERE NOT EXISTS (
      SELECT 1
      FROM "cost_analysis_items" existing
      WHERE existing."cost_analysis_id" = analysis_uuid
        AND existing."name" = v.name
    );
  END IF;
END $$;
