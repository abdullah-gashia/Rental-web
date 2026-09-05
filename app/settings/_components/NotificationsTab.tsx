"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

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
    emailNotifications:   boolean;
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
  emailNotifications:   true,
};

export default function NotificationsTab({ preferences, showToast }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const prefs = preferences ?? DEFAULTS;
  const [state, setState] = useState(prefs);
  const [pending, startTransition] = useTransition();

  const toggle = (key: keyof typeof state) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePreferences(state);
      showToast(res.success, res.success ? tr(res.message) : tr(res.error));
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[var(--c-ink)] flex items-center gap-2">
        <span>🔔</span>{tr("การแจ้งเตือน")}</h2>

      {/* In-app notifications */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-3">{tr("การแจ้งเตือนในแอป")}</h3>
        <div className="space-y-0.5">
          <ToggleRow
            label={tr("คำสั่งซื้อและการชำระเงิน")}
            description={tr("แจ้งเตือนเมื่อมีการซื้อ ขาย หรือชำระเงิน")}
            checked={state.notifyOrders}
            onChange={() => toggle("notifyOrders")}
          />
          <ToggleRow
            label={tr("ข้อความจากผู้ซื้อ/ผู้ขาย")}
            description={tr("แจ้งเตือนเมื่อได้รับข้อความใหม่")}
            checked={state.notifyMessages}
            onChange={() => toggle("notifyMessages")}
          />
          <ToggleRow
            label={tr("การอัปเดตสินค้า (ลดราคา ฯลฯ)")}
            description={tr("แจ้งเตือนเมื่อสินค้าที่สนใจมีการเปลี่ยนแปลง")}
            checked={state.notifyItemUpdates}
            onChange={() => toggle("notifyItemUpdates")}
          />
          <ToggleRow
            label={tr("ข่าวสารและโปรโมชั่น")}
            description={tr("รับข่าวสาร กิจกรรม และส่วนลดพิเศษ")}
            checked={state.notifyPromotions}
            onChange={() => toggle("notifyPromotions")}
          />
        </div>
      </div>

      {/* Email notifications */}
      <div className="border-t border-[var(--c-line)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-3">{tr("การแจ้งเตือนทางอีเมล")}</h3>
        <div className="space-y-0.5">
          <ToggleRow
            label={tr("ส่งการแจ้งเตือนทั้งหมดเข้าอีเมล")}
            description={tr("ทุกครั้งที่มีแจ้งเตือนในแอป จะส่งสำเนาไปที่อีเมลของคุณด้วย")}
            checked={state.emailNotifications}
            onChange={() => toggle("emailNotifications")}
          />
          <ToggleRow
            label={tr("สรุปรายสัปดาห์")}
            description={tr("ส่งสรุปยอดขาย สินค้าใหม่ และกิจกรรมทุกสัปดาห์")}
            checked={state.emailWeeklySummary}
            onChange={() => toggle("emailWeeklySummary")}
          />
          <ToggleRow
            label={tr("สินค้าที่คุณอาจสนใจ")}
            description={tr("แนะนำสินค้าจากพฤติกรรมการใช้งานของคุณ")}
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
          className="px-6 py-2.5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-str)] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
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
    <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--c-subtle)] transition">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-medium text-[var(--c-ink-1)]">{label}</p>
        {description && (
          <p className="text-[11px] text-[var(--c-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 ${
          checked ? "bg-[var(--c-accent)]" : "bg-[#ddd]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--c-surface)] shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
