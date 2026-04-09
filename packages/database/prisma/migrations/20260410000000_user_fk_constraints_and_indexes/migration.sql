-- Migration: user_fk_constraints_and_indexes
--
-- Adds DB-level User FK constraints (onDelete: Cascade) to all owner-scoped
-- models that previously had a bare ownerUserId String with no referential
-- integrity enforcement.  Also adds:
--   • B7: unique partial constraint — at most one default pipeline per user
--   • YELLOW indexes: (ownerUserId, createdAt) on contacts,
--                     (leadFormId, submittedAt) on lead_submissions

-- ─── pipelines ───────────────────────────────────────────────────────────────
ALTER TABLE "pipelines"
  ADD CONSTRAINT "pipelines_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- B7: enforce at most one default pipeline per user.
-- A plain @@unique([ownerUserId, isDefault]) would prevent having more than one
-- non-default pipeline per user (all share isDefault=false). We use a partial
-- unique index instead: unique only when isDefault IS TRUE.
CREATE UNIQUE INDEX "pipelines_owner_default_uidx"
  ON "pipelines" ("ownerUserId")
  WHERE "isDefault" = TRUE;

-- ─── contact_notes ───────────────────────────────────────────────────────────
ALTER TABLE "contact_notes"
  ADD CONSTRAINT "contact_notes_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── contact_custom_fields ───────────────────────────────────────────────────
ALTER TABLE "contact_custom_fields"
  ADD CONSTRAINT "contact_custom_fields_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── deals ───────────────────────────────────────────────────────────────────
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── email_templates ─────────────────────────────────────────────────────────
ALTER TABLE "email_templates"
  ADD CONSTRAINT "email_templates_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── contact_tasks ───────────────────────────────────────────────────────────
ALTER TABLE "contact_tasks"
  ADD CONSTRAINT "contact_tasks_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── appointment_types ───────────────────────────────────────────────────────
ALTER TABLE "appointment_types"
  ADD CONSTRAINT "appointment_types_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── bookings ────────────────────────────────────────────────────────────────
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── YELLOW: performance indexes ─────────────────────────────────────────────

-- Sort performance for contacts list (ownerUserId + createdAt cover paginated
-- lists ordered by newest-first which is the default sort in the CRM view).
CREATE INDEX "contacts_ownerUserId_createdAt_idx"
  ON "contacts" ("ownerUserId", "createdAt" DESC);

-- Lead submission history queries filter by form and sort by submission time.
CREATE INDEX "lead_submissions_leadFormId_submittedAt_idx"
  ON "lead_submissions" ("leadFormId", "submittedAt" DESC);
