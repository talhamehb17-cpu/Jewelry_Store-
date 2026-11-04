ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "display_currency" varchar(3);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "display_rate" real;
