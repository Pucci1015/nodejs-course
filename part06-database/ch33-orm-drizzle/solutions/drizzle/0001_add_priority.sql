ALTER TABLE "tasks" ADD COLUMN "priority" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" BETWEEN 1 AND 3);