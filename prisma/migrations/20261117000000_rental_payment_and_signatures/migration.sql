-- How a rental was paid. NULL on older rows means ESCROW.
ALTER TABLE "rental_orders" ADD COLUMN "paymentMethod" "PaymentMethod";

-- The signatures drawn at collection (renter) and return (owner), as PNG data URLs.
ALTER TABLE "rental_orders" ADD COLUMN "pickupSignature" TEXT;
ALTER TABLE "rental_orders" ADD COLUMN "returnSignature" TEXT;
