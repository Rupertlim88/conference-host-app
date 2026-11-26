CREATE TABLE "ams2027"."demo_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"fixed_talk_id" text
);
--> statement-breakpoint
CREATE TABLE "ams2027"."info_lists" (
	"page" text NOT NULL,
	"position" integer NOT NULL,
	"heading" text NOT NULL,
	"lines" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "info_lists_page_position_pk" PRIMARY KEY("page","position")
);
--> statement-breakpoint
ALTER TABLE "ams2027"."sessions" ADD COLUMN "people_themed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2027"."talks" ADD COLUMN "core_keynote" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2027"."talks" ADD COLUMN "new_fellow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2027"."talks" ADD COLUMN "supplementary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ams2027"."tracks" ADD COLUMN "listed" boolean DEFAULT true NOT NULL;