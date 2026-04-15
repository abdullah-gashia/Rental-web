"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLending } from "@/lib/actions/lending-orders";
import type { LendingItemWithOwner } from "@/lib/actions/lending-items";
import { RENTAL_TYPE_LABELS } from "@/lib/constants/lending";

interface Props {
  item: LendingItemWithOwner;
  isAuthenticated: boolean;
  walletBalance: number;
}

export default function BorrowModal({ item, isAuthenticated, walletBalance }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(item.minLendingDays);
  const [meetupLocation, setMeetupLocation] = useState(item.meetupLocations[0] ?? "");
  const [meetupNote, setMeetupNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function calcRentalFee() {
    if (item.rentalType === "FREE") return 0;
    if (item.rentalType === "FLAT_FEE") return item.flatFee ?? 0;
    return (item.dailyRate ?? 0) * days;
  }

  const rentalFee = calcRentalFee();
  const platformFee = Math.round(rentalFee * 0.05 * 100) / 100;
  const totalCost = item.depositAmount + rentalFee + platformFee;
  const canAfford = walletBalance >= totalCost;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await requestLending(item.id, days, meetupLocation || undefined, meetupNote || undefined);
      if (res.success) {
        setOpen(false);
        router.push(`/lending/orders/${res.orderId}`);
      } else {
        setError(res.error);
      }
    });
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => router.push("/auth/signin")}
        className="w-full py-3.5 bg-[#e8500a] text-white font-bold rounded-2xl hover:bg-[#c94208] transition text-sm"
      >
        เข้าสู่ระบบเพื่อเช่าเลย
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={item.status !== "AVAILABLE"}
        className="w-full py-3.5 bg-[#e8500a] text-white font-bold rounded-2xl hover:bg-[#c94208]
                   transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {item.status === "AVAILABLE" ? "🔑 เช่าเลย" : "ไม่พร้อมให้ยืมในขณะนี้"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !pending && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#111]">ยืนยันการขอยืม</h2>
              <button onClick={() => setOpen(false)} className="text-[#999] hover:text-[#333] text-lg">✕</button>
            </div>

            {/* Item summary */}
            <div className="bg-[#faf9f7] rounded-xl p-3.5 mb-4 flex items-center gap-3">
              {item.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#e5e3de] flex items-center justify-center text-2xl flex-shrink-0">📦</div>
              )}
              <div>
                <p className="text-sm font-semibold text-[#111] line-clamp-1">{item.title}</p>
                <p className="text-xs text-[#777] mt-0.5">{RENTAL_TYPE_LABELS[item.rentalType]}</p>
              </div>
            </div>

            {/* Days picker */}
            {item.rentalType !== "FLAT_FEE" && item.rentalType !== "FREE" && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-[#555] block mb-2">
                  จำนวนวันที่ต้องการยืม
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDays((d) => Math.max(item.minLendingDays, d - 1))}
                    className="w-9 h-9 rounded-xl border border-[#e5e3de] text-lg font-bold text-[#555]
                               hover:bg-[#f0ede7] transition flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold text-[#111] w-10 text-center">{days}</span>
                  <button
                    onClick={() => setDays((d) => Math.min(item.maxLendingDays, d + 1))}
                    className="w-9 h-9 rounded-xl border border-[#e5e3de] text-lg font-bold text-[#555]
                               hover:bg-[#f0ede7] transition flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-xs text-[#999]">วัน (สูงสุด {item.maxLendingDays})</span>
                </div>
              </div>
            )}

            {/* Meetup location */}
            {item.allowMeetup && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-[#555] block mb-2">สถานที่นัดรับ</label>
                {item.meetupLocations.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.meetupLocations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setMeetupLocation(loc)}
                        className={`px-3 py-1.5 text-xs rounded-xl border transition ${
                          meetupLocation === loc
                            ? "bg-[#e8500a]/10 border-[#e8500a] text-[#e8500a] font-semibold"
                            : "border-[#e5e3de] text-[#555] hover:border-[#aaa]"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  type="text"
                  value={meetupLocation}
                  onChange={(e) => setMeetupLocation(e.target.value)}
                  placeholder="หรือระบุสถานที่เอง..."
                  className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
                />
              </div>
            )}

            <div className="mb-5">
              <label className="text-xs font-semibold text-[#555] block mb-2">หมายเหตุถึงเจ้าของ (ไม่บังคับ)</label>
              <textarea
                value={meetupNote}
                onChange={(e) => setMeetupNote(e.target.value)}
                rows={2}
                placeholder="เช่น ขอรับวันจันทร์ 9.00-11.00 น."
                className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                           focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
              />
            </div>

            {/* Cost breakdown */}
            <div className="bg-[#faf9f7] rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#555]">
                <span>ค่าเช่า {item.rentalType === "DAILY_RATE" ? `(${days} วัน × ฿${item.dailyRate ?? 0})` : ""}</span>
                <span>{item.rentalType === "FREE" ? "ฟรี" : `฿${rentalFee.toLocaleString()}`}</span>
              </div>
              {platformFee > 0 && (
                <div className="flex justify-between text-[#555]">
                  <span>ค่าธรรมเนียมระบบ (5%)</span>
                  <span>฿{platformFee.toLocaleString()}</span>
                </div>
              )}
              {item.depositAmount > 0 && (
                <div className="flex justify-between text-[#555]">
                  <span>มัดจำ (คืนหลังส่งของ)</span>
                  <span>฿{item.depositAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-[#e5e3de] pt-2 flex justify-between font-bold text-[#111]">
                <span>รวมทั้งหมด</span>
                <span>฿{totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[#999]">
                <span>ยอดกระเป๋าของคุณ</span>
                <span className={canAfford ? "text-green-600" : "text-red-600"}>
                  ฿{walletBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {!canAfford && (
              <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl mb-4">
                ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อน
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 py-3 border border-[#e5e3de] text-sm font-medium text-[#555] rounded-xl
                           hover:bg-[#f0ede7] transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending || !canAfford}
                className="flex-1 py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                           hover:bg-[#c94208] transition disabled:opacity-50"
              >
                {pending ? "กำลังส่งคำขอ..." : "ยืนยันขอยืม"}
              </button>
            </div>

            <p className="text-[11px] text-[#aaa] text-center mt-3">
              เงินจะถูกหักเมื่อเจ้าของตอบรับ และคืนหลังจากส่งมอบสำเร็จ
            </p>
          </div>
        </div>
      )}
    </>
  );
}
