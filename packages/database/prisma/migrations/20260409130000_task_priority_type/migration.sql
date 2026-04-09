-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'TODO', 'FOLLOW_UP');

-- AlterTable: add priority and type columns with defaults
ALTER TABLE "contact_tasks"
  ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "type"     "TaskType"     NOT NULL DEFAULT 'TODO';
