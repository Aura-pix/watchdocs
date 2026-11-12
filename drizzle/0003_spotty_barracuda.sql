ALTER TABLE "installations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "stripe_subscription_status" text;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "overage_packs" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "webhook_delivery_id" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "usage_recorded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "runs_webhook_delivery_idx" ON "runs" USING btree ("webhook_delivery_id");