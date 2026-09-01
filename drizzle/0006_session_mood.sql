CREATE TYPE "public"."session_mood" AS ENUM('chill', 'adventurous');--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "mood" "session_mood";