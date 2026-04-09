-- Gap 11: Multi-Pipeline Support
-- Creates the pipelines table and adds pipelineId FK to crm_pipeline.

CREATE TABLE "pipelines" (
    "id"          TEXT         NOT NULL,
    "ownerUserId" TEXT         NOT NULL,
    "name"        VARCHAR(200) NOT NULL,
    "stages"      JSONB        NOT NULL DEFAULT '["NEW","CONTACTED","QUALIFIED","CLOSED","LOST"]',
    "isDefault"   BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pipelines_ownerUserId_idx" ON "pipelines"("ownerUserId");

-- Add pipelineId to crm_pipeline (nullable, set-null on pipeline delete)
ALTER TABLE "crm_pipeline"
    ADD COLUMN "pipelineId" TEXT;

CREATE INDEX "crm_pipeline_pipelineId_idx" ON "crm_pipeline"("pipelineId");

ALTER TABLE "crm_pipeline"
    ADD CONSTRAINT "crm_pipeline_pipelineId_fkey"
    FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
