ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme_preference" varchar(60);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_proofs" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" varchar(64) NOT NULL,
  "order_id" integer,
  "filename" varchar(255) NOT NULL,
  "mime" varchar(80) NOT NULL,
  "size" integer NOT NULL,
  "data" bytea NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_proofs_token_idx" ON "payment_proofs" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_proofs_order_idx" ON "payment_proofs" ("order_id");
