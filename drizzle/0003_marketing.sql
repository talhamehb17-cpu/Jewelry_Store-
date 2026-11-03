ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaign_id" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaign_name" varchar(160);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaign_discount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "original_unit_price" integer;
--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "per_user_limit" integer;
--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "max_discount" integer;
--> statement-breakpoint
ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "stackable" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'subscribed' NOT NULL;
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "token" varchar(64);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_usages" (
  "id" serial PRIMARY KEY NOT NULL,
  "discount_id" integer NOT NULL,
  "order_id" integer,
  "email" varchar(255) NOT NULL,
  "user_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(160) NOT NULL,
  "slug" varchar(160) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "percent" integer NOT NULL,
  "image" text,
  "applies_to" varchar(20) DEFAULT 'all' NOT NULL,
  "product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "allow_stacking" boolean DEFAULT false NOT NULL,
  "notify_subscribers" boolean DEFAULT false NOT NULL,
  "email_sent_at" timestamp with time zone,
  "email_recipient_count" integer DEFAULT 0 NOT NULL,
  "cta_label" varchar(80) DEFAULT 'Shop the sale' NOT NULL,
  "cta_href" varchar(300) DEFAULT '/shop' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "kind" varchar(40) NOT NULL,
  "to_email" varchar(255) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "campaign_id" integer,
  "status" varchar(20) NOT NULL,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discount_usages_discount_idx" ON "discount_usages" USING btree ("discount_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discount_usages_email_idx" ON "discount_usages" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_slug_idx" ON "campaigns" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_ends_idx" ON "campaigns" USING btree ("ends_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_token_idx" ON "newsletter_subscribers" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_logs_created_idx" ON "email_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_logs_kind_idx" ON "email_logs" USING btree ("kind");
