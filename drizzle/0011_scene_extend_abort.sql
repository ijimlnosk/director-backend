ALTER TYPE "public"."scene_outcome" ADD VALUE 'aborted';--> statement-breakpoint
ALTER TABLE "scene" ADD COLUMN "extended_min" integer DEFAULT 0 NOT NULL;