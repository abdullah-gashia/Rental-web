-- Automatic moderation verdict recorded alongside each listing.
-- All nullable: existing rows keep their current status untouched.
ALTER TABLE "Item"
  ADD COLUMN "safetyScore"       INTEGER,
  ADD COLUMN "moderationVerdict" TEXT,
  ADD COLUMN "moderationReason"  TEXT,
  ADD COLUMN "moderatedAt"       TIMESTAMP(3);
