-- AlterEnum
ALTER TYPE "MediaBlockType" ADD VALUE 'HEADING';

-- AlterTable
ALTER TABLE "media_blocks" ALTER COLUMN "url" DROP NOT NULL;
