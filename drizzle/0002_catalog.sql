ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "avatar" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "photo" text;
