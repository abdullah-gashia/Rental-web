-- Six-digit codes for password reset.
-- The code itself is never stored; only a bcrypt hash of it.
CREATE TABLE "password_reset_codes" (
    "id"         TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "codeHash"   TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "attempts"   INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- One live code per address: asking again replaces the last one.
CREATE UNIQUE INDEX "password_reset_codes_email_key" ON "password_reset_codes"("email");
CREATE INDEX "password_reset_codes_expiresAt_idx" ON "password_reset_codes"("expiresAt");
