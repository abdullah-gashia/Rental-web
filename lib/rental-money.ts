/**
 * The money rules of a rental, in one place.
 *
 * Two ways to pay, and they move different amounts:
 *
 *   ESCROW  The renter's wallet pays rent + 5% fee + deposit at checkout.
 *           The owner is paid the full rent when the item comes back; the fee
 *           stays with the platform and is what the Pattara welfare fund counts.
 *
 *   COD     The rent is paid in cash at collection, straight to the owner, so
 *           the platform holds only the deposit and charges no fee — the same
 *           rule as a cash sale.
 *
 * Late fees and a damage fee are paid out of the deposit. Before, they were
 * added to the owner's payout without being taken from anyone, and the owner
 * also lost 5% of the rent on top of the 5% the renter had already paid.
 */

export const RENTAL_FEE_RATE = 0.05;

export type RentalPaymentMethod = "ESCROW" | "COD";

/** The platform fee for a rental paid this way. */
export function rentalPlatformFee(rentalFee: number, method: RentalPaymentMethod): number {
  return method === "COD" ? 0 : Math.round(rentalFee * RENTAL_FEE_RATE * 100) / 100;
}

/** What the platform is holding for an order — the amount a refund must return. */
export function heldByPlatform(order: {
  paymentMethod?: string | null;
  totalPaid: number;
  securityDeposit: number;
}): number {
  return order.paymentMethod === "COD" ? order.securityDeposit : order.totalPaid;
}

/**
 * Who gets what when a rental ends.
 *
 * Fees owed by the renter come out of the deposit and never exceed it; a lost
 * item forfeits the whole deposit. Nothing is paid that the platform does not
 * hold, so the wallets always add up.
 */
export function settleRental(order: {
  paymentMethod?: string | null;
  rentalFee: number;
  securityDeposit: number;
  lateFees: number;
}, damageFees: number, isLost: boolean) {
  const rentToOwner = order.paymentMethod === "COD" ? 0 : order.rentalFee;
  const claimed = isLost
    ? order.securityDeposit
    : Math.min(order.securityDeposit, Math.max(0, damageFees) + Math.max(0, order.lateFees));
  const depositRefund = order.securityDeposit - claimed;
  const ownerPayout = rentToOwner + claimed;
  return { depositRefund, ownerPayout, claimed };
}
