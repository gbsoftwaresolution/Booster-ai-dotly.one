-- CreateTable
CREATE TABLE "card_messages" (
    "id"          TEXT NOT NULL,
    "cardId"      TEXT NOT NULL,
    "senderName"  VARCHAR(200) NOT NULL,
    "senderEmail" VARCHAR(254),
    "message"     VARCHAR(5000) NOT NULL,
    "read"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_voice_notes" (
    "id"          TEXT NOT NULL,
    "cardId"      TEXT NOT NULL,
    "senderName"  VARCHAR(200) NOT NULL,
    "senderEmail" VARCHAR(254),
    "audioUrl"    VARCHAR(2048) NOT NULL,
    "durationSec" INTEGER,
    "mimeType"    VARCHAR(100) NOT NULL,
    "fileSize"    INTEGER,
    "read"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_voice_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_dropbox_files" (
    "id"          TEXT NOT NULL,
    "cardId"      TEXT NOT NULL,
    "senderName"  VARCHAR(200) NOT NULL,
    "senderEmail" VARCHAR(254),
    "fileName"    VARCHAR(500) NOT NULL,
    "fileUrl"     VARCHAR(2048) NOT NULL,
    "mimeType"    VARCHAR(100) NOT NULL,
    "fileSize"    INTEGER,
    "read"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_dropbox_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_memories" (
    "id"          TEXT NOT NULL,
    "contactId"   TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "content"     VARCHAR(2000) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_messages_cardId_idx" ON "card_messages"("cardId");
CREATE INDEX "card_messages_cardId_createdAt_idx" ON "card_messages"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "card_voice_notes_cardId_idx" ON "card_voice_notes"("cardId");
CREATE INDEX "card_voice_notes_cardId_createdAt_idx" ON "card_voice_notes"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "card_dropbox_files_cardId_idx" ON "card_dropbox_files"("cardId");
CREATE INDEX "card_dropbox_files_cardId_createdAt_idx" ON "card_dropbox_files"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_memories_contactId_idx" ON "contact_memories"("contactId");
CREATE INDEX "contact_memories_ownerUserId_idx" ON "contact_memories"("ownerUserId");

-- AddForeignKey
ALTER TABLE "card_messages"     ADD CONSTRAINT "card_messages_cardId_fkey"     FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "card_voice_notes"  ADD CONSTRAINT "card_voice_notes_cardId_fkey"  FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "card_dropbox_files" ADD CONSTRAINT "card_dropbox_files_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_memories"  ADD CONSTRAINT "contact_memories_contactId_fkey"   FOREIGN KEY ("contactId")   REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_memories"  ADD CONSTRAINT "contact_memories_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
