DROP INDEX IF EXISTS "users_supabaseId_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "supabaseId";
