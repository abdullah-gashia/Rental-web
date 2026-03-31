"use client";

import { useState } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useToastStore } from "@/lib/stores/toast-store";
import Modal from "@/components/ui/Modal";
import { createItem } from "@/lib/actions/item-actions";

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PostAdModal({ isOpen, onClose }: PostAdModalProps) {
  const t = useLocaleStore((s) => s.t);
  const showToast = useToastStore((s) => s.show);
  const [step, setStep] = useState(1);
  const [adType, setAdType] = useState<"sell" | "rent">("sell");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [condition, setCondition] = useState("LIKE_NEW");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [shippable, setShippable] = useState(false);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const conditions = [
    { key: "LIKE_NEW", label: t("post_cond_like_new") },
    { key: "GOOD", label: t("post_cond_good") },
    { key: "FAIR", label: t("post_cond_fair") },
    { key: "NEEDS_REPAIR", label: t("post_cond_needs_repair") },
  ];

  const resetForm = () => {
    setStep(1); setAdType("sell"); setCategory(""); setName(""); setDesc("");
    setCondition("LIKE_NEW"); setPrice(""); setLocation("");
    setNegotiable(false); setShippable(false); setContact("");
    setLoading(false);
  };

  const handleNextFromStep1 = () => {
    if (!category) {
      showToast("⚠️ กรุณาเลือกหมวดหมู่ก่อน");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    // ── Client-side validation ──────────────────────────
    if (!name.trim()) {
      showToast(t("post_error_name"));
      setStep(2);
      return;
    }
    const parsedPrice = Number(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast(t("post_error_price"));
      return;
    }

    setLoading(true);

    // ── Call the real server action ─────────────────────
    const result = await createItem({
      title:       name.trim(),
      description: desc.trim() || "-",        // description is required in DB
      price:       parsedPrice,
      listingType: adType === "sell" ? "SELL" : "RENT",
      condition:   condition as "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR",
      categorySlug: category,
      location:    location || undefined,
      negotiable,
      shippable,
      contact:     contact || undefined,
    });

    setLoading(false);

    if (result.error) {
      // Show the exact server error — never silently swallow it
      showToast(`❌ ${result.error}`);
      return;
    }

    // ── Only reach here on confirmed success ────────────
    showToast(t("post_success", { name: name.trim() }));
    resetForm();
    onClose();
  };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">{t("post_title")}</h2>
          <p className="text-sm text-[#9a9590] mt-0.5">{t("post_step", { step })}</p>
        </div>
        <button onClick={handleClose} className="text-[#9a9590] hover:text-[#111] text-xl leading-none">✕</button>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-1.5 mb-7">
        {[1, 2, 3].map((d) => (
          <div key={d} className={`step-dot ${d === step ? "active" : ""}`} />
        ))}
      </div>

      {/* Step 1: Type & Category */}
      {step === 1 && (
        <div>
          <p className="text-sm font-semibold mb-3">{t("post_type_label")}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["sell", "rent"] as const).map((type) => (
              <label key={type} className="cursor-pointer">
                <input type="radio" name="adType" value={type} checked={adType === type} onChange={() => setAdType(type)} className="hidden peer" />
                <div className="peer-checked:border-[#111] peer-checked:bg-[#f7f6f3] border border-[#e5e3de] rounded-2xl p-4 text-center hover:bg-[#f7f6f3] transition">
                  <div className="text-2xl mb-1">{type === "sell" ? "🏷️" : "🔑"}</div>
                  <p className="text-sm font-semibold">{t(type === "sell" ? "post_type_sell" : "post_type_rent")}</p>
                  <p className="text-[11px] text-[#9a9590]">{t(type === "sell" ? "post_type_sell_desc" : "post_type_rent_desc")}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-sm font-semibold mb-2">{t("post_category_label")}</p>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm bg-white mb-5">
            <option value="">{t("post_category_placeholder")}</option>
            <option value="secondhand">{t("cat_secondhand")}</option>
            <option value="electronics">{t("cat_electronics")}</option>
            <option value="vehicles">{t("cat_vehicles")}</option>
            <option value="boardgames">{t("cat_boardgames")}</option>
            <option value="books">{t("cat_books")}</option>
            <option value="rental">{t("cat_rental")}</option>
          </select>
          <button onClick={handleNextFromStep1} className="w-full bg-[#111] text-white font-semibold py-3 rounded-xl hover:bg-[#333] transition">
            {t("post_next")}
          </button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div>
          <p className="text-sm font-semibold mb-2">{t("post_photos_label")} <span className="text-[#9a9590] font-normal text-xs">({t("post_photos_max")})</span></p>
          <div className="img-drop-zone mb-3">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm font-medium">{t("post_photos_drop")}</p>
            <p className="text-xs text-[#9a9590] mt-1">{t("post_photos_format")}</p>
          </div>
          <p className="text-sm font-semibold mb-2">{t("post_name_label")}</p>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder={t("post_name_placeholder")} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm mb-3" />
          <p className="text-sm font-semibold mb-2">{t("post_desc_label")}</p>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder={t("post_desc_placeholder")} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm mb-3 resize-none" />
          <p className="text-sm font-semibold mb-2">{t("post_condition_label")}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {conditions.map((c) => (
              <span
                key={c.key}
                onClick={() => setCondition(c.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition ${
                  condition === c.key ? "border-[#111] bg-[#f7f6f3]" : "border-[#e5e3de] hover:border-[#111]"
                }`}
              >
                {c.label}
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-[#e5e3de] font-semibold py-3 rounded-xl hover:bg-[#f0ede7] transition">{t("post_back")}</button>
            <button onClick={() => setStep(3)} className="flex-1 bg-[#111] text-white font-semibold py-3 rounded-xl hover:bg-[#333] transition">{t("post_next")}</button>
          </div>
        </div>
      )}

      {/* Step 3: Price & Location */}
      {step === 3 && (
        <div>
          <p className="text-sm font-semibold mb-2">{t("post_price_label")}</p>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder={t("post_price_placeholder")} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm mb-2" />
          <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-[#555]">
            <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="rounded" /> {t("post_negotiable")}
          </label>
          <p className="text-sm font-semibold mb-2">{t("post_location_label")}</p>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm bg-white mb-3">
            <option value="">{t("post_location_placeholder")}</option>
            <option>หอพักนักศึกษา</option><option>อาคาร CoC</option><option>อาคาร SC</option>
            <option>โรงอาหาร</option><option>หน้า 7-11</option><option>อื่นๆ</option>
          </select>
          <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-[#555]">
            <input type="checkbox" checked={shippable} onChange={(e) => setShippable(e.target.checked)} className="rounded" /> {t("post_shippable")}
          </label>
          <p className="text-sm font-semibold mb-2">{t("post_contact_label")}</p>
          <input value={contact} onChange={(e) => setContact(e.target.value)} type="text" placeholder={t("post_contact_placeholder")} className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm mb-5" />

          {/* Preview */}
          {name && (
            <div className="mb-5 p-4 bg-[#f7f6f3] border border-[#e5e3de] rounded-2xl">
              <p className="text-xs font-semibold text-[#9a9590] uppercase tracking-wider mb-3">{t("post_preview_label")}</p>
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-[#e5e3de] flex items-center justify-center text-2xl">📦</div>
                <div>
                  <p className="text-sm font-bold text-[#111]">{name}</p>
                  <p className="text-sm font-bold text-[#e8500a] mt-0.5">{price ? `${Number(price).toLocaleString()} ฿` : "—"}</p>
                  <p className="text-xs text-[#9a9590] mt-0.5">{location || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 border border-[#e5e3de] font-semibold py-3 rounded-xl hover:bg-[#f0ede7] transition disabled:opacity-40"
            >
              {t("post_back")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[#e8500a] text-white font-semibold py-3 rounded-xl hover:bg-[#c94208] transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังลงประกาศ...
                </>
              ) : t("post_submit")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
