CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."generated_by" AS ENUM('template', 'llm');--> statement-breakpoint
CREATE TYPE "public"."location_permission" AS ENUM('granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('host', 'member');--> statement-breakpoint
CREATE TYPE "public"."participant_state" AS ENUM('pending', 'joined', 'left');--> statement-breakpoint
CREATE TYPE "public"."participant_team" AS ENUM('a', 'b');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('none', 'partner');--> statement-breakpoint
CREATE TYPE "public"."price_band" AS ENUM('1', '2', '3', '4');--> statement-breakpoint
CREATE TYPE "public"."scene_outcome" AS ENUM('arrived', 'skipped', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."scene_type" AS ENUM('move', 'choose', 'photo', 'observe', 'split');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('solo', 'date', 'friends');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'checking', 'active', 'completed', 'abandoned', 'archived');--> statement-breakpoint
CREATE TYPE "public"."subscription" AS ENUM('free', 'plus');--> statement-breakpoint
CREATE TYPE "public"."transport" AS ENUM('walk', 'transit', 'car');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('gps', 'manual');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'link');--> statement-breakpoint
CREATE TABLE "area" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"bounds" geography(Polygon,4326) NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cut" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary_line" text NOT NULL,
	"total_distance_m" integer NOT NULL,
	"runtime_sec" integer NOT NULL,
	"cover_photo_id" uuid,
	"share_slug" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	CONSTRAINT "cut_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "cut_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "participant_role" NOT NULL,
	"team" "participant_team",
	"state" "participant_state" DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "participant_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_result_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"include_in_credits" boolean DEFAULT true NOT NULL,
	CONSTRAINT "photo_scene_result_id_unique" UNIQUE("scene_result_id")
);
--> statement-breakpoint
CREATE TABLE "place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"point" geography(Point,4326) NOT NULL,
	"open_hours" jsonb NOT NULL,
	"price_band" "price_band" NOT NULL,
	"partner_status" "partner_status" DEFAULT 'none' NOT NULL,
	"cooldown_days" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"partner" text,
	"mode_scope" "session_mode"[] NOT NULL,
	"requires_subscription" boolean DEFAULT false NOT NULL,
	"active_from" date NOT NULL,
	"active_to" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"outcome" "scene_outcome" NOT NULL,
	"verified_by" "verification_method" NOT NULL,
	"arrived_point" geography(Point,4326),
	"elapsed_sec" integer NOT NULL,
	"walked_m" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_result_scene_user_unique" UNIQUE("scene_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "scene" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" "scene_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"hint" text NOT NULL,
	"place_id" uuid,
	"distance_m" integer NOT NULL,
	"time_limit_min" integer NOT NULL,
	"reveal_name_after_arrival" boolean DEFAULT true NOT NULL,
	"generated_by" "generated_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_session_seq_unique" UNIQUE("session_id","seq")
);
--> statement-breakpoint
CREATE TABLE "session_pack" (
	"session_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	CONSTRAINT "session_pack_session_id_pack_id_pk" PRIMARY KEY("session_id","pack_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"mode" "session_mode" NOT NULL,
	"duration_min" integer NOT NULL,
	"budget_krw" integer,
	"transport" "transport" NOT NULL,
	"origin_point" geography(Point,4326) NOT NULL,
	"area_id" uuid NOT NULL,
	"weather_snapshot" jsonb NOT NULL,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"invite_code" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" text NOT NULL,
	"handle" text,
	"home_area_id" uuid,
	"subscription" "subscription" DEFAULT 'free' NOT NULL,
	"location_permission" "location_permission" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_history" (
	"user_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"last_visited_at" timestamp with time zone NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "visit_history_user_id_place_id_pk" PRIMARY KEY("user_id","place_id")
);
--> statement-breakpoint
ALTER TABLE "cut" ADD CONSTRAINT "cut_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cut" ADD CONSTRAINT "cut_cover_photo_id_photo_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo" ADD CONSTRAINT "photo_scene_result_id_scene_result_id_fk" FOREIGN KEY ("scene_result_id") REFERENCES "public"."scene_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_result" ADD CONSTRAINT "scene_result_scene_id_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scene"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_result" ADD CONSTRAINT "scene_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene" ADD CONSTRAINT "scene_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene" ADD CONSTRAINT "scene_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_pack" ADD CONSTRAINT "session_pack_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_pack" ADD CONSTRAINT "session_pack_pack_id_scenario_pack_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."scenario_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_home_area_id_area_id_fk" FOREIGN KEY ("home_area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_history" ADD CONSTRAINT "visit_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_history" ADD CONSTRAINT "visit_history_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_area_id_idx" ON "place" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "scene_place_id_idx" ON "scene" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "session_host_user_id_idx" ON "session" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "session_area_id_idx" ON "session" USING btree ("area_id");
