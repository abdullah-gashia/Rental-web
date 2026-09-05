/**
 * The unit a rental price is quoted in.
 *
 * The seller's list and the edit form both printed "/เดือน" for every rental,
 * whatever the listing actually said, so a camera at ฿300 a day read as ฿300 a
 * month. The rate type is on the item; there is no reason to guess at it.
 *
 * The Thai string is the return value because that is what tr() takes as its
 * key — call it as tr(rentalUnit(item.rentalRateType)).
 */
export function rentalUnit(rateType: string | null | undefined): string {
  switch (rateType) {
    case "MONTHLY":
      return "/เดือน";
    case "YEARLY":
      return "/ปี";
    default:
      // DAILY, and anything older that predates the field being set.
      return "/วัน";
  }
}
