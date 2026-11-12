ALTER TABLE "repos" ADD COLUMN "branch_prefix" text DEFAULT 'watchdocs/sync-' NOT NULL;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "pr_labels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "endpoint" jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "changed_files" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "doc_changes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "diff" text;