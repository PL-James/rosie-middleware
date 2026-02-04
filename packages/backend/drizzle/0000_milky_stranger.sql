-- Enable pgcrypto extension for gen_random_uuid()
-- Required for UUID generation in default values across all tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('requirement', 'user_story', 'spec', 'evidence');--> statement-breakpoint
CREATE TYPE "public"."risk_rating" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('DRAFT', 'VALIDATED', 'DEPRECATED');--> statement-breakpoint
CREATE TYPE "public"."verification_tier" AS ENUM('IQ', 'OQ', 'PQ');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_method" varchar(10),
	"request_path" text,
	"request_payload_hash" varchar(64),
	"response_status" integer,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"spec_id" uuid,
	"gxp_id" varchar(50),
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"verification_tier" "verification_tier",
	"jws_payload" jsonb,
	"jws_header" jsonb,
	"signature" text,
	"is_signature_valid" boolean,
	"signature_verified_at" timestamp,
	"test_results" jsonb,
	"system_state" text,
	"timestamp" timestamp,
	"raw_content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"git_url" text NOT NULL,
	"description" text,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main',
	"auto_scan" boolean DEFAULT false,
	"scan_interval_minutes" integer DEFAULT 60,
	"last_scan_id" uuid,
	"last_scan_at" timestamp,
	"last_scan_status" "scan_status",
	"is_rosie_compliant" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"gxp_id" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"gxp_risk_rating" "risk_rating",
	"acceptance_criteria" jsonb,
	"file_path" text NOT NULL,
	"raw_content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"status" "scan_status" DEFAULT 'pending' NOT NULL,
	"commit_sha" varchar(40),
	"commit_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"artifacts_found" integer DEFAULT 0,
	"artifacts_created" integer DEFAULT 0,
	"artifacts_updated" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"user_story_id" uuid,
	"gxp_id" varchar(50) NOT NULL,
	"parent_id" varchar(50),
	"title" text NOT NULL,
	"description" text,
	"design_approach" text,
	"implementation_notes" text,
	"verification_tier" "verification_tier",
	"source_files" jsonb,
	"test_files" jsonb,
	"file_path" text NOT NULL,
	"raw_content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"version" varchar(50) NOT NULL,
	"gxp_risk_rating" "risk_rating" NOT NULL,
	"validation_status" "validation_status" NOT NULL,
	"intended_use" text,
	"regulatory" text,
	"system_owner" varchar(255),
	"technical_contact" varchar(255),
	"sections" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traceability_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"parent_gxp_id" varchar(50) NOT NULL,
	"parent_type" "artifact_type" NOT NULL,
	"child_id" uuid NOT NULL,
	"child_gxp_id" varchar(50) NOT NULL,
	"child_type" "artifact_type" NOT NULL,
	"is_valid" boolean DEFAULT true,
	"validation_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"requirement_id" uuid,
	"gxp_id" varchar(50) NOT NULL,
	"parent_id" varchar(50),
	"title" text NOT NULL,
	"description" text,
	"as_a" text,
	"i_want" text,
	"so_that" text,
	"acceptance_criteria" jsonb,
	"status" varchar(50),
	"file_path" text NOT NULL,
	"raw_content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence" ADD CONSTRAINT "evidence_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence" ADD CONSTRAINT "evidence_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence" ADD CONSTRAINT "evidence_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirements" ADD CONSTRAINT "requirements_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirements" ADD CONSTRAINT "requirements_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scans" ADD CONSTRAINT "scans_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specs" ADD CONSTRAINT "specs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specs" ADD CONSTRAINT "specs_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specs" ADD CONSTRAINT "specs_user_story_id_user_stories_id_fk" FOREIGN KEY ("user_story_id") REFERENCES "public"."user_stories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_contexts" ADD CONSTRAINT "system_contexts_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_contexts" ADD CONSTRAINT "system_contexts_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "traceability_links" ADD CONSTRAINT "traceability_links_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_repository_id_idx" ON "evidence" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_spec_id_idx" ON "evidence" USING btree ("spec_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_gxp_id_idx" ON "evidence" USING btree ("gxp_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_verification_tier_idx" ON "evidence" USING btree ("verification_tier");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "git_url_idx" ON "repositories" USING btree ("git_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_repo_idx" ON "repositories" USING btree ("owner","repo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "last_scan_at_idx" ON "repositories" USING btree ("last_scan_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requirement_repository_id_idx" ON "requirements" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "requirement_gxp_id_idx" ON "requirements" USING btree ("repository_id","gxp_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requirement_risk_rating_idx" ON "requirements" USING btree ("gxp_risk_rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_repository_id_idx" ON "scans" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_status_idx" ON "scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_created_at_idx" ON "scans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_repository_id_idx" ON "specs" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spec_gxp_id_idx" ON "specs" USING btree ("repository_id","gxp_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_user_story_id_idx" ON "specs" USING btree ("user_story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_parent_id_idx" ON "specs" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_verification_tier_idx" ON "specs" USING btree ("verification_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_context_repository_id_idx" ON "system_contexts" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_context_version_idx" ON "system_contexts" USING btree ("version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traceability_repository_id_idx" ON "traceability_links" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traceability_parent_id_idx" ON "traceability_links" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traceability_child_id_idx" ON "traceability_links" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traceability_is_valid_idx" ON "traceability_links" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_story_repository_id_idx" ON "user_stories" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_story_gxp_id_idx" ON "user_stories" USING btree ("repository_id","gxp_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_story_requirement_id_idx" ON "user_stories" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_story_parent_id_idx" ON "user_stories" USING btree ("parent_id");