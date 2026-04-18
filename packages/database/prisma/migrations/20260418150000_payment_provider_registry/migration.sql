CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE_CONNECT', 'UPI_LINK');
CREATE TYPE "PaymentAccountType" AS ENUM ('COMPANY', 'INDIVIDUAL');
CREATE TYPE "PaymentAccountStatus" AS ENUM ('NOT_STARTED', 'PENDING_ONBOARDING', 'ACTIVE', 'DISABLED');

ALTER TABLE "users"
ADD COLUMN "defaultPaymentProvider" "PaymentProvider";

ALTER TABLE "payments"
ALTER COLUMN "provider" TYPE "PaymentProvider"
USING (
  CASE
    WHEN "provider" = 'stripe_connect' THEN 'STRIPE_CONNECT'::"PaymentProvider"
    WHEN "provider" = 'upi_link' THEN 'UPI_LINK'::"PaymentProvider"
    ELSE NULL
  END
);

ALTER TABLE "payment_accounts"
ALTER COLUMN "provider" TYPE "PaymentProvider"
USING (
  CASE
    WHEN "provider" = 'stripe_connect' THEN 'STRIPE_CONNECT'::"PaymentProvider"
    WHEN "provider" = 'upi_link' THEN 'UPI_LINK'::"PaymentProvider"
    ELSE 'STRIPE_CONNECT'::"PaymentProvider"
  END
),
ALTER COLUMN "accountType" TYPE "PaymentAccountType"
USING (
  CASE
    WHEN lower("accountType") = 'company' THEN 'COMPANY'::"PaymentAccountType"
    ELSE 'INDIVIDUAL'::"PaymentAccountType"
  END
),
ALTER COLUMN "status" TYPE "PaymentAccountStatus"
USING (
  CASE
    WHEN lower("status") = 'active' THEN 'ACTIVE'::"PaymentAccountStatus"
    WHEN lower("status") = 'disabled' THEN 'DISABLED'::"PaymentAccountStatus"
    WHEN lower("status") = 'not_started' THEN 'NOT_STARTED'::"PaymentAccountStatus"
    ELSE 'PENDING_ONBOARDING'::"PaymentAccountStatus"
  END
);

CREATE TABLE "payment_provider_registry" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "supportedCountries" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_provider_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_provider_registry_provider_key" ON "payment_provider_registry"("provider");

INSERT INTO "payment_provider_registry" ("id", "provider", "displayName", "enabled", "supportedCountries")
VALUES
  (gen_random_uuid(), 'STRIPE_CONNECT', 'Stripe Connect', true, ARRAY[]::TEXT[]),
  (gen_random_uuid(), 'UPI_LINK', 'UPI Payment Link', true, ARRAY['IN']);
