-- Add slug column to teams table
-- Backfill existing rows: derive slug from name using a SQL expression
ALTER TABLE "teams" ADD COLUMN "slug" TEXT;

-- Backfill: lowercase + replace non-alphanumeric runs with hyphens + strip leading/trailing hyphens
UPDATE "teams"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))
WHERE "slug" IS NULL;

-- Handle any duplicate slugs that arise from backfill by appending the id suffix
UPDATE "teams" t
SET "slug" = t."slug" || '-' || SUBSTRING(t."id", 1, 6)
WHERE (
  SELECT COUNT(*) FROM "teams" t2 WHERE t2."slug" = t."slug"
) > 1;

-- Now make the column non-nullable and add unique constraint
ALTER TABLE "teams" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");
