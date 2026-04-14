import {
  FLAT_SHIPPING_COST,
  ESCROW_PLATFORM_FEE_RATE,
  COD_PLATFORM_FEE_RATE,
} from "@/lib/config/shipping-rates";

/**
 * Calculate shipping cost.
 * MVP: flat rate ฿50 for SHIPPING, ฿0 for MEETUP.
 */
export function calculateShippingCost(deliveryMethod: "SHIPPING" | "MEETUP"): number {
  return deliveryMethod === "SHIPPING" ? FLAT_SHIPPING_COST : 0;
}

/**
 * Calculate platform fee based on payment method.
 * Escrow: 5% of item price. COD: 0% (incentivize Escrow).
 */
export function calculatePlatformFee(
  itemPrice: number,
  paymentMethod: "ESCROW" | "COD"
): number {
  const rate = paymentMethod === "ESCROW" ? ESCROW_PLATFORM_FEE_RATE : COD_PLATFORM_FEE_RATE;
  return Math.round(itemPrice * rate * 100) / 100;
}

/**
 * Calculate total order amount.
 */
export function calculateTotal(
  itemPrice: number,
  shippingCost: number,
  platformFee: number
): number {
  return itemPrice + shippingCost + platformFee;
}

/**
 * Calculate seller payout = total - platform fee.
 */
export function calculateSellerPayout(totalAmount: number, platformFee: number): number {
  return totalAmount - platformFee;
}

/**
 * Get full price breakdown for the checkout review step.
 */
export function getPriceBreakdown(
  itemPrice: number,
  deliveryMethod: "SHIPPING" | "MEETUP",
  paymentMethod: "ESCROW" | "COD"
) {
  const shippingCost = calculateShippingCost(deliveryMethod);
  const platformFee = calculatePlatformFee(itemPrice, paymentMethod);
  const totalAmount = calculateTotal(itemPrice, shippingCost, platformFee);
  const sellerPayout = calculateSellerPayout(totalAmount, platformFee);

  return {
    itemPrice,
    shippingCost,
    platformFee,
    totalAmount,
    sellerPayout,
  };
}
