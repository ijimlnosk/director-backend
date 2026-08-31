ALTER TABLE "session" ALTER COLUMN "weather_snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "started_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_device_id_unique" UNIQUE("device_id");