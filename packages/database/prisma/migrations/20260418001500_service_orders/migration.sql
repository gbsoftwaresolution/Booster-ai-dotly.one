-- Service checkout lifecycle enum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('INTENT_CREATED', 'VERIFIED', 'COMPLETED', 'EXPIRED');

-- Service orders placed from public cards
CREATE TABLE "service_orders" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "paymentId" VARCHAR(100) NOT NULL,
  "serviceId" VARCHAR(100) NOT NULL,
  "serviceName" VARCHAR(160) NOT NULL,
  "customerName" VARCHAR(120) NOT NULL,
  "customerEmail" VARCHAR(254) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "recipientAddress" VARCHAR(42) NOT NULL,
  "amountUsdt" VARCHAR(32) NOT NULL,
  "amountRaw" VARCHAR(64) NOT NULL,
  "tokenAddress" VARCHAR(42) NOT NULL,
  "chainId" INTEGER NOT NULL,
  "notes" VARCHAR(1000),
  "status" "ServiceOrderStatus" NOT NULL DEFAULT 'INTENT_CREATED',
  "txHash" VARCHAR(66),
  "verifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_orders_paymentId_key" ON "service_orders"("paymentId");
CREATE UNIQUE INDEX "service_orders_txHash_key" ON "service_orders"("txHash");
CREATE INDEX "service_orders_ownerUserId_status_idx" ON "service_orders"("ownerUserId", "status");
CREATE INDEX "service_orders_cardId_status_idx" ON "service_orders"("cardId", "status");

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_cardId_fkey"
FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
