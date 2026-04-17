-- CRM automation enums
CREATE TYPE "AutomationTriggerEvent" AS ENUM (
  'WHATSAPP_CLICKED',
  'WHATSAPP_AUTOMATION_TRIGGERED',
  'LEAD_CAPTURED',
  'BOOKING_COMPLETED',
  'PAYMENT_COMPLETED'
);

CREATE TYPE "AutomationActionType" AS ENUM ('CREATE_TASK');

-- Persisted CRM automation rules per user
CREATE TABLE "contact_automation_rules" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "triggerEvent" "AutomationTriggerEvent" NOT NULL,
  "actionType" "AutomationActionType" NOT NULL DEFAULT 'CREATE_TASK',
  "taskTitle" VARCHAR(500) NOT NULL,
  "taskPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "taskType" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
  "delayMinutes" INTEGER NOT NULL DEFAULT 1440,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contact_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_automation_rules_ownerUserId_isActive_idx" ON "contact_automation_rules"("ownerUserId", "isActive");

ALTER TABLE "contact_automation_rules"
ADD CONSTRAINT "contact_automation_rules_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
