CREATE TABLE "ams2027"."test_set" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"conference" text NOT NULL,
	"askers" text[] DEFAULT '{}'::text[] NOT NULL,
	"talks" text[] DEFAULT '{}'::text[] NOT NULL,
	"stored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2027"."whole_people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"affiliation" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2027"."whole_talk_people" (
	"talk_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "whole_talk_people_talk_id_person_id_pk" PRIMARY KEY("talk_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "ams2027"."whole_talks" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"number" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"abstract" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"room" text DEFAULT '' NOT NULL,
	"building" text DEFAULT '' NOT NULL,
	"booth" text DEFAULT '' NOT NULL,
	"presenting_author" text DEFAULT '' NOT NULL,
	"author_line" text DEFAULT '' NOT NULL,
	"affiliations" text[] DEFAULT '{}'::text[] NOT NULL,
	"doi" text DEFAULT '' NOT NULL,
	"citation" text DEFAULT '' NOT NULL,
	"track_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"core_keynote" boolean DEFAULT false NOT NULL,
	"new_fellow" boolean DEFAULT false NOT NULL,
	"supplementary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ams2027"."whole_talk_people" ADD CONSTRAINT "whole_talk_people_talk_id_whole_talks_id_fk" FOREIGN KEY ("talk_id") REFERENCES "ams2027"."whole_talks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ams2027"."whole_talk_people" ADD CONSTRAINT "whole_talk_people_person_id_whole_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "ams2027"."whole_people"("id") ON DELETE cascade ON UPDATE no action;