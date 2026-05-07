ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "mode" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN IF NOT EXISTS "issue_mode" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issues_mode_check') THEN
  ALTER TABLE "issues" ADD CONSTRAINT "issues_mode_check" CHECK ("mode" IN ('fast', 'normal', 'deep'));
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'heartbeat_runs_issue_mode_check') THEN
  ALTER TABLE "heartbeat_runs" ADD CONSTRAINT "heartbeat_runs_issue_mode_check" CHECK ("issue_mode" IN ('fast', 'normal', 'deep'));
 END IF;
END $$;
