-- Migration: Change CrmPipeline.stage from ContactStage enum to String
-- This allows custom pipeline stages to be stored as arbitrary strings,
-- making multi-pipeline support fully functional with user-defined stage names.

-- Step 1: Add a new String column alongside the existing enum column
ALTER TABLE "crm_pipeline" ADD COLUMN "stage_new" TEXT NOT NULL DEFAULT 'NEW';

-- Step 2: Copy existing enum values into the new column
UPDATE "crm_pipeline" SET "stage_new" = "stage"::TEXT;

-- Step 3: Drop the old enum column
ALTER TABLE "crm_pipeline" DROP COLUMN "stage";

-- Step 4: Rename the new column to take the old name
ALTER TABLE "crm_pipeline" RENAME COLUMN "stage_new" TO "stage";

-- Step 5: Recreate the index on (ownerUserId, stage) for query performance
-- (The old index was dropped along with the column)
DROP INDEX IF EXISTS "crm_pipeline_ownerUserId_stage_idx";
CREATE INDEX "crm_pipeline_ownerUserId_stage_idx" ON "crm_pipeline" ("ownerUserId", "stage");
