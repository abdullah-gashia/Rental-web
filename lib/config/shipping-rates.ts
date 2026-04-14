// Shipping cost configuration for PSU Store
// MVP: flat rate for all shipments

/** Flat shipping cost in THB */
export const FLAT_SHIPPING_COST = 50;

/** Platform fee rate for Escrow payments (5%) */
export const ESCROW_PLATFORM_FEE_RATE = 0.05;

/** Platform fee rate for COD payments (free — incentivize Escrow usage) */
export const COD_PLATFORM_FEE_RATE = 0;

/** How long the seller has to confirm an order before auto-cancel (ms) */
export const SELLER_CONFIRM_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

/** How long after delivery confirmation before auto-releasing escrow (ms) */
export const AUTO_RELEASE_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

/** Maximum days in advance a meetup can be scheduled */
export const MAX_MEETUP_DAYS_AHEAD = 7;

/** Minimum hours from now a meetup must be scheduled */
export const MIN_MEETUP_HOURS_AHEAD = 1;
