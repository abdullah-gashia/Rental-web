"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToastStore } from "@/lib/stores/toast-store";
import { getWalletBalance } from "@/lib/actions/escrow-actions";
import { createRentalOrder } from "@/lib/actions/rental-checkout";
import {
  useRentalCheckoutReducer,
  calcRentalPricing,
  canAdvance,
} from "./useRentalCheckoutReducer";
import DateSelectionStep from "./DateSelectionStep";
import PickupStep from "./PickupStep";
import PaymentStep from "./PaymentStep";
import AgreementStep from "./AgreementStep";
import PriceBreakdown from "./PriceBreakdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentalItem {
  id: string;
  title: string;
  price: number;
  emoji: string | null;
  dailyRate: number | null;
  securityDeposit: number | null;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  lateFeePerDay: number | null;
  isRenewable: boolean;
  maxRenewals: number;
  rentalTerms: string | null;
  rentalInstructions: string | null;
  seller: { id: string; name: string | null };
  images: { url: string; isMain: boolean }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: RentalItem;
}

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "เลือกวันเช่า" },
  { num: 2, label: "นัดรับ" },
  { num: 3, label: "ชำระเงิน" },
  { num: 4, label: "สัญญา & ยืนยัน" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RentalCheckoutWizard({ isOpen, onClose, item }: Props) {
  const router    = useRouter();
  const showToast = useToastStore((s) => s.show);
  const { state, dispatch, reset } = useRentalCheckoutReducer();
  const [isPending, startTransition] = useTransition();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Normalised item rental fields — fall back to item.price if dailyRate not set
  const dailyRate        = (item.dailyRate && item.dailyRate > 0 ? item.dailyRate : null) ?? item.price ?? 0;
  const securityDeposit  = item.securityDeposit  ?? 0;
  const minRentalDays    = item.minRentalDays    ?? 1;
  const maxRentalDays    = item.maxRentalDays    ?? 30;

  useEffect(() => {
    if (isOpen) {
      getWalletBalance().then((res) => {
        if ("walletBalance" in res) setWalletBalance(res.walletBalance ?? null);
      });
    } else {
      reset();
      setSubmitError(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const pricing = calcRentalPricing(state.startDate, state.endDate, dailyRate, securityDeposit);
  const canNext = canAdvance(state, minRentalDays, maxRentalDays);

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const res = await createRentalOrder({
        itemId:           item.id,
        rentalStartDate:  new Date(state.startDate).toISOString(),
        rentalEndDate:    new Date(state.endDate).toISOString(),
        pickupLocation:   state.pickupLocation,
        pickupDateTime:   new Date(state.pickupDateTime).toISOString(),
        pickupNote:       state.pickupNote || undefined,
        returnLocation:   state.sameReturnLocation ? state.pickupLocation : state.returnLocation,
        paymentMethod:    state.paymentMethod,
        agreementAccepted: true,
      });

      if (res.success) {
        showToast("ส่งคำขอเช่าแล้ว! รอเจ้าของตอบรับ");
        onClose();
        router.push(`/rental/orders/${res.orderId}`);
      } else {
        setSubmitError(res.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    });
  }

  if (!isOpen) return null;

  const img = item.images.find((i) => i.isMain)?.url ?? item.images[0]?.url;

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md z-10
                      max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f0ede7] flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#111]">🔑 ทำรายการเช่าสินค้า</h2>
            <p className="text-[11px] text-[#999]">ขั้นตอน {state.step}/4</p>
          </div>
          <button
            onClick={() => !isPending && onClose()}
            className="text-[#999] hover:text-[#333] text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 flex items-center gap-1 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                state.step > s.num
                  ? "bg-[#e8500a] text-white"
                  : state.step === s.num
                    ? "bg-[#111] text-white"
                    : "bg-[#f0ede7] text-[#aaa]"
              }`}>
                {state.step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-[10px] hidden sm:block ${
                state.step === s.num ? "text-[#111] font-semibold" : "text-[#aaa]"
              }`}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${
                  state.step > s.num ? "bg-[#e8500a]" : "bg-[#f0ede7]"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Item summary strip */}
        <div className="px-5 pb-3 flex items-center gap-3 bg-[#faf9f7] mx-5 rounded-xl flex-shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#e5e3de] flex-shrink-0 flex items-center justify-center mt-3 mb-3">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{item.emoji ?? "📦"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 py-3">
            <p className="text-xs font-semibold text-[#111] truncate">{item.title}</p>
            <p className="text-[11px] text-[#999]">
              ฿{dailyRate.toLocaleString()}/วัน · {item.seller.name ?? "—"}
            </p>
          </div>
          {pricing.rentalDays > 0 && (
            <div className="text-right flex-shrink-0 py-3">
              <p className="text-xs font-bold text-[#e8500a]">฿{pricing.totalPaid.toLocaleString()}</p>
              <p className="text-[10px] text-[#999]">รวม</p>
            </div>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.step === 1 && (
            <DateSelectionStep
              state={state}
              item={{ dailyRate, securityDeposit, minRentalDays, maxRentalDays, lateFeePerDay: item.lateFeePerDay }}
              onChange={(startDate, endDate) => dispatch({ type: "SET_DATES", startDate, endDate })}
            />
          )}

          {state.step === 2 && (
            <PickupStep
              state={state}
              startDate={state.startDate}
              onUpdate={(fields) => {
                dispatch({ type: "SET_PICKUP", pickupLocation: fields.pickupLocation, pickupDateTime: fields.pickupDateTime, pickupNote: fields.pickupNote });
                dispatch({ type: "SET_RETURN_LOCATION", same: fields.sameReturnLocation, returnLocation: fields.returnLocation });
              }}
            />
          )}

          {state.step === 3 && (
            <PaymentStep
              state={state}
              pricing={pricing}
              walletBalance={walletBalance}
              onSetPayment={(method) => dispatch({ type: "SET_PAYMENT", paymentMethod: method })}
            />
          )}

          {state.step === 4 && (
            <AgreementStep
              state={state}
              item={{
                title: item.title,
                seller: item.seller,
                lateFeePerDay: item.lateFeePerDay,
                rentalTerms: item.rentalTerms,
              }}
              pricing={pricing}
              onSetAgreement={(accepted) => dispatch({ type: "SET_AGREEMENT", accepted })}
              onGotoStep={(step) => dispatch({ type: "GOTO_STEP", step })}
            />
          )}

          {submitError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-xl">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-5 pb-5 pt-3 border-t border-[#f0ede7] flex-shrink-0 space-y-3">
          {/* Mini price reminder on steps 2-4 */}
          {state.step > 1 && pricing.rentalDays > 0 && (
            <PriceBreakdown pricing={pricing} compact />
          )}

          <div className="flex gap-3">
            {state.step > 1 && (
              <button
                onClick={() => dispatch({ type: "PREV_STEP" })}
                disabled={isPending}
                className="flex-1 py-3 border border-[#e5e3de] text-sm font-medium text-[#555]
                           rounded-xl hover:bg-[#f0ede7] transition disabled:opacity-50"
              >
                ← ย้อนกลับ
              </button>
            )}

            {state.step < 4 ? (
              <button
                onClick={() => dispatch({ type: "NEXT_STEP" })}
                disabled={!canNext || isPending}
                className="flex-1 py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                           hover:bg-[#c94208] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext || isPending}
                className="flex-1 py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                           hover:bg-[#c94208] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? "กำลังส่งคำขอ..."
                  : `🔑 ยืนยันการเช่า ฿${pricing.totalPaid.toLocaleString()}`}
              </button>
            )}
          </div>

          {state.step === 4 && (
            <p className="text-[11px] text-[#aaa] text-center">
              เงินจะถูกหักเมื่อเจ้าของตอบรับ · มัดจำคืนหลังคืนของสำเร็จ
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
