ALTER TABLE "payment_proofs" ADD COLUMN IF NOT EXISTS "url" text;
--> statement-breakpoint
ALTER TABLE "payment_proofs" ALTER COLUMN "data" DROP NOT NULL;
