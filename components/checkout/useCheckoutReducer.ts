"use client";

import { useReducer, useCallback } from "react";
import type { ShippingAddress } from "@/lib/validations/checkout";

// ─── State Shape ─────────────────────────────────────────────────────────────

export type DeliveryMethod = "SHIPPING" | "MEETUP";
export type PaymentMethod = "ESCROW" | "COD";

export interface CheckoutState {
  // Step 1: Delivery
  deliveryMethod: DeliveryMethod | null;
  shippingAddress: ShippingAddress | null;
  savedAddressId: string | null;
  saveAddressForLater: boolean;
  meetupLocation: string | null;
  meetupDateTime: string | null; // ISO string
  meetupNote: string | null;

  // Step 2: Payment
  paymentMethod: PaymentMethod | null;
  codRiskAccepted: boolean;

  // Step 3: Review
  termsAccepted: boolean;

  // Meta
  currentStep: 1 | 2 | 3;
  isSubmitting: boolean;
  error: string | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type CheckoutAction =
  | { type: "SET_DELIVERY_METHOD"; payload: DeliveryMethod }
  | { type: "SET_SHIPPING_ADDRESS"; payload: ShippingAddress }
  | { type: "SELECT_SAVED_ADDRESS"; payload: { id: string; address: ShippingAddress } }
  | { type: "SET_MEETUP_LOCATION"; payload: string }
  | { type: "SET_MEETUP_DATETIME"; payload: string }
  | { type: "SET_MEETUP_NOTE"; payload: string }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "TOGGLE_COD_RISK" }
  | { type: "TOGGLE_TERMS" }
  | { type: "TOGGLE_SAVE_ADDRESS" }
  | { type: "GO_TO_STEP"; payload: 1 | 2 | 3 }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "RESET" };

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: CheckoutState = {
  deliveryMethod: null,
  shippingAddress: null,
  savedAddressId: null,
  saveAddressForLater: false,
  meetupLocation: null,
  meetupDateTime: null,
  meetupNote: null,
  paymentMethod: "ESCROW",
  codRiskAccepted: false,
  termsAccepted: false,
  currentStep: 1,
  isSubmitting: false,
  error: null,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "SET_DELIVERY_METHOD":
      return {
        ...state,
        deliveryMethod: action.payload,
        // Reset the fields for the other method
        ...(action.payload === "SHIPPING"
          ? { meetupLocation: null, meetupDateTime: null, meetupNote: null }
          : { shippingAddress: null, savedAddressId: null, saveAddressForLater: false }),
        error: null,
      };

    case "SET_SHIPPING_ADDRESS":
      return { ...state, shippingAddress: action.payload, savedAddressId: null, error: null };

    case "SELECT_SAVED_ADDRESS":
      return {
        ...state,
        savedAddressId: action.payload.id,
        shippingAddress: action.payload.address,
        error: null,
      };

    case "SET_MEETUP_LOCATION":
      return { ...state, meetupLocation: action.payload, error: null };

    case "SET_MEETUP_DATETIME":
      return { ...state, meetupDateTime: action.payload, error: null };

    case "SET_MEETUP_NOTE":
      return { ...state, meetupNote: action.payload };

    case "SET_PAYMENT_METHOD":
      return {
        ...state,
        paymentMethod: action.payload,
        codRiskAccepted: action.payload === "ESCROW" ? false : state.codRiskAccepted,
        error: null,
      };

    case "TOGGLE_COD_RISK":
      return { ...state, codRiskAccepted: !state.codRiskAccepted };

    case "TOGGLE_TERMS":
      return { ...state, termsAccepted: !state.termsAccepted };

    case "TOGGLE_SAVE_ADDRESS":
      return { ...state, saveAddressForLater: !state.saveAddressForLater };

    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload, error: null };

    case "NEXT_STEP":
      if (state.currentStep >= 3) return state;
      return { ...state, currentStep: (state.currentStep + 1) as 1 | 2 | 3, error: null };

    case "PREV_STEP":
      if (state.currentStep <= 1) return state;
      return { ...state, currentStep: (state.currentStep - 1) as 1 | 2 | 3, error: null };

    case "SUBMIT_START":
      return { ...state, isSubmitting: true, error: null };

    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false };

    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, error: action.payload };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Validation Guards ───────────────────────────────────────────────────────

function isValidAddress(addr: ShippingAddress | null): boolean {
  if (!addr) return false;
  return !!(
    addr.recipientName?.trim() &&
    addr.phone?.trim() &&
    addr.addressLine1?.trim() &&
    addr.district?.trim() &&
    addr.province?.trim() &&
    addr.postalCode?.trim() &&
    /^0\d{9}$/.test(addr.phone) &&
    /^\d{5}$/.test(addr.postalCode)
  );
}

export function canAdvanceFromStep(
  state: CheckoutState,
  step: number,
  hasSufficientBalance: boolean = true
): boolean {
  switch (step) {
    case 1:
      if (!state.deliveryMethod) return false;
      if (state.deliveryMethod === "SHIPPING" && !isValidAddress(state.shippingAddress)) return false;
      if (state.deliveryMethod === "MEETUP" && (!state.meetupLocation || !state.meetupDateTime)) return false;
      return true;
    case 2:
      if (!state.paymentMethod) return false;
      if (state.paymentMethod === "COD" && !state.codRiskAccepted) return false;
      if (state.paymentMethod === "ESCROW" && !hasSufficientBalance) return false;
      return true;
    case 3:
      return state.termsAccepted;
    default:
      return false;
  }
}

// ─── Hook Export ──────────────────────────────────────────────────────────────

export function useCheckoutReducer(
  overrides?: Partial<CheckoutState>
) {
  const init = overrides ? { ...initialState, ...overrides } : initialState;
  const [state, dispatch] = useReducer(checkoutReducer, init);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { state, dispatch, reset };
}
