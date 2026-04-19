-- Launch-performance indexes for the revenue path.
CREATE INDEX IF NOT EXISTS "lead_events_action_createdAt_idx"
ON "lead_events" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "sales_link_bookings_username_slot_idx"
ON "sales_link_bookings" ("username", "slot");

CREATE INDEX IF NOT EXISTS "payments_username_status_createdAt_idx"
ON "payments" ("username", "status", "createdAt");
