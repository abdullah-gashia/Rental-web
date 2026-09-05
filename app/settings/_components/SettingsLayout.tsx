"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import ProfileTab       from "./ProfileTab";
import AddressesTab     from "./AddressesTab";
import NotificationsTab from "./NotificationsTab";
import SecurityTab      from "./SecurityTab";
import DisplayTab       from "./DisplayTab";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: "profile",       label: "ข้อมูลส่วนตัว",       icon: "👤" },
  { key: "addresses",     label: "ที่อยู่จัดส่ง",       icon: "📍" },
  { key: "notifications", label: "การแจ้งเตือน",       icon: "🔔" },
  { key: "security",      label: "บัญชีและความปลอดภัย", icon: "🔒" },
  { key: "display",       label: "การแสดงผล",          icon: "🎨" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsLayoutProps {
  userData: any;
  activeTab: string;
}

export default function SettingsLayout({ userData, activeTab }: SettingsLayoutProps) {
  const router     = useRouter();
  const tab        = TABS.some((t) => t.key === activeTab) ? (activeTab as TabKey) : "profile";

  // Toast state
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const showToast = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const setTab = (key: TabKey) => {
    router.push(`/settings?tab=${key}`, { scroll: false });
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[600] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all animate-fade-up ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Desktop side nav ─────────────────────────────────────────── */}
        <nav className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-20 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition ${
                  tab === t.key
                    ? "bg-white text-[#0f1e35] shadow-sm border border-[#dfe7f2]"
                    : "text-[#5b6b82] hover:text-[#1e2d47] hover:bg-white/60"
                }`}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Mobile horizontal tabs ──────────────────────────────────── */}
        <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-2 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  tab === t.key
                    ? "bg-[#0f1e35] text-white shadow"
                    : "bg-white text-[#3d4d66] border border-[#dfe7f2] hover:bg-[#f1f5fb]"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-[#dfe7f2] shadow-sm overflow-hidden">
            {tab === "profile"       && <ProfileTab       userData={userData} showToast={showToast} />}
            {tab === "addresses"     && <AddressesTab     addresses={userData.savedAddresses} showToast={showToast} />}
            {tab === "notifications" && <NotificationsTab preferences={userData.preferences} showToast={showToast} />}
            {tab === "security"      && <SecurityTab      userData={userData} showToast={showToast} />}
            {tab === "display"       && <DisplayTab       preferences={userData.preferences} showToast={showToast} />}
          </div>
        </main>
      </div>
    </>
  );
}
