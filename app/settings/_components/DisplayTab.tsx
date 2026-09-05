"use client";

import { useState, useTransition } from "react";
import { updatePreferences } from "../actions";
import { useTr, useLocale } from "@/lib/i18n/LocaleProvider";
import { useThemeStore } from "@/lib/stores/theme-store";

interface Props {
  preferences: {
    language: string;
    theme: string;
  } | null;
  showToast: (ok: boolean, msg: string) => void;
}

export default function DisplayTab({ preferences, showToast }: Props) {
  const tr = useTr();
  // The locale the page was rendered with — the store's copy is a cookie
  // read from module load and can be behind.
  const current      = useLocale();
  const applyTheme   = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.theme);

  const [language, setLanguage] = useState(preferences?.language ?? "th");
  const [theme, setTheme]       = useState(preferences?.theme ?? currentTheme ?? "system");
  const [pending, startTransition] = useTransition();

  /** Preview the theme as soon as it is picked — waiting for Save to see what
      you chose is a poor way to choose. Language cannot preview the same way:
      server-rendered pages have to come back from the server first. */
  function pickTheme(next: "light" | "dark" | "system") {
    setTheme(next);
    applyTheme(next);
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await updatePreferences({
        language: language as "th" | "en",
        theme:    theme as "light" | "dark" | "system",
      });
      showToast(res.success, res.success ? tr(res.message) : tr(res.error));

      if (res.success) {
        applyTheme(theme as "light" | "dark" | "system");
        // The action already wrote the language cookie, so the page only has
        // to come back from the server to be rendered in it. Reloading here
        // rather than through setLocale, which would see the cookie it is
        // about to write already in place and decide there was nothing to do.
        if (language !== current) window.location.reload();
      }
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[var(--c-ink)] flex items-center gap-2">
        <span>🎨</span>{tr("การแสดงผล")}</h2>

      {/* Language */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-3">{tr("ภาษา")}</h3>
        <div className="space-y-2">
          <RadioOption
            id="lang-th"
            name="language"
            checked={language === "th"}
            onChange={() => setLanguage("th")}
            label={tr("🇹🇭 ไทย")}
            description={tr("ใช้ภาษาไทยทั้งระบบ")}
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
      <div className="border-t border-[var(--c-line)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-3">{tr("ธีม")}</h3>
        <div className="space-y-2">
          <RadioOption
            id="theme-light"
            name="theme"
            checked={theme === "light"}
            onChange={() => pickTheme("light")}
            label={tr("☀️ สว่าง")}
            description={tr("ใช้ธีมสว่างตลอด")}
          />
          <RadioOption
            id="theme-dark"
            name="theme"
            checked={theme === "dark"}
            onChange={() => pickTheme("dark")}
            label={tr("🌙 มืด")}
            description={tr("ใช้ธีมมืดตลอด")}
          />
          <RadioOption
            id="theme-system"
            name="theme"
            checked={theme === "system"}
            onChange={() => pickTheme("system")}
            label={tr("💻 ตามระบบ")}
            description={tr("ปรับตามการตั้งค่าของอุปกรณ์อัตโนมัติ")}
          />
        </div>
      </div>

      <p className="text-[11px] text-[var(--c-muted)] flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>{tr("ธีมเปลี่ยนทันทีที่เลือก ส่วนภาษาจะมีผลหลังกดบันทึกและโหลดหน้าใหม่")}</p>

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
          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)]"
          : "border-transparent hover:bg-[var(--c-subtle)]"
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-[var(--c-accent)] accent-[var(--c-accent)]"
      />
      <div>
        <p className="text-sm font-medium text-[var(--c-ink-1)]">{label}</p>
        <p className="text-[11px] text-[var(--c-muted)]">{description}</p>
      </div>
    </label>
  );
}
