ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "processing_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "out_for_delivery_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "notification_due_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmation_source" varchar(20);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_by_id" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmation_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "automation_state" varchar(20) DEFAULT 'idle' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "next_status" varchar(20);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "next_status_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "status_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_automation_idx" ON "orders" ("automation_state", "next_status_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_notification_due_idx" ON "orders" ("notification_due_at");
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN IF NOT EXISTS "from_status" varchar(20);
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN IF NOT EXISTS "to_status" varchar(20);
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN IF NOT EXISTS "actor_type" varchar(20);
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN IF NOT EXISTS "source" varchar(20);
--> statement-breakpoint
ALTER TABLE "order_events" ADD COLUMN IF NOT EXISTS "actor_id" integer;
--> statement-breakpoint
ALTER TABLE "delivery_issues" ADD COLUMN IF NOT EXISTS "user_id" integer;
--> statement-breakpoint
ALTER TABLE "delivery_issues" ADD COLUMN IF NOT EXISTS "customer_response" text;
--> statement-breakpoint
ALTER TABLE "delivery_issues" ADD COLUMN IF NOT EXISTS "resolution_note" text;
--> statement-breakpoint
ALTER TABLE "delivery_issues" ADD COLUMN IF NOT EXISTS "resolved_by_id" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "order_id" integer NOT NULL,
  "type" varchar(40) NOT NULL,
  "status" varchar(20) DEFAULT 'scheduled' NOT NULL,
  "title" varchar(200),
  "body" text,
  "scheduled_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "seen_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "response" varchar(20)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_order_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_confirmed_by_fk" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "delivery_issues" ADD CONSTRAINT "delivery_issues_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_notifications_order_idx" ON "customer_notifications" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_notifications_user_idx" ON "customer_notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_notifications_due_idx" ON "customer_notifications" ("status", "scheduled_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_notifications_open_confirm_idx" ON "customer_notifications" ("order_id") WHERE "type" = 'delivery_confirm' AND "status" IN ('scheduled', 'pending');
