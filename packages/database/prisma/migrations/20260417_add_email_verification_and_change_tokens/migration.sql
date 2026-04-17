ALTER TABLE "users"
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

ALTER TABLE "email_verification_tokens"
ADD CONSTRAINT "email_verification_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pending_email_changes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_email_changes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_email_changes_tokenHash_key" ON "pending_email_changes"("tokenHash");
CREATE INDEX "pending_email_changes_userId_idx" ON "pending_email_changes"("userId");
CREATE INDEX "pending_email_changes_expiresAt_idx" ON "pending_email_changes"("expiresAt");
CREATE INDEX "pending_email_changes_newEmail_idx" ON "pending_email_changes"("newEmail");

ALTER TABLE "pending_email_changes"
ADD CONSTRAINT "pending_email_changes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
