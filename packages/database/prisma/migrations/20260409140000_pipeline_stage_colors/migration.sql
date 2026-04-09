-- AlterTable: add stageColors column to pipelines
ALTER TABLE "pipelines" ADD COLUMN "stageColors" JSONB NOT NULL DEFAULT '{}';
