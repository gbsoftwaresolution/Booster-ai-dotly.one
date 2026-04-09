-- Add explicit foreign key from LeadSubmission.contactId to Contact
ALTER TABLE "lead_submissions" ADD CONSTRAINT "lead_submissions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove unused duplicate columns from CrmPipeline (notes and tags live on Contact)
ALTER TABLE "crm_pipeline" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "crm_pipeline" DROP COLUMN IF EXISTS "tags";
