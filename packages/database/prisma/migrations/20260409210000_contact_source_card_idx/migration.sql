-- Add compound index on Contact(sourceCardId, createdAt) to support analytics
-- queries that filter by sourceCardId and sort/range on createdAt without a
-- full table scan.
CREATE INDEX "contacts_sourceCardId_createdAt_idx" ON "contacts"("sourceCardId", "createdAt");
