ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires" timestamp with time zone;
