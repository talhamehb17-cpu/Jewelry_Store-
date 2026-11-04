ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
--> statement-breakpoint
ALTER TABLE "store_locations" ADD COLUMN IF NOT EXISTS "timezone" varchar(64) DEFAULT 'Asia/Karachi' NOT NULL;
--> statement-breakpoint
ALTER TABLE "store_locations" ADD COLUMN IF NOT EXISTS "schedule" jsonb;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "order_id" integer;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "order_item_id" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_purchase_idx" ON "reviews" ("order_id", "product_id") WHERE "order_id" IS NOT NULL;
