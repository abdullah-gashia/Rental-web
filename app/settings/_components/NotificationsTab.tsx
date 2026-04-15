"use client";

import { useState, useTransition } from "react";
import { updatePreferences } from "../actions";

interface Props {
  preferences: {
    notifyOrders:         boolean;
    notifyMessages:       boolean;
    notifyItemUpdates:    boolean;
    notifyPromotions:     boolean;
    emailWeeklySummary:   boolean;
    emailRecommendations: boolean;
  } | null;
  showToast: (ok: boolean, msg: string) => void;
}

// Default preferences if user has none yet
const DEFAULTS = {
  notifyOrders:         true,
  notifyMessages:       true,
  notifyItemUpdates:    true,
  notifyPromotions:     false,
  emailWeeklySummary:   false,
  emailRecommendations: true,
};

export default function NotificationsTab({ preferences, showToast }: Props) {
  const prefs = preferences ?? DEFAULTS;
  const [state, setState] = useState(prefs);
  const [pending, startTransition] = useTransition();

  const toggle = (key: keyof typeof state) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePreferences(state);
      showToast(res.success, res.success ? res.message : res.error);
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[#111] flex items-center gap-2">
        <span>🔔</span> การแจ้งเตือน
      </h2>

      {/* In-app notifications */}
      <div>
        <h3 className="text-sm font-semibold text-[#555] mb-3">
          การแจ้งเตือนในแอป
        </h3>
        <div className="space-y-0.5">
          <ToggleRow
            label="คำสั่งซื้อและการชำระเงิน"
            description="แจ้งเตือนเมื่อมีการซื้อ ขาย หรือชำระเงิน"
            checked={state.notifyOrders}
            onChange={() => toggle("notifyOrders")}
          />
          <ToggleRow
            label="ข้อความจากผู้ซื้อ/ผู้ขาย"
            description="แจ้งเตือนเมื่อได้รับข้อความใหม่"
            checked={state.notifyMessages}
            onChange={() => toggle("notifyMessages")}
          />
          <ToggleRow
            label="การอัปเดตสินค้า (ลดราคา ฯลฯ)"
            description="แจ้งเตือนเมื่อสินค้าที่สนใจมีการเปลี่ยนแปลง"
            checked={state.notifyItemUpdates}
            onChange={() => toggle("notifyItemUpdates")}
          />
          <ToggleRow
            label="ข่าวสารและโปรโมชั่น"
            description="รับข่าวสาร กิจกรรม และส่วนลดพิเศษ"
            checked={state.notifyPromotions}
            onChange={() => toggle("notifyPromotions")}
          />
        </div>
      </div>

      {/* Email notifications */}
      <div className="border-t border-[#e5e3de] pt-5">
        <h3 className="text-sm font-semibold text-[#555] mb-3">
          การแจ้งเตือนทางอีเมล
        </h3>
        <div className="space-y-0.5">
          <ToggleRow
            label="สรุปรายสัปดาห์"
            description="ส่งสรุปยอดขาย สินค้าใหม่ และกิจกรรมทุกสัปดาห์"
            checked={state.emailWeeklySummary}
            onChange={() => toggle("emailWeeklySummary")}
          />
          <ToggleRow
            label="สินค้าที่คุณอาจสนใจ"
            description="แนะนำสินค้าจากพฤติกรรมการใช้งานของคุณ"
            checked={state.emailRecommendations}
            onChange={() => toggle("emailRecommendations")}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 bg-[#e8500a] hover:bg-[#c94208] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
        >
          {pending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[#faf9f7] transition">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-medium text-[#333]">{label}</p>
        {description && (
          <p className="text-[11px] text-[#9a9590] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 ${
          checked ? "bg-[#e8500a]" : "bg-[#ddd]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
