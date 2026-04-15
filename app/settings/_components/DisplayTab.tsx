"use client";

import { useState, useTransition } from "react";
import { updatePreferences } from "../actions";

interface Props {
  preferences: {
    language: string;
    theme: string;
  } | null;
  showToast: (ok: boolean, msg: string) => void;
}

export default function DisplayTab({ preferences, showToast }: Props) {
  const [language, setLanguage] = useState(preferences?.language ?? "th");
  const [theme, setTheme]      = useState(preferences?.theme ?? "system");
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePreferences({ language: language as "th" | "en", theme: theme as "light" | "dark" | "system" });
      showToast(res.success, res.success ? res.message : res.error);
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[#111] flex items-center gap-2">
        <span>🎨</span> การแสดงผล
      </h2>

      {/* Language */}
      <div>
        <h3 className="text-sm font-semibold text-[#555] mb-3">ภาษา</h3>
        <div className="space-y-2">
          <RadioOption
            id="lang-th"
            name="language"
            checked={language === "th"}
            onChange={() => setLanguage("th")}
            label="🇹🇭 ไทย"
            description="ใช้ภาษาไทยทั้งระบบ"
          />
          <RadioOption
            id="lang-en"
            name="language"
            checked={language === "en"}
            onChange={() => setLanguage("en")}
            label="🇬🇧 English"
            description="Use English throughout the system"
          />
        </div>
      </div>

      {/* Theme */}
      <div className="border-t border-[#e5e3de] pt-5">
        <h3 className="text-sm font-semibold text-[#555] mb-3">ธีม</h3>
        <div className="space-y-2">
          <RadioOption
            id="theme-light"
            name="theme"
            checked={theme === "light"}
            onChange={() => setTheme("light")}
            label="☀️ สว่าง"
            description="ใช้ธีมสว่างตลอด"
          />
          <RadioOption
            id="theme-dark"
            name="theme"
            checked={theme === "dark"}
            onChange={() => setTheme("dark")}
            label="🌙 มืด"
            description="ใช้ธีมมืดตลอด"
          />
          <RadioOption
            id="theme-system"
            name="theme"
            checked={theme === "system"}
            onChange={() => setTheme("system")}
            label="💻 ตามระบบ"
            description="ปรับตามการตั้งค่าของอุปกรณ์อัตโนมัติ"
          />
        </div>
      </div>

      <p className="text-[11px] text-[#9a9590] flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        การเปลี่ยนธีมและภาษาจะมีผลในครั้งถัดไปที่โหลดหน้าเว็บ
      </p>

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

// ─── Radio option ─────────────────────────────────────────────────────────────

function RadioOption({
  id, name, checked, onChange, label, description,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
        checked
          ? "border-[#e8500a]/40 bg-orange-50/40"
          : "border-transparent hover:bg-[#faf9f7]"
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-[#e8500a] accent-[#e8500a]"
      />
      <div>
        <p className="text-sm font-medium text-[#333]">{label}</p>
        <p className="text-[11px] text-[#9a9590]">{description}</p>
      </div>
    </label>
  );
}
