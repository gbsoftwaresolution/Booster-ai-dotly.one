-- Migration: add ON DELETE CASCADE to teams.owner_user_id FK
-- Fixes: GDPR deleteUserAccount crashes with FK violation when user owns teams

ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_ownerUserId_fkey";

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
