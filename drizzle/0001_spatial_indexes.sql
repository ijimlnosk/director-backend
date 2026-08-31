CREATE INDEX "area_bounds_gist_idx" ON "area" USING gist ("bounds");--> statement-breakpoint
CREATE INDEX "place_point_gist_idx" ON "place" USING gist ("point");--> statement-breakpoint
CREATE INDEX "session_origin_point_gist_idx" ON "session" USING gist ("origin_point");