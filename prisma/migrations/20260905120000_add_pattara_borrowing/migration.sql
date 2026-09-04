-- ═══════════════════════════════════════════════════════════════════════════
-- งานภัทร — free equipment borrowing
--
-- Adds the PATTARA role, an office profile on User, turns the abandoned
-- lending_items / lending_orders tables into an asset register (all money
-- columns removed), and adds the welfare fund's outgoing ledger.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Roles and notification types ────────────────────────────────────────
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATTARA';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BORROW';

-- ── 2. Office profile + borrowing standing on User ─────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "officeName"           TEXT,
  ADD COLUMN IF NOT EXISTS "officeDescription"    TEXT,
  ADD COLUMN IF NOT EXISTS "officeLocation"       TEXT,
  ADD COLUMN IF NOT EXISTS "officeHours"          TEXT,
  ADD COLUMN IF NOT EXISTS "borrowSuspendedUntil" TIMESTAMP(3);

-- ── 3. Welfare fund ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "FundEntryKind" AS ENUM ('IN', 'OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FundSource" AS ENUM ('PURCHASE', 'MAINTENANCE', 'DONATION', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "fund_entries" (
  "id"           TEXT NOT NULL,
  "kind"         "FundEntryKind" NOT NULL,
  "source"       "FundSource" NOT NULL,
  "amount"       DOUBLE PRECISION NOT NULL,
  "note"         TEXT NOT NULL,
  "receiptUrl"   TEXT,
  "occurredAt"   TIMESTAMP(3) NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fund_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fund_entries_occurredAt_idx"      ON "fund_entries"("occurredAt");
CREATE INDEX IF NOT EXISTS "fund_entries_kind_occurredAt_idx" ON "fund_entries"("kind", "occurredAt");

DO $$ BEGIN
  ALTER TABLE "fund_entries"
    ADD CONSTRAINT "fund_entries_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. lending_items becomes an asset register ─────────────────────────────
--
-- The money columns are dropped rather than left in place: a depositAmount
-- sitting in a system that promises "no deposit" is a trap waiting for someone
-- to use it. Both tables are empty, so nothing is lost.
ALTER TABLE "lending_items"
  DROP COLUMN IF EXISTS "rentalType",
  DROP COLUMN IF EXISTS "dailyRate",
  DROP COLUMN IF EXISTS "flatFee",
  DROP COLUMN IF EXISTS "depositAmount",
  DROP COLUMN IF EXISTS "lateFeePerDay";

ALTER TABLE "lending_items"
  ADD COLUMN IF NOT EXISTS "assetTag"      TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "purchasedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fundEntryId"   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "lending_items_assetTag_key" ON "lending_items"("assetTag");

DO $$ BEGIN
  ALTER TABLE "lending_items"
    ADD CONSTRAINT "lending_items_fundEntryId_fkey"
    FOREIGN KEY ("fundEntryId") REFERENCES "fund_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. lending_orders loses every money column ─────────────────────────────
ALTER TABLE "lending_orders"
  DROP COLUMN IF EXISTS "rentalType",
  DROP COLUMN IF EXISTS "dailyRate",
  DROP COLUMN IF EXISTS "flatFee",
  DROP COLUMN IF EXISTS "depositAmount",
  DROP COLUMN IF EXISTS "estimatedRentalFee",
  DROP COLUMN IF EXISTS "actualRentalFee",
  DROP COLUMN IF EXISTS "lateFees",
  DROP COLUMN IF EXISTS "damageFees",
  DROP COLUMN IF EXISTS "platformFee",
  DROP COLUMN IF EXISTS "totalPaidByBorrower",
  DROP COLUMN IF EXISTS "lenderPayout",
  DROP COLUMN IF EXISTS "damageFeeRequested";

ALTER TABLE "lending_orders"
  ADD COLUMN IF NOT EXISTS "purposeNote"  TEXT,
  ADD COLUMN IF NOT EXISTS "staffNote"    TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT;

DO $$ BEGIN
  ALTER TABLE "lending_orders"
    ADD CONSTRAINT "lending_orders_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. RentalType is no longer referenced by anything ──────────────────────
DROP TYPE IF EXISTS "RentalType";
