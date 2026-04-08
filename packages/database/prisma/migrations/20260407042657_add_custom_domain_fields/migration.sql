/*
  Warnings:

  - Added the required column `updatedAt` to the `custom_domains` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verificationToken` to the `custom_domains` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- AlterTable
ALTER TABLE "custom_domains" ADD COLUMN     "cardId" TEXT,
ADD COLUMN     "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationToken" TEXT NOT NULL,
ALTER COLUMN "txtRecord" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "custom_domains_domain_idx" ON "custom_domains"("domain");

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
