ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gift_packaging" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gift_total" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_packaging" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_unit_price" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_line_total" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_image" text;
