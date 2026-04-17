-- Product checkout lifecycle enum
CREATE TYPE "ProductOrderStatus" AS ENUM ('INTENT_CREATED', 'VERIFIED', 'COMPLETED', 'EXPIRED');

-- Product orders placed from public card stores
CREATE TABLE "product_orders" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "paymentId" VARCHAR(100) NOT NULL,
  "productId" VARCHAR(100) NOT NULL,
  "productName" VARCHAR(160) NOT NULL,
  "customerName" VARCHAR(120) NOT NULL,
  "customerEmail" VARCHAR(254) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "recipientAddress" VARCHAR(42) NOT NULL,
  "amountUsdt" VARCHAR(32) NOT NULL,
  "amountRaw" VARCHAR(64) NOT NULL,
  "tokenAddress" VARCHAR(42) NOT NULL,
  "chainId" INTEGER NOT NULL,
  "notes" VARCHAR(1000),
  "status" "ProductOrderStatus" NOT NULL DEFAULT 'INTENT_CREATED',
  "txHash" VARCHAR(66),
  "verifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_orders_paymentId_key" ON "product_orders"("paymentId");
CREATE UNIQUE INDEX "product_orders_txHash_key" ON "product_orders"("txHash");
CREATE INDEX "product_orders_ownerUserId_status_idx" ON "product_orders"("ownerUserId", "status");
CREATE INDEX "product_orders_cardId_status_idx" ON "product_orders"("cardId", "status");

ALTER TABLE "product_orders"
ADD CONSTRAINT "product_orders_cardId_fkey"
FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_orders"
ADD CONSTRAINT "product_orders_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
