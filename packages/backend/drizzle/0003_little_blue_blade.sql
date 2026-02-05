CREATE TABLE IF NOT EXISTS "file_checksums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"sha256_hash" varchar(64) NOT NULL,
	"last_scanned_at" timestamp DEFAULT now() NOT NULL,
	"artifact_id" uuid,
	"artifact_type" "artifact_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_checksums" ADD CONSTRAINT "file_checksums_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_checksum_repository_id_idx" ON "file_checksums" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_checksum_file_path_idx" ON "file_checksums" USING btree ("repository_id","file_path");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "file_checksum_unique_repo_path" ON "file_checksums" USING btree ("repository_id","file_path");