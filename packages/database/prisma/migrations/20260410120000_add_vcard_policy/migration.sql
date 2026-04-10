-- CreateEnum
CREATE TYPE "VcardPolicy" AS ENUM ('PUBLIC', 'MEMBERS_ONLY');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "vcardPolicy" "VcardPolicy" NOT NULL DEFAULT 'PUBLIC';
