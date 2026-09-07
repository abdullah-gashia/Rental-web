-- Screenshots attached to an abuse report.
ALTER TABLE "Report" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- When a ban lifts by itself. NULL while banned means it stands until lifted.
ALTER TABLE "User" ADD COLUMN "banUntil" TIMESTAMP(3);

-- Finding the bans due to expire should not mean reading every account.
CREATE INDEX "User_banUntil_idx" ON "User"("banUntil");
