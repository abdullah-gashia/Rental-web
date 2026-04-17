"use client";

import { useReducer } from "react";

// ─── State ────────────────────────────────────────────────────────────────────

export interface RentalCheckoutState {
  step: 1 | 2 | 3 | 4;

  // Step 1 — dates
  startDate: string;   // ISO date string "YYYY-MM-DD"
  endDate: string;

  // Step 2 — pickup
  pickupLocation: string;
  pickupDateTime: string;  // ISO datetime local "YYYY-MM-DDTHH:mm"
  pickupNote: string;
  sameReturnLocation: boolean;
  returnLocation: string;

  // Step 3 — payment
  paymentMethod: "ESCROW" | "COD";

  // Step 4 — agreement
  agreementAccepted: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_DATES"; startDate: string; endDate: string }
  | { type: "SET_PICKUP"; pickupLocation: string; pickupDateTime: string; pickupNote: string }
  | { type: "SET_RETURN_LOCATION"; same: boolean; returnLocation: string }
  | { type: "SET_PAYMENT"; paymentMethod: "ESCROW" | "COD" }
  | { type: "SET_AGREEMENT"; accepted: boolean }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GOTO_STEP"; step: 1 | 2 | 3 | 4 }
  | { type: "RESET" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcRentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const diff  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export interface RentalPricing {
  rentalDays: number;
  rentalFee: number;
  platformFee: number;
  securityDeposit: number;
  totalPaid: number;
}

export function calcRentalPricing(
  startDate: string,
  endDate: string,
  dailyRate: number,
  securityDeposit: number,
): RentalPricing {
  const rentalDays    = calcRentalDays(startDate, endDate);
  const rentalFee     = dailyRate * rentalDays;
  const platformFee   = Math.round(rentalFee * 0.05 * 100) / 100;
  const totalPaid     = rentalFee + platformFee + securityDeposit;
  return { rentalDays, rentalFee, platformFee, securityDeposit, totalPaid };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function canAdvance(state: RentalCheckoutState, minRentalDays: number, maxRentalDays: number): boolean {
  switch (state.step) {
    case 1:
      return (
        !!state.startDate &&
        !!state.endDate &&
        calcRentalDays(state.startDate, state.endDate) >= minRentalDays &&
        calcRentalDays(state.startDate, state.endDate) <= maxRentalDays
      );
    case 2:
      return (
        !!state.pickupLocation &&
        !!state.pickupDateTime &&
        (state.sameReturnLocation || !!state.returnLocation)
      );
    case 3:
      return !!state.paymentMethod;
    case 4:
      return state.agreementAccepted;
    default:
      return false;
  }
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitialState(): RentalCheckoutState {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayStr    = today.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return {
    step: 1,
    startDate: todayStr,
    endDate:   tomorrowStr,
    pickupLocation: "",
    pickupDateTime: "",
    pickupNote: "",
    sameReturnLocation: true,
    returnLocation: "",
    paymentMethod: "ESCROW",
    agreementAccepted: false,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: RentalCheckoutState, action: Action): RentalCheckoutState {
  switch (action.type) {
    case "SET_DATES":
      return { ...state, startDate: action.startDate, endDate: action.endDate };
    case "SET_PICKUP":
      return {
        ...state,
        pickupLocation: action.pickupLocation,
        pickupDateTime: action.pickupDateTime,
        pickupNote: action.pickupNote,
      };
    case "SET_RETURN_LOCATION":
      return {
        ...state,
        sameReturnLocation: action.same,
        returnLocation: action.same ? state.pickupLocation : action.returnLocation,
      };
    case "SET_PAYMENT":
      return { ...state, paymentMethod: action.paymentMethod };
    case "SET_AGREEMENT":
      return { ...state, agreementAccepted: action.accepted };
    case "NEXT_STEP":
      return { ...state, step: Math.min(4, state.step + 1) as 1|2|3|4 };
    case "PREV_STEP":
      return { ...state, step: Math.max(1, state.step - 1) as 1|2|3|4 };
    case "GOTO_STEP":
      return { ...state, step: action.step };
    case "RESET":
      return makeInitialState();
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRentalCheckoutReducer() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  return { state, dispatch, reset: () => dispatch({ type: "RESET" }) };
}
