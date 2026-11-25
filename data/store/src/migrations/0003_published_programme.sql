ALTER TABLE "ams2026"."sessions" ADD COLUMN "pub_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ams2026"."sessions" ADD COLUMN "pub_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ams2026"."sessions" ADD COLUMN "pub_room" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2026"."sessions" ADD COLUMN "pub_building" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_session_id" text;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_room" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_building" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD COLUMN "pub_sort" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."sessions" ADD COLUMN "pub_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gsa2026"."sessions" ADD COLUMN "pub_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gsa2026"."sessions" ADD COLUMN "pub_room" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."sessions" ADD COLUMN "pub_building" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "withdrawn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_session_id" text;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_room" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_building" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD COLUMN "pub_sort" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Programmes loaded before this migration: what they hold now is what was published.
UPDATE "ams2026"."sessions" SET "pub_starts_at" = "starts_at", "pub_ends_at" = "ends_at", "pub_room" = "room", "pub_building" = "building";--> statement-breakpoint
UPDATE "ams2026"."talks" SET "pub_session_id" = "session_id", "pub_starts_at" = "starts_at", "pub_ends_at" = "ends_at", "pub_room" = "room", "pub_building" = "building", "pub_sort" = "sort";--> statement-breakpoint
UPDATE "gsa2026"."sessions" SET "pub_starts_at" = "starts_at", "pub_ends_at" = "ends_at", "pub_room" = "room", "pub_building" = "building";--> statement-breakpoint
UPDATE "gsa2026"."talks" SET "pub_session_id" = "session_id", "pub_starts_at" = "starts_at", "pub_ends_at" = "ends_at", "pub_room" = "room", "pub_building" = "building", "pub_sort" = "sort";
