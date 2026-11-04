ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "reviews" SET "approved_at" = "created_at" WHERE "status" = 'published' AND "approved_at" IS NULL;
