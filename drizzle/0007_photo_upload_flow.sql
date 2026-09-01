CREATE TYPE "public"."photo_status" AS ENUM('pending', 'ready');--> statement-breakpoint
ALTER TABLE "photo" ALTER COLUMN "width" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "photo" ALTER COLUMN "height" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "photo" ALTER COLUMN "taken_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "status" "photo_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "bytes" integer;