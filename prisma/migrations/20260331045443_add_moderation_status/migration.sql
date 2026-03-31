-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemStatus" ADD VALUE 'PENDING';
ALTER TYPE "ItemStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ItemStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ItemStatus" ADD VALUE 'UNAVAILABLE';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "rejectReason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
