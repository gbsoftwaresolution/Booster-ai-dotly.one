-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentScore" INTEGER,
ADD COLUMN     "enrichmentSummary" TEXT,
ADD COLUMN     "inferredCompanySize" TEXT,
ADD COLUMN     "inferredIndustry" TEXT,
ADD COLUMN     "inferredLinkedIn" TEXT,
ADD COLUMN     "inferredSeniority" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pushToken" TEXT;
