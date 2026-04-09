-- Gap 1: Threaded Notes
CREATE TABLE "contact_notes" (
    "id"          TEXT NOT NULL,
    "contactId"   TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "content"     VARCHAR(10000) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contact_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contact_notes_contactId_idx" ON "contact_notes"("contactId");
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gap 2: Custom Fields
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'URL', 'SELECT');

CREATE TABLE "contact_custom_fields" (
    "id"           TEXT NOT NULL,
    "ownerUserId"  TEXT NOT NULL,
    "label"        VARCHAR(100) NOT NULL,
    "fieldType"    "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options"      JSONB NOT NULL DEFAULT '[]',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_custom_fields_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contact_custom_fields_ownerUserId_idx" ON "contact_custom_fields"("ownerUserId");

CREATE TABLE "contact_custom_field_values" (
    "id"        TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fieldId"   TEXT NOT NULL,
    "value"     VARCHAR(2000) NOT NULL,
    CONSTRAINT "contact_custom_field_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contact_custom_field_values_contactId_fieldId_key"
    ON "contact_custom_field_values"("contactId", "fieldId");
CREATE INDEX "contact_custom_field_values_contactId_idx" ON "contact_custom_field_values"("contactId");
ALTER TABLE "contact_custom_field_values"
    ADD CONSTRAINT "contact_custom_field_values_contactId_fkey"
        FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "contact_custom_field_values_fieldId_fkey"
        FOREIGN KEY ("fieldId") REFERENCES "contact_custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gap 3 + 13: Deals
CREATE TYPE "DealStage" AS ENUM ('PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

CREATE TABLE "deals" (
    "id"          TEXT NOT NULL,
    "contactId"   TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title"       VARCHAR(300) NOT NULL,
    "value"       DECIMAL(18,2),
    "currency"    VARCHAR(3) NOT NULL DEFAULT 'USD',
    "stage"       "DealStage" NOT NULL DEFAULT 'PROSPECT',
    "probability" INTEGER,
    "closeDate"   TIMESTAMP(3),
    "notes"       VARCHAR(5000),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "deals_contactId_idx" ON "deals"("contactId");
CREATE INDEX "deals_ownerUserId_idx" ON "deals"("ownerUserId");
ALTER TABLE "deals" ADD CONSTRAINT "deals_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gap 5: Email tracking fields on ContactEmail
ALTER TABLE "contact_emails"
    ADD COLUMN "trackingToken" TEXT,
    ADD COLUMN "openedAt"      TIMESTAMP(3),
    ADD COLUMN "clickedAt"     TIMESTAMP(3);
CREATE UNIQUE INDEX "contact_emails_trackingToken_key" ON "contact_emails"("trackingToken")
    WHERE "trackingToken" IS NOT NULL;

-- Gap 6: Email Templates
CREATE TABLE "email_templates" (
    "id"          TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name"        VARCHAR(200) NOT NULL,
    "subject"     VARCHAR(998) NOT NULL,
    "body"        VARCHAR(50000) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_templates_ownerUserId_idx" ON "email_templates"("ownerUserId");

-- Gap 7: Tasks
CREATE TABLE "contact_tasks" (
    "id"          TEXT NOT NULL,
    "contactId"   TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title"       VARCHAR(500) NOT NULL,
    "dueAt"       TIMESTAMP(3),
    "completed"   BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contact_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contact_tasks_contactId_idx" ON "contact_tasks"("contactId");
CREATE INDEX "contact_tasks_ownerUserId_completed_idx" ON "contact_tasks"("ownerUserId", "completed");
ALTER TABLE "contact_tasks" ADD CONSTRAINT "contact_tasks_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
