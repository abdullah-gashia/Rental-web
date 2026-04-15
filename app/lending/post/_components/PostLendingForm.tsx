"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createLendingItem, LENDING_CATEGORY_LABELS, LENDING_CATEGORY_EMOJI, CONDITION_LABELS } from "@/lib/actions/lending-items";
import type { LendingCategory, RentalType, ItemCondition } from "@prisma/client";

const CATEGORIES: LendingCategory[] = [
  "TEXTBOOKS", "LAB_EQUIPMENT", "ELECTRONICS", "TOOLS",
  "SPORTS", "MUSIC_INSTRUMENTS", "COSTUMES_OUTFITS",
  "STUDY_SUPPLIES", "VEHICLES", "OTHER",
];

const CONDITIONS: ItemCondition[] = ["LIKE_NEW", "GOOD", "FAIR", "NEEDS_REPAIR"];

export default function PostLendingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<LendingCategory>("OTHER");
  const [condition, setCondition] = useState<ItemCondition>("GOOD");
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [rentalType, setRentalType] = useState<RentalType>("DAILY_RATE");
  const [dailyRate, setDailyRate] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [lateFeePerDay, setLateFeePerDay] = useState("0");
  const [maxDays, setMaxDays] = useState("7");
  const [minDays, setMinDays] = useState("1");
  const [isRenewable, setIsRenewable] = useState(true);
  const [maxRenewals, setMaxRenewals] = useState("1");
  const [meetupLocation, setMeetupLocation] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).slice(0, 5 - images.length).map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          return data.url as string;
        })
      );
      setImages((prev) => [...prev, ...uploads.filter(Boolean)]);
    } catch {
      setError("อัปโหลดรูปภาพล้มเหลว กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await createLendingItem({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        condition,
        images,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        rentalType,
        dailyRate: rentalType === "DAILY_RATE" ? parseFloat(dailyRate) || 0 : undefined,
        flatFee: rentalType === "FLAT_FEE" ? parseFloat(flatFee) || 0 : undefined,
        depositAmount: parseFloat(depositAmount) || 0,
        lateFeePerDay: parseFloat(lateFeePerDay) || 0,
        maxLendingDays: parseInt(maxDays) || 7,
        minLendingDays: parseInt(minDays) || 1,
        isRenewable,
        maxRenewals: parseInt(maxRenewals) || 1,
        allowMeetup: true,
        meetupLocations: meetupLocation
          ? meetupLocation.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });

      if (res.success) {
        router.push(`/lending/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#333]">ข้อมูลพื้นฐาน</h2>

        <div>
          <label className="text-xs font-semibold text-[#555] block mb-1.5">ชื่อสินค้า *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น กล้อง Canon EOS M50, หนังสือ Calculus เล่ม 1"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#555] block mb-1.5">รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="อธิบายสภาพ การใช้งาน ข้อควรระวัง ฯลฯ"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl resize-none
                       focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">หมวดหมู่ *</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs border transition text-left ${
                    category === cat
                      ? "bg-[#e8500a]/10 border-[#e8500a] text-[#e8500a] font-semibold"
                      : "border-[#e5e3de] text-[#555] hover:border-[#aaa]"
                  }`}
                >
                  <span>{LENDING_CATEGORY_EMOJI[cat]}</span>
                  <span className="truncate">{LENDING_CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">สภาพสินค้า *</label>
            <div className="space-y-1.5">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border transition text-left ${
                    condition === c
                      ? "bg-[#e8500a]/10 border-[#e8500a] text-[#e8500a] font-semibold"
                      : "border-[#e5e3de] text-[#555] hover:border-[#aaa]"
                  }`}
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#555] block mb-1.5">แท็ก (คั่นด้วยจุลภาค)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="เช่น calculus, textbook, ปี1"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
          />
        </div>
      </section>

      {/* Images */}
      <section className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#333]">รูปภาพสินค้า *</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e5e3de]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}

          {images.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#e5e3de] flex flex-col
                         items-center justify-center text-[#aaa] hover:border-[#e8500a] hover:text-[#e8500a]
                         transition disabled:opacity-50 text-xs"
            >
              {uploading ? (
                <span className="animate-spin text-base">⟳</span>
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span>อัปโหลด</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />
        <p className="text-[11px] text-[#aaa]">สูงสุด 5 รูป — ถ่ายให้เห็นสภาพจริง</p>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#333]">ราคาและค่าธรรมเนียม</h2>

        <div>
          <label className="text-xs font-semibold text-[#555] block mb-2">ประเภทการเช่า *</label>
          <div className="flex gap-2">
            {(["FREE", "DAILY_RATE", "FLAT_FEE"] as RentalType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRentalType(t)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition ${
                  rentalType === t
                    ? "bg-[#e8500a] text-white border-[#e8500a]"
                    : "border-[#e5e3de] text-[#555] hover:border-[#aaa]"
                }`}
              >
                {t === "FREE" ? "ฟรี" : t === "DAILY_RATE" ? "รายวัน" : "เหมา"}
              </button>
            ))}
          </div>
        </div>

        {rentalType === "DAILY_RATE" && (
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ค่าเช่าต่อวัน (฿) *</label>
            <input
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            />
          </div>
        )}

        {rentalType === "FLAT_FEE" && (
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ค่าเช่าเหมา (฿) *</label>
            <input
              type="number"
              value={flatFee}
              onChange={(e) => setFlatFee(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">มัดจำ (฿)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            />
            <p className="text-[11px] text-[#aaa] mt-1">คืนหลังส่งของครบ</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ค่าปรับล่าช้า (฿/วัน)</label>
            <input
              type="number"
              value={lateFeePerDay}
              onChange={(e) => setLateFeePerDay(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            />
          </div>
        </div>
      </section>

      {/* Availability */}
      <section className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#333]">เงื่อนไขการยืม</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ยืมขั้นต่ำ (วัน)</label>
            <input
              type="number"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              min="1"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ยืมสูงสุด (วัน)</label>
            <input
              type="number"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              min="1"
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRenewable((v) => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              isRenewable ? "bg-[#e8500a]" : "bg-[#ddd]"
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isRenewable ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <span className="text-sm text-[#555]">อนุญาตให้ต่ออายุการยืม</span>
        </div>

        {isRenewable && (
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">ต่ออายุได้สูงสุด (ครั้ง)</label>
            <input
              type="number"
              value={maxRenewals}
              onChange={(e) => setMaxRenewals(e.target.value)}
              min="1"
              max="5"
              className="w-32 px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-[#555] block mb-1.5">สถานที่นัดรับ (คั่นด้วยจุลภาค)</label>
          <input
            value={meetupLocation}
            onChange={(e) => setMeetupLocation(e.target.value)}
            placeholder="เช่น หน้าหอสมุด, ตึก EN, คณะวิศวกรรมศาสตร์"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3.5 border border-[#e5e3de] text-sm font-medium text-[#555] rounded-xl
                     hover:bg-[#f0ede7] transition"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || uploading}
          className="flex-1 py-3.5 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                     hover:bg-[#c94208] transition disabled:opacity-50"
        >
          {pending ? "กำลังลงรายการ..." : "ลงรายการให้ยืม"}
        </button>
      </div>
    </div>
  );
}
