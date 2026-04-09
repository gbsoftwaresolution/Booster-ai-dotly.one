-- CreateTable
CREATE TABLE "lead_submissions" (
    "id" TEXT NOT NULL,
    "leadFormId" TEXT NOT NULL,
    "contactId" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_submissions_leadFormId_idx" ON "lead_submissions"("leadFormId");

-- CreateIndex
CREATE INDEX "lead_submissions_contactId_idx" ON "lead_submissions"("contactId");

-- AddForeignKey
ALTER TABLE "lead_submissions" ADD CONSTRAINT "lead_submissions_leadFormId_fkey" FOREIGN KEY ("leadFormId") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
