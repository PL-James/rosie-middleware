-- Phase 4: Product Catalog and Multi-Repo Aggregation
-- Adds compliance_reports, manufacturers, products, and product-repository linking tables

-- Compliance Reports (Phase 3)
CREATE TABLE IF NOT EXISTS "compliance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" varchar(255),
	"report_data" jsonb NOT NULL,
	"compliance_score" integer,
	"overall_risk" varchar(10),
	"pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "manufacturers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"mah" varchar(20),
	"country" varchar(100),
	"contact_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"gtin" varchar(14),
	"manufacturer_id" uuid NOT NULL,
	"product_type" varchar(100),
	"risk_level" varchar(10),
	"regulatory_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "product_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"version" varchar(50),
	"release_date" timestamp,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign Keys
DO $$ BEGIN
 ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "product_repositories" ADD CONSTRAINT "product_repositories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "product_repositories" ADD CONSTRAINT "product_repositories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "compliance_report_repository_id_idx" ON "compliance_reports" USING btree ("repository_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "compliance_report_generated_at_idx" ON "compliance_reports" USING btree ("generated_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "manufacturer_name_idx" ON "manufacturers" USING btree ("name");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "product_name_idx" ON "products" USING btree ("name");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "product_gtin_idx" ON "products" USING btree ("gtin");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "product_manufacturer_idx" ON "products" USING btree ("manufacturer_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "product_repo_product_idx" ON "product_repositories" USING btree ("product_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "product_repo_repo_idx" ON "product_repositories" USING btree ("repository_id");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "product_repo_unique" ON "product_repositories" USING btree ("product_id", "repository_id");
