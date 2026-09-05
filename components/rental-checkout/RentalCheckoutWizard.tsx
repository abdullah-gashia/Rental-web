"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

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
  const tr = useTr();
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
        showToast(tr("ส่งคำขอเช่าแล้ว! รอเจ้าของตอบรับ"));
        onClose();
        router.push(`/rental/orders/${res.orderId}`);
      } else {
        setSubmitError(res.error ?? tr("เกิดข้อผิดพลาด กรุณาลองใหม่"));
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
      <div className="relative bg-[var(--c-surface)] rounded-t-3xl sm:rounded-2xl w-full max-w-md z-10
                      max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--c-line-soft)] flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[var(--c-ink)]">{tr("🔑 ทำรายการเช่าสินค้า")}</h2>
            <p className="text-[11px] text-[var(--c-faint)]">{tr("ขั้นตอน {0}/4", [state.step])}</p>
          </div>
          <button
            onClick={() => !isPending && onClose()}
            className="text-[var(--c-faint)] hover:text-[var(--c-ink-1)] text-lg leading-none"
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
                  ? "bg-[var(--c-accent)] text-white"
                  : state.step === s.num
                    ? "bg-[var(--c-ink)] text-white"
                    : "bg-[var(--c-line-soft)] text-[var(--c-faint)]"
              }`}>
                {state.step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-[10px] hidden sm:block ${
                state.step === s.num ? "text-[var(--c-ink)] font-semibold" : "text-[var(--c-faint)]"
              }`}>{tr(s.label)}</span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${
                  state.step > s.num ? "bg-[var(--c-accent)]" : "bg-[var(--c-line-soft)]"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Item summary strip */}
        <div className="px-5 pb-3 flex items-center gap-3 bg-[var(--c-subtle)] mx-5 rounded-xl flex-shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--c-line)] flex-shrink-0 flex items-center justify-center mt-3 mb-3">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl">{item.emoji ?? "📦"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 py-3">
            <p className="text-xs font-semibold text-[var(--c-ink)] truncate">{item.title}</p>
            <p className="text-[11px] text-[var(--c-faint)]">
              ฿{dailyRate.toLocaleString()}/วัน · {item.seller.name ?? "—"}
            </p>
          </div>
          {pricing.rentalDays > 0 && (
            <div className="text-right flex-shrink-0 py-3">
              <p className="text-xs font-bold text-[var(--c-accent)]">฿{pricing.totalPaid.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--c-faint)]">{tr("รวม")}</p>
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
            <div className="mt-4 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] text-[var(--c-danger)] text-xs px-3 py-2.5 rounded-xl">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-5 pb-5 pt-3 border-t border-[var(--c-line-soft)] flex-shrink-0 space-y-3">
          {/* Mini price reminder on steps 2-4 */}
          {state.step > 1 && pricing.rentalDays > 0 && (
            <PriceBreakdown pricing={pricing} compact />
          )}

          <div className="flex gap-3">
            {state.step > 1 && (
              <button
                onClick={() => dispatch({ type: "PREV_STEP" })}
                disabled={isPending}
                className="flex-1 py-3 border border-[var(--c-line)] text-sm font-medium text-[var(--c-ink-2)]
                           rounded-xl hover:bg-[var(--c-line-soft)] transition disabled:opacity-50"
              >{tr("← ย้อนกลับ")}</button>
            )}

            {state.step < 4 ? (
              <button
                onClick={() => dispatch({ type: "NEXT_STEP" })}
                disabled={!canNext || isPending}
                className="flex-1 py-3 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl
                           hover:bg-[var(--c-accent-str)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >{tr("ถัดไป →")}</button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext || isPending}
                className="flex-1 py-3 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl
                           hover:bg-[var(--c-accent-str)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? tr("กำลังส่งคำขอ...")
                  : tr("🔑 ยืนยันการเช่า ฿{0}", [pricing.totalPaid.toLocaleString()])}
              </button>
            )}
          </div>

          {state.step === 4 && (
            <p className="text-[11px] text-[var(--c-faint)] text-center">{tr("เงินจะถูกหักเมื่อเจ้าของตอบรับ · มัดจำคืนหลังคืนของสำเร็จ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
