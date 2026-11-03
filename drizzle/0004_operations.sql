ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_code" varchar(40);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_minutes" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "timeline_start_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_confirmed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_response" varchar(20);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_plan" jsonb;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_visible_note" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_expected_idx" ON "orders" ("expected_at");
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "order_id" integer;
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_logs_order_idx" ON "email_logs" ("order_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_services" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "price" integer DEFAULT 0 NOT NULL,
  "duration_minutes" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "confirm_minutes" integer,
  "processing_minutes" integer,
  "ship_minutes" integer,
  "out_minutes" integer,
  "cutoff_note" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_services_code_idx" ON "delivery_services" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(160) NOT NULL,
  "city" varchar(100) NOT NULL,
  "country" varchar(80) DEFAULT 'Pakistan' NOT NULL,
  "address" text NOT NULL,
  "phone" varchar(40),
  "hours" text,
  "image" text,
  "map_url" text,
  "latitude" double precision,
  "longitude" double precision,
  "active" boolean DEFAULT true NOT NULL,
  "show_on_home" boolean DEFAULT true NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_issues" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "note" text,
  "expected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" varchar(120)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "delivery_issues" ADD CONSTRAINT "delivery_issues_order_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_issues_status_idx" ON "delivery_issues" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "code" varchar(3) PRIMARY KEY NOT NULL,
  "per_pkr" double precision NOT NULL,
  "source" varchar(40) NOT NULL,
  "fetched_at" timestamp with time zone NOT NULL
);
