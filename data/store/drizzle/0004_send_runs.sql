CREATE TABLE "ams2026"."sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ams2026"."sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sync_name" text NOT NULL,
	"state" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"sent" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"changed" integer DEFAULT 0 NOT NULL,
	"withdrawn" integer DEFAULT 0 NOT NULL,
	"unchanged" integer DEFAULT 0 NOT NULL,
	"programme_version" text DEFAULT '' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	CONSTRAINT "sync_runs_sync_name_unique" UNIQUE("sync_name"),
	CONSTRAINT "sync_runs_state" CHECK ("ams2026"."sync_runs"."state" in ('running', 'sent', 'failed', 'interrupted'))
);
--> statement-breakpoint
CREATE TABLE "gsa2026"."sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gsa2026"."sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sync_name" text NOT NULL,
	"state" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"sent" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"changed" integer DEFAULT 0 NOT NULL,
	"withdrawn" integer DEFAULT 0 NOT NULL,
	"unchanged" integer DEFAULT 0 NOT NULL,
	"programme_version" text DEFAULT '' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	CONSTRAINT "sync_runs_sync_name_unique" UNIQUE("sync_name"),
	CONSTRAINT "sync_runs_state" CHECK ("gsa2026"."sync_runs"."state" in ('running', 'sent', 'failed', 'interrupted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sync_runs_one_running" ON "ams2026"."sync_runs" USING btree ("state") WHERE state = 'running';--> statement-breakpoint
CREATE UNIQUE INDEX "sync_runs_one_running" ON "gsa2026"."sync_runs" USING btree ("state") WHERE state = 'running';