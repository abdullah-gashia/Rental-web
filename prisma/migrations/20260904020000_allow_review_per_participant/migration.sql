-- Buyer and seller each get to review the other on the same order, so the
-- uniqueness moves from the order alone to (order, reviewer).
DROP INDEX "Review_orderId_key";
CREATE UNIQUE INDEX "Review_orderId_reviewerId_key" ON "Review"("orderId", "reviewerId");
