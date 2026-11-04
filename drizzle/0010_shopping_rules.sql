ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "audience" varchar(20) NOT NULL DEFAULT 'public';
--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "category_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_plan" jsonb;
