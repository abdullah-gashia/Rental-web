"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import Brand from "@/components/layout/Brand";

export default function Footer() {
  const tr = useLocaleStore((s) => s.tr);
  const t = useLocaleStore((s) => s.t);

  const columns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
      heading: tr("แพลตฟอร์ม"),
      links: [
        { label: t("nav_about"),   href: "#" },
        { label: t("nav_post"),    href: "#" },
        { label: t("nav_support"), href: "/support" },
      ],
    },
    {
      heading: tr("ข้อกำหนด"),
      links: [
        { label: tr("เงื่อนไขการใช้งาน"), href: "#" },
        { label: tr("นโยบายความเป็นส่วนตัว"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--hp-border)] mt-16">
      <div className="max-w-[1240px] mx-auto px-5 py-10 flex flex-col md:flex-row justify-between gap-10">
        <div className="max-w-xs">
          <Brand size={30} href={null} />
          <p className="text-[13px] text-[var(--hp-muted)] mt-3 leading-relaxed">
            {t("footer_tagline")}
          </p>
        </div>

        <div className="flex gap-14">
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-2.5">
              <span className="hp-eyebrow">{col.heading}</span>
              {col.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-[13px] text-[var(--hp-ink-2)] hover:text-[var(--psu-indigo)] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--hp-border)]">
        <div className="max-w-[1240px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <span className="text-[12px] text-[var(--hp-muted)]">{t("footer")}</span>
          <span className="hp-eyebrow hidden sm:block">
            Prince of Songkla University
          </span>
        </div>
      </div>
    </footer>
  );
}
