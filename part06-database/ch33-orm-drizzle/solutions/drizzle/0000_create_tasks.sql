CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_title_check" CHECK (length("tasks"."title") BETWEEN 1 AND 100),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" IN ('todo', 'doing', 'done'))
);
