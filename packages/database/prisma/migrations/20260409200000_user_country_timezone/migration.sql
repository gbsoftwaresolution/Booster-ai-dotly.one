-- AddField: country and timezone to users table
-- country: ISO 3166-1 alpha-2 code, e.g. "US", "GB", "IN"
-- timezone: IANA timezone identifier, e.g. "America/New_York", "Asia/Kolkata"

ALTER TABLE "users" ADD COLUMN "country" VARCHAR(2);
ALTER TABLE "users" ADD COLUMN "timezone" VARCHAR(64);
