CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "leadId" UUID,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "stripeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_stripeId_key" ON "payments"("stripeId");
CREATE INDEX "payments_username_createdAt_idx" ON "payments"("username", "createdAt");
CREATE INDEX "payments_leadId_idx" ON "payments"("leadId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
