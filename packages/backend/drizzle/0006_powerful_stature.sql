DROP INDEX IF EXISTS "evidence_gxp_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "evidence_gxp_id_idx" ON "evidence" USING btree ("repository_id","gxp_id");