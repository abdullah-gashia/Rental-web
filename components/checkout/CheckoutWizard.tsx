"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToastStore } from "@/lib/stores/toast-store";
import { getWalletBalance } from "@/lib/actions/escrow-actions";
import { createOrder } from "@/lib/actions/checkout";
import { getPriceBreakdown } from "@/lib/utils/pricing";
import type { CreateOrderInput } from "@/lib/validations/checkout";
import { useCheckoutReducer, canAdvanceFromStep } from "./useCheckoutReducer";
import WizardProgressBar from "./WizardProgressBar";
import OrderSummaryCard from "./OrderSummaryCard";
import DeliveryStep from "./DeliveryStep";
import PaymentStep from "./PaymentStep";
import ReviewStep from "./ReviewStep";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedAddr {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  district: string;
  province: string;
  postalCode: string;
  note?: string | null;
  isDefault: boolean;
}

interface CheckoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    price: number;
    emoji?: string | null;
    allowShipping: boolean;
    allowMeetup: boolean;
    allowCOD: boolean;
    seller: { id: string; name: string | null };
    images: { url: string; isMain: boolean }[];
  };
  savedAddresses?: SavedAddr[];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CheckoutWizard({
  isOpen,
  onClose,
  item,
  savedAddresses = [],
}: CheckoutWizardProps) {
  const router    = useRouter();
  const showToast = useToastStore((s) => s.show);
  const { state, dispatch, reset } = useCheckoutReducer();

  const [walletBalance,  setWalletBalance]  = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoadingBalance(true);
      getWalletBalance().then((res) => {
        if ("walletBalance" in res) setWalletBalance(res.walletBalance ?? null);
        setLoadingBalance(false);
      });
    }
  }, [isOpen]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.isSubmitting) handleClose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleEsc]);

  function handleClose() {
    if (state.isSubmitting) return;
    reset();
    onClose();
  }

  const mainImage  = item.images.find((i) => i.isMain) ?? item.images[0];
  const deliveryMethod = state.deliveryMethod ?? "SHIPPING";
  const paymentMethod  = state.paymentMethod  ?? "ESCROW";
  const breakdown  = getPriceBreakdown(item.price, deliveryMethod, paymentMethod);
  const hasSufficientBalance = walletBalance !== null && walletBalance >= breakdown.totalAmount;
  const canAdvance = canAdvanceFromStep(state, state.currentStep, hasSufficientBalance);

  async function handleSubmit() {
    if (!state.deliveryMethod || !state.paymentMethod) return;
    dispatch({ type: "SUBMIT_START" });

    const baseInput = {
      itemId:          item.id,
      paymentMethod:   state.paymentMethod,
      codRiskAccepted: state.codRiskAccepted,
      saveAddress:     state.saveAddressForLater,
    };

    let input: CreateOrderInput;

    if (state.deliveryMethod === "SHIPPING" && state.shippingAddress) {
      input = { ...baseInput, deliveryMethod: "SHIPPING" as const, shippingAddress: state.shippingAddress };
    } else if (state.deliveryMethod === "MEETUP" && state.meetupLocation && state.meetupDateTime) {
      input = {
        ...baseInput,
        deliveryMethod: "MEETUP" as const,
        meetupLocation: state.meetupLocation,
        meetupDateTime: new Date(state.meetupDateTime).toISOString(),
        meetupNote:     state.meetupNote ?? undefined,
      };
    } else {
      dispatch({ type: "SUBMIT_ERROR", payload: "ข้อมูลไม่ครบถ้วน" });
      return;
    }

    const result = await createOrder(input);

    if (result.success) {
      dispatch({ type: "SUBMIT_SUCCESS" });
      showToast("✅ สร้างคำสั่งซื้อเรียบร้อยแล้ว!");
      reset();
      onClose();
      router.push("/dashboard/orders");
    } else {
      dispatch({ type: "SUBMIT_ERROR", payload: result.error });
    }
  }

  if (!isOpen) return null;

  return (
    /* ── Backdrop: handles overflow so the white card can grow freely ───────── */
    <div
      className="fixed inset-0 z-[110] overflow-y-auto bg-black/50 backdrop-blur-sm"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* Inner flex wrapper: min-h-full ensures centering even when card is short */}
      <div
        className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        {/* ── Sheet / Card — height driven by content, no internal scroll ──────── */}
        <div
          className="relative bg-white w-full sm:max-w-[520px] rounded-t-3xl sm:rounded-3xl sm:mb-0"
          style={{
            boxShadow: "0 -8px 40px rgba(0,0,0,0.16), 0 32px 80px rgba(0,0,0,0.18)",
            animation: "sheetSlideUp 0.35s cubic-bezier(.22,.68,0,1.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — mobile only */}
          <div className="sm:hidden flex justify-center pt-3 pb-0">
            <div className="w-9 h-1 rounded-full bg-[#d1cec9]" />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={state.isSubmitting}
            aria-label="ปิด"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#f0ede7] hover:bg-[#e5e3de] flex items-center justify-center text-[#777] hover:text-[#111] transition disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="px-6 pt-5 pb-2 pr-14">
            <h2 className="text-lg font-extrabold text-[#111] tracking-tight">สั่งซื้อสินค้า</h2>
            <p className="text-xs text-[#9a9590] mt-0.5">ขั้นตอน {state.currentStep}/3</p>
          </div>

          {/* ── Content — natural height, no overflow scroll ─────────────────── */}
          <div className="px-6 pb-4">
            <WizardProgressBar step={state.currentStep} />

            <OrderSummaryCard
              title={item.title}
              price={item.price}
              sellerName={item.seller.name}
              imageUrl={mainImage?.url}
              emoji={item.emoji}
            />

            {state.error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                ❌ {state.error}
              </div>
            )}

            {state.currentStep === 1 && (
              <DeliveryStep
                state={state}
                dispatch={dispatch}
                savedAddresses={savedAddresses}
                allowShipping={item.allowShipping}
                allowMeetup={item.allowMeetup}
              />
            )}
            {state.currentStep === 2 && (
              <PaymentStep
                state={state}
                dispatch={dispatch}
                itemPrice={item.price}
                walletBalance={walletBalance}
                loadingBalance={loadingBalance}
                allowCOD={item.allowCOD}
              />
            )}
            {state.currentStep === 3 && (
              <ReviewStep
                state={state}
                dispatch={dispatch}
                itemPrice={item.price}
                itemTitle={item.title}
                sellerName={item.seller.name}
              />
            )}
          </div>

          {/* ── Footer navigation ──────────────────────────────────────────────── */}
          <div
            className="px-6 py-4 border-t border-[#e5e3de] bg-white rounded-b-3xl"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex gap-3">
              {state.currentStep > 1 && (
                <button
                  onClick={() => dispatch({ type: "PREV_STEP" })}
                  disabled={state.isSubmitting}
                  className="flex-1 py-3 rounded-2xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-40"
                >
                  ← ย้อนกลับ
                </button>
              )}

              {state.currentStep < 3 ? (
                <button
                  onClick={() => dispatch({ type: "NEXT_STEP" })}
                  disabled={!canAdvance}
                  className="flex-1 py-3 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ถัดไป →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={state.isSubmitting || !canAdvance}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {state.isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังดำเนินการ…
                    </>
                  ) : (
                    `ยืนยันการซื้อ ฿${breakdown.totalAmount.toLocaleString()}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
