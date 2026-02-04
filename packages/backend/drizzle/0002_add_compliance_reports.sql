-- Migration: Add compliance_reports table
-- Created: 2026-02-04
-- Description: Adds compliance_reports table for storing generated compliance reports

CREATE TABLE IF NOT EXISTS "compliance_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repository_id" uuid NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
  "report_type" varchar(50) NOT NULL,
  "generated_at" timestamp DEFAULT now() NOT NULL,
  "generated_by" varchar(255),
  "report_data" jsonb NOT NULL,
  "compliance_score" integer,
  "overall_risk" varchar(10),
  "pdf_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "compliance_report_repository_id_idx" ON "compliance_reports" ("repository_id");
CREATE INDEX IF NOT EXISTS "compliance_report_generated_at_idx" ON "compliance_reports" ("generated_at");

-- Comments for documentation
COMMENT ON TABLE "compliance_reports" IS 'Stores generated compliance reports for repositories';
COMMENT ON COLUMN "compliance_reports"."report_type" IS 'Type of report: full, summary, audit';
COMMENT ON COLUMN "compliance_reports"."report_data" IS 'Complete report data as JSON including all sections';
COMMENT ON COLUMN "compliance_reports"."compliance_score" IS 'Overall compliance score 0-100';
COMMENT ON COLUMN "compliance_reports"."overall_risk" IS 'Risk rating: LOW, MEDIUM, HIGH, CRITICAL';
