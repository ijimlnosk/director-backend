ALTER TABLE "place" ADD COLUMN "provider" text DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "provider_place_id" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "address" text;--> statement-breakpoint
CREATE UNIQUE INDEX "place_provider_ref_uq" ON "place" USING btree ("provider","provider_place_id") WHERE "place"."provider_place_id" is not null;