ALTER TABLE "evidence" ADD COLUMN "evidence_format" text DEFAULT 'jws-single';--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "package_directory" text;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "manifest_hash" text;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "total_files" integer;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "total_size_bytes" bigint;