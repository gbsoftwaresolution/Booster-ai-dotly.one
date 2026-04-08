/*
  Warnings:

  - You are about to alter the column `subject` on the `contact_emails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(998)`.
  - You are about to alter the column `body` on the `contact_emails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - The `role` column on the `team_invites` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[ownerUserId,email]` on the table `contacts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[boosterAiOrderId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LeadFieldType" AS ENUM ('TEXT', 'EMAIL', 'PHONE', 'URL', 'TEXTAREA', 'SELECT');

-- AlterTable
ALTER TABLE "contact_emails" ALTER COLUMN "subject" SET DATA TYPE VARCHAR(998),
ALTER COLUMN "body" SET DATA TYPE VARCHAR(5000);

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "boosterAiOrderId" TEXT,
ADD COLUMN     "boosterAiPartnerId" TEXT;

-- AlterTable
ALTER TABLE "team_invites" DROP COLUMN "role",
ADD COLUMN     "role" "TeamRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "lead_forms" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Connect with me',
    "description" TEXT NOT NULL DEFAULT 'Leave your details and they''ll be in touch.',
    "buttonText" TEXT NOT NULL DEFAULT 'Connect',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_fields" (
    "id" TEXT NOT NULL,
    "leadFormId" TEXT NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "fieldType" "LeadFieldType" NOT NULL DEFAULT 'TEXT',
    "placeholder" VARCHAR(200),
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "lead_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" VARCHAR(2000),
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_passes" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "googlePassId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_forms_cardId_key" ON "lead_forms"("cardId");

-- CreateIndex
CREATE INDEX "lead_fields_leadFormId_idx" ON "lead_fields"("leadFormId");

-- CreateIndex
CREATE INDEX "webhook_endpoints_userId_idx" ON "webhook_endpoints"("userId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries"("endpointId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_deliveredAt_idx" ON "webhook_deliveries"("endpointId", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_cardId_key" ON "wallet_passes"("cardId");

-- CreateIndex
CREATE INDEX "analytics_events_cardId_type_idx" ON "analytics_events"("cardId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_ownerUserId_email_key" ON "contacts"("ownerUserId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_boosterAiOrderId_key" ON "subscriptions"("boosterAiOrderId");

-- CreateIndex
CREATE INDEX "subscriptions_boosterAiOrderId_idx" ON "subscriptions"("boosterAiOrderId");

-- CreateIndex
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- AddForeignKey
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_fields" ADD CONSTRAINT "lead_fields_leadFormId_fkey" FOREIGN KEY ("leadFormId") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_passes" ADD CONSTRAINT "wallet_passes_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
