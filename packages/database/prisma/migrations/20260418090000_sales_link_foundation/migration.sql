ALTER TABLE "users"
ADD COLUMN "username" TEXT,
ADD COLUMN "pitch" TEXT,
ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

CREATE TABLE "click_events" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "click_events_createdAt_idx" ON "click_events"("createdAt");
