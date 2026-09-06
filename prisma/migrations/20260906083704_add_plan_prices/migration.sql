-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingInterval" ADD VALUE 'QUARTER';
ALTER TYPE "BillingInterval" ADD VALUE 'HALF_YEAR';

-- AlterTable
ALTER TABLE "subscription_events" ADD COLUMN     "new_billing_interval" "BillingInterval",
ADD COLUMN     "new_plan_price_id" UUID,
ADD COLUMN     "previous_billing_interval" "BillingInterval",
ADD COLUMN     "previous_plan_price_id" UUID;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billing_interval" "BillingInterval",
ADD COLUMN     "plan_price_id" UUID;

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "billing_interval" "BillingInterval" NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "original_amount" DECIMAL(14,2),
    "discount_amount" DECIMAL(14,2),
    "discount_percent" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_prices_plan_id_idx" ON "plan_prices"("plan_id");

-- CreateIndex
CREATE INDEX "plan_prices_is_active_idx" ON "plan_prices"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_plan_id_billing_interval_interval_count_key" ON "plan_prices"("plan_id", "billing_interval", "interval_count");

-- CreateIndex
CREATE INDEX "subscriptions_plan_price_id_idx" ON "subscriptions"("plan_price_id");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_price_id_fkey" FOREIGN KEY ("plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_previous_plan_price_id_fkey" FOREIGN KEY ("previous_plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_new_plan_price_id_fkey" FOREIGN KEY ("new_plan_price_id") REFERENCES "plan_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DATA MIGRATION: Backfill existing Plans into PlanPrices
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "plan_prices" ("id", "plan_id", "billing_interval", "interval_count", "currency", "amount", "is_active", "is_default", "created_at", "updated_at")
SELECT 
  gen_random_uuid(),
  "id",
  "billing_interval",
  "billing_interval_count",
  "currency",
  "base_price",
  true,
  true,
  NOW(),
  NOW()
FROM "plans";

-- Link existing Subscriptions to the newly created PlanPrices
UPDATE "subscriptions"
SET 
  "plan_price_id" = pp."id",
  "billing_interval" = pp."billing_interval"
FROM "plan_prices" pp
WHERE "subscriptions"."plan_id" = pp."plan_id"
  AND pp."is_default" = true;
