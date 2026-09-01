ALTER TABLE "photo" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "lng" double precision;