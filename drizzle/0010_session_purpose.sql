CREATE TYPE "public"."session_purpose" AS ENUM('explore', 'walk', 'food', 'culture');--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "purpose" "session_purpose" DEFAULT 'explore' NOT NULL;