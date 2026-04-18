CREATE TABLE "sales_link_bookings" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "name" TEXT,
    "slot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_link_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sales_link_bookings_username_createdAt_idx" ON "sales_link_bookings"("username", "createdAt");
CREATE INDEX "sales_link_bookings_leadId_idx" ON "sales_link_bookings"("leadId");
CREATE UNIQUE INDEX "sales_link_bookings_username_slot_key" ON "sales_link_bookings"("username", "slot");

ALTER TABLE "sales_link_bookings"
ADD CONSTRAINT "sales_link_bookings_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
