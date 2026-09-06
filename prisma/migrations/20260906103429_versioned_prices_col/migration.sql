-- DropIndex
DROP INDEX "plan_prices_plan_id_billing_interval_interval_count_key";

-- AlterTable
ALTER TABLE "plan_prices" ADD COLUMN     "code" VARCHAR(100) NOT NULL DEFAULT 'TEMP',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateIndex
CREATE INDEX "plan_prices_plan_id_billing_interval_idx" ON "plan_prices"("plan_id", "billing_interval");

-- Backfill data
UPDATE "plan_prices" pp
SET "code" = UPPER(p.code) || '-' || UPPER(pp.billing_interval::text) || '-V1'
FROM "plans" p
WHERE pp.plan_id = p.id;

-- Drop default for code
ALTER TABLE "plan_prices" ALTER COLUMN "code" DROP DEFAULT;
