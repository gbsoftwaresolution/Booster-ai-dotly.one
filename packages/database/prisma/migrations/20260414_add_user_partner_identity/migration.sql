-- Add persistent partner identity mapping for self-referral prevention.
ALTER TABLE "users"
ADD COLUMN "boosterAiPartnerId" TEXT;

CREATE UNIQUE INDEX "users_boosterAiPartnerId_key"
ON "users"("boosterAiPartnerId");
