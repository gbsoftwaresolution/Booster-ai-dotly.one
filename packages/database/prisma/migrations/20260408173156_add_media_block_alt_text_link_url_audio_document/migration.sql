-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaBlockType" ADD VALUE 'AUDIO';
ALTER TYPE "MediaBlockType" ADD VALUE 'DOCUMENT';

-- AlterTable
ALTER TABLE "media_blocks" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "linkUrl" TEXT;
