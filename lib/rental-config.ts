/**
 * How long a rental request waits for the owner before the system gives up.
 *
 * A week, not a day: owners are students who may be off campus, mid-exam or
 * simply not checking the site. Cancelling after 24 hours killed requests that
 * would have been accepted. After this window the renter is refunded, told by
 * e-mail, and the listing goes back on the market.
 */
export const RENTAL_REQUEST_TIMEOUT_DAYS = 7;

export const RENTAL_REQUEST_TIMEOUT_MS =
  RENTAL_REQUEST_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
