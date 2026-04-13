-- Rename SubscriptionStatus.TRIALING to PENDING.
ALTER TYPE "SubscriptionStatus" RENAME VALUE 'TRIALING' TO 'PENDING';

-- Ensure existing rows continue to use the renamed enum value as the default.
ALTER TABLE "subscriptions"
ALTER COLUMN "status" SET DEFAULT 'PENDING';
