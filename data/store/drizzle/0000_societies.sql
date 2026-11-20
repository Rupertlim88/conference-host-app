CREATE SCHEMA "ams2026";
--> statement-breakpoint
CREATE SCHEMA "gsa2026";
--> statement-breakpoint
CREATE TABLE "ams2026"."meeting" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"time_zone" text NOT NULL,
	"venue" text NOT NULL,
	"city" text NOT NULL,
	"about" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2026"."notes" (
	"user_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_user_id_target_kind_target_id_pk" PRIMARY KEY("user_id","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE "ams2026"."people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"affiliation" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2026"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT '' NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"chairs" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"room" text DEFAULT '' NOT NULL,
	"building" text DEFAULT '' NOT NULL,
	"track_ids" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2026"."stars" (
	"user_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stars_user_id_target_kind_target_id_pk" PRIMARY KEY("user_id","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE "ams2026"."talk_people" (
	"talk_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "talk_people_talk_id_person_id_pk" PRIMARY KEY("talk_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "ams2026"."talks" (
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
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ams2026"."tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."meeting" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"time_zone" text NOT NULL,
	"venue" text NOT NULL,
	"city" text NOT NULL,
	"about" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."notes" (
	"user_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_user_id_target_kind_target_id_pk" PRIMARY KEY("user_id","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"affiliation" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT '' NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"chairs" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"room" text DEFAULT '' NOT NULL,
	"building" text DEFAULT '' NOT NULL,
	"track_ids" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."stars" (
	"user_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stars_user_id_target_kind_target_id_pk" PRIMARY KEY("user_id","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."talk_people" (
	"talk_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "talk_people_talk_id_person_id_pk" PRIMARY KEY("talk_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."talks" (
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
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"sort" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ams2026"."talk_people" ADD CONSTRAINT "talk_people_talk_id_talks_id_fk" FOREIGN KEY ("talk_id") REFERENCES "ams2026"."talks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ams2026"."talk_people" ADD CONSTRAINT "talk_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "ams2026"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ams2026"."talks" ADD CONSTRAINT "talks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "ams2026"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsa2026"."talk_people" ADD CONSTRAINT "talk_people_talk_id_talks_id_fk" FOREIGN KEY ("talk_id") REFERENCES "gsa2026"."talks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsa2026"."talk_people" ADD CONSTRAINT "talk_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "gsa2026"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsa2026"."talks" ADD CONSTRAINT "talks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "gsa2026"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_starts_at_index" ON "ams2026"."sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "talk_people_person_id_index" ON "ams2026"."talk_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "talks_session_id_index" ON "ams2026"."talks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "talks_starts_at_index" ON "ams2026"."talks" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "sessions_starts_at_index" ON "gsa2026"."sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "talk_people_person_id_index" ON "gsa2026"."talk_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "talks_session_id_index" ON "gsa2026"."talks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "talks_starts_at_index" ON "gsa2026"."talks" USING btree ("starts_at");