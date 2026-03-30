"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

export default function Footer() {
  const t = useLocaleStore((s) => s.t);

  return (
    <footer className="border-t border-[#e5e3de] mt-8">
      <div className="max-w-7xl mx-auto px-5 py-8 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <span className="text-lg font-extrabold tracking-tighter">
            PSU<span style={{ color: "var(--accent)" }}>.</span>STORE
          </span>
          <p className="text-sm text-[#9a9590] mt-1.5 max-w-xs">{t("footer_tagline")}</p>
        </div>
        <div className="flex gap-10 text-sm text-[#9a9590]">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-[#111] text-xs tracking-wider uppercase">Platform</span>
            <a href="#" className="hover:text-[#111] transition">{t("nav_about")}</a>
            <a href="#" className="hover:text-[#111] transition">{t("nav_post")}</a>
            <a href="#" className="hover:text-[#111] transition">{t("nav_support")}</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-[#111] text-xs tracking-wider uppercase">Legal</span>
            <a href="#" className="hover:text-[#111] transition">Terms of Service</a>
            <a href="#" className="hover:text-[#111] transition">Privacy Policy</a>
          </div>
        </div>
      </div>
      <div className="border-t border-[#e5e3de] py-4 px-5 max-w-7xl mx-auto text-xs text-[#b0ada6]">
        {t("footer")}
      </div>
    </footer>
  );
}
