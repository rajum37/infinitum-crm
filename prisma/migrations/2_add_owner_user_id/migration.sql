-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "owner_user_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "companies_owner_user_id_key" ON "companies"("owner_user_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

