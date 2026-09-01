ALTER TYPE "public"."scene_outcome" ADD VALUE 'vetoed';--> statement-breakpoint
CREATE TABLE "veto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"place_id" uuid,
	"category" text,
	"scene_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "veto" ADD CONSTRAINT "veto_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veto" ADD CONSTRAINT "veto_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veto" ADD CONSTRAINT "veto_scene_id_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scene"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "veto_user_id_idx" ON "veto" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "veto_user_place_uq" ON "veto" USING btree ("user_id","place_id") WHERE "veto"."place_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "veto_user_category_uq" ON "veto" USING btree ("user_id","category") WHERE "veto"."category" is not null;