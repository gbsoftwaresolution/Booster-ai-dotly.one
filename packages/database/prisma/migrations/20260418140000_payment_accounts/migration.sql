CREATE TABLE "payment_accounts" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "country" VARCHAR(2),
    "status" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_accounts_providerAccountId_key" ON "payment_accounts"("providerAccountId");
CREATE INDEX "payment_accounts_userId_idx" ON "payment_accounts"("userId");
CREATE INDEX "payment_accounts_provider_idx" ON "payment_accounts"("provider");
CREATE UNIQUE INDEX "payment_accounts_userId_provider_key" ON "payment_accounts"("userId", "provider");

ALTER TABLE "payment_accounts"
ADD CONSTRAINT "payment_accounts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerAccountId" TEXT;
