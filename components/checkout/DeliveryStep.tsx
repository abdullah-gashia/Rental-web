"use client";

import { useState } from "react";
import type { CheckoutState, CheckoutAction } from "./useCheckoutReducer";
import type { ShippingAddress } from "@/lib/validations/checkout";
import { CAMPUS_MEETUP_LOCATIONS } from "@/lib/config/meetup-locations";
import { THAI_PROVINCES } from "@/lib/config/provinces";

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

interface DeliveryStepProps {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  savedAddresses: SavedAddr[];
  allowShipping: boolean;
  allowMeetup: boolean;
}

// ─── Shipping Address Form ───────────────────────────────────────────────────

function ShippingAddressForm({
  state,
  dispatch,
  savedAddresses,
}: {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  savedAddresses: SavedAddr[];
}) {
  const addr = state.shippingAddress;
  const [provinceSearch, setProvinceSearch] = useState("");
  const [showProvinces, setShowProvinces] = useState(false);

  const filteredProvinces = provinceSearch
    ? THAI_PROVINCES.filter((p) => p.includes(provinceSearch))
    : THAI_PROVINCES;

  function updateField(field: keyof ShippingAddress, value: string) {
    const updated = { ...(addr || {} as ShippingAddress), [field]: value };
    dispatch({ type: "SET_SHIPPING_ADDRESS", payload: updated as ShippingAddress });
  }

  function selectSaved(sa: SavedAddr) {
    dispatch({
      type: "SELECT_SAVED_ADDRESS",
      payload: {
        id: sa.id,
        address: {
          recipientName: sa.recipientName,
          phone: sa.phone,
          addressLine1: sa.addressLine1,
          addressLine2: sa.addressLine2 ?? undefined,
          district: sa.district,
          province: sa.province,
          postalCode: sa.postalCode,
          note: sa.note ?? undefined,
        },
      },
    });
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Saved addresses */}
      {savedAddresses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#9a9590] mb-2">📍 เลือกที่อยู่ที่บันทึกไว้</p>
          <div className="space-y-2">
            {savedAddresses.map((sa) => (
              <button
                key={sa.id}
                onClick={() => selectSaved(sa)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                  state.savedAddressId === sa.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-[#e5e3de] hover:border-[#111]"
                }`}
              >
                <span className="font-semibold">{sa.isDefault ? "🏠" : "📍"} {sa.label}</span>
                <span className="text-[#9a9590] ml-2">— {sa.recipientName}, {sa.district}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[#e5e3de] my-3" />
        </div>
      )}

      {/* Manual input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="checkout-label">ชื่อผู้รับ *</label>
          <input
            type="text"
            value={addr?.recipientName ?? ""}
            onChange={(e) => updateField("recipientName", e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            className="checkout-input"
          />
        </div>
        <div>
          <label className="checkout-label">เบอร์โทร *</label>
          <input
            type="tel"
            value={addr?.phone ?? ""}
            onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0XX-XXX-XXXX"
            className="checkout-input"
          />
        </div>
      </div>

      <div>
        <label className="checkout-label">ที่อยู่ บรรทัด 1 *</label>
        <input
          type="text"
          value={addr?.addressLine1 ?? ""}
          onChange={(e) => updateField("addressLine1", e.target.value)}
          placeholder="บ้านเลขที่, ซอย, ถนน"
          className="checkout-input"
        />
      </div>

      <div>
        <label className="checkout-label">ที่อยู่ บรรทัด 2</label>
        <input
          type="text"
          value={addr?.addressLine2 ?? ""}
          onChange={(e) => updateField("addressLine2", e.target.value)}
          placeholder="ตำบล/แขวง (ถ้ามี)"
          className="checkout-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="checkout-label">อำเภอ/เขต *</label>
          <input
            type="text"
            value={addr?.district ?? ""}
            onChange={(e) => updateField("district", e.target.value)}
            placeholder="อำเภอ/เขต"
            className="checkout-input"
          />
        </div>
        <div className="relative">
          <label className="checkout-label">จังหวัด *</label>
          <input
            type="text"
            value={addr?.province ?? provinceSearch}
            onChange={(e) => {
              setProvinceSearch(e.target.value);
              updateField("province", e.target.value);
              setShowProvinces(true);
            }}
            onFocus={() => setShowProvinces(true)}
            onBlur={() => setTimeout(() => setShowProvinces(false), 200)}
            placeholder="พิมพ์เพื่อค้นหา..."
            className="checkout-input"
          />
          {showProvinces && filteredProvinces.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#e5e3de] rounded-xl shadow-lg max-h-40 overflow-y-auto">
              {filteredProvinces.slice(0, 10).map((p) => (
                <button
                  key={p}
                  onMouseDown={() => {
                    updateField("province", p);
                    setProvinceSearch("");
                    setShowProvinces(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#f7f6f3] transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="checkout-label">รหัสไปรษณีย์ *</label>
          <input
            type="text"
            value={addr?.postalCode ?? ""}
            onChange={(e) => updateField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="XXXXX"
            className="checkout-input"
            maxLength={5}
          />
        </div>
        <div>
          <label className="checkout-label">หมายเหตุ</label>
          <input
            type="text"
            value={addr?.note ?? ""}
            onChange={(e) => updateField("note", e.target.value)}
            placeholder="เช่น ห้อง 305 ตึก B"
            className="checkout-input"
          />
        </div>
      </div>

      {/* Save checkbox */}
      <label className="flex items-center gap-2 cursor-pointer text-sm text-[#555] mt-1">
        <input
          type="checkbox"
          checked={state.saveAddressForLater}
          onChange={() => dispatch({ type: "TOGGLE_SAVE_ADDRESS" })}
          className="rounded"
        />
        บันทึกที่อยู่นี้สำหรับครั้งหน้า
      </label>
    </div>
  );
}

// ─── Meetup Form ─────────────────────────────────────────────────────────────

function MeetupForm({
  state,
  dispatch,
}: {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
}) {
  const [useCustom, setUseCustom] = useState(false);

  // Min datetime: 1 hour from now
  const minDate = new Date(Date.now() + 60 * 60 * 1000);
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  function toLocalDatetime(d: Date) {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs font-bold text-[#555] uppercase tracking-wide mb-3">📍 เลือกสถานที่นัดรับ</p>

      <div className="grid grid-cols-2 gap-2.5">
        {CAMPUS_MEETUP_LOCATIONS.map((loc) => {
          const isSelected = state.meetupLocation === loc.label && !useCustom;
          return (
            <button
              key={loc.id}
              onClick={() => {
                setUseCustom(false);
                dispatch({ type: "SET_MEETUP_LOCATION", payload: loc.label });
              }}
              className={`meetup-card ${isSelected ? "selected" : ""}`}
            >
              <div className="meetup-card-icon">🏫</div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#111] leading-tight truncate">{loc.label}</p>
                <p className="text-[10px] text-[#9a9590] mt-0.5 leading-tight line-clamp-2">{loc.description}</p>
              </div>
            </button>
          );
        })}

        {/* Custom location */}
        <button
          onClick={() => {
            setUseCustom(true);
            dispatch({ type: "SET_MEETUP_LOCATION", payload: "" });
          }}
          className={`meetup-card ${useCustom ? "selected" : ""}`}
        >
          <div className="meetup-card-icon">✏️</div>
          <div>
            <p className="text-[12px] font-bold text-[#111]">ระบุเอง</p>
            <p className="text-[10px] text-[#9a9590] mt-0.5">กรอกสถานที่</p>
          </div>
        </button>
      </div>

      {/* Custom location input */}
      {useCustom && (
        <div>
          <label className="checkout-label">สถานที่ *</label>
          <input
            type="text"
            value={state.meetupLocation ?? ""}
            onChange={(e) => dispatch({ type: "SET_MEETUP_LOCATION", payload: e.target.value })}
            placeholder="ระบุสถานที่นัดรับ"
            className="checkout-input"
          />
        </div>
      )}

      {/* Date & time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="checkout-label">วันเวลานัดรับ *</label>
          <input
            type="datetime-local"
            value={state.meetupDateTime ?? ""}
            min={toLocalDatetime(minDate)}
            max={toLocalDatetime(maxDate)}
            onChange={(e) => dispatch({ type: "SET_MEETUP_DATETIME", payload: e.target.value })}
            className="checkout-input"
          />
        </div>
        <div>
          <label className="checkout-label">หมายเหตุ</label>
          <input
            type="text"
            value={state.meetupNote ?? ""}
            onChange={(e) => dispatch({ type: "SET_MEETUP_NOTE", payload: e.target.value })}
            placeholder='เช่น "ใส่เสื้อสีแดง"'
            className="checkout-input"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DeliveryStep({
  state,
  dispatch,
  savedAddresses,
  allowShipping,
  allowMeetup,
}: DeliveryStepProps) {
  // Auto-select if only one method available
  const autoMethod = !allowShipping && allowMeetup
    ? "MEETUP"
    : allowShipping && !allowMeetup
    ? "SHIPPING"
    : null;

  const currentMethod = state.deliveryMethod ?? autoMethod;

  // If auto-selected and not yet set in state
  if (autoMethod && !state.deliveryMethod) {
    dispatch({ type: "SET_DELIVERY_METHOD", payload: autoMethod });
  }

  return (
    <div className="fade-up">
      <h3 className="text-base font-bold text-[#111] mb-3">เลือกวิธีจัดส่ง</h3>

      {/* Method cards — hide if only one option */}
      {allowShipping && allowMeetup && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => dispatch({ type: "SET_DELIVERY_METHOD", payload: "SHIPPING" })}
            className={`checkout-card-radio ${currentMethod === "SHIPPING" ? "selected" : ""}`}
          >
            <span className="text-2xl">🚚</span>
            <p className="text-sm font-bold mt-1">จัดส่งถึงที่อยู่</p>
            <p className="text-xs text-[#9a9590]">ค่าส่ง ฿50</p>
            <p className="text-[10px] text-[#bbb]">2-5 วันทำการ</p>
          </button>
          <button
            onClick={() => dispatch({ type: "SET_DELIVERY_METHOD", payload: "MEETUP" })}
            className={`checkout-card-radio ${currentMethod === "MEETUP" ? "selected" : ""}`}
          >
            <span className="text-2xl">🤝</span>
            <p className="text-sm font-bold mt-1">นัดรับสินค้า</p>
            <p className="text-xs text-emerald-600 font-semibold">ฟรี!</p>
            <p className="text-[10px] text-[#bbb]">นัดเวลาเอง</p>
          </button>
        </div>
      )}

      {/* Shipping form */}
      {currentMethod === "SHIPPING" && (
        <ShippingAddressForm state={state} dispatch={dispatch} savedAddresses={savedAddresses} />
      )}

      {/* Meetup form */}
      {currentMethod === "MEETUP" && (
        <MeetupForm state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
