"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import type { TrendCard } from "@/lib/types";

const trendCards: TrendCard[] = [
  { bg: "#fff8f5", border: "1px solid #fde5d4", dark: false, icon: "🔥", subTh: "142 รายการ", subEn: "142 listings", labelTh: "เทรนด์ฮิต<br>ตอนนี้", labelEn: "Current<br>Trends" },
  { grad: "linear-gradient(to bottom,#2a7bcf,#12426e)", dark: true, icon: "💻", subTh: "Electronics", subEn: "Electronics", labelTh: "อิเล็กทรอนิกส์<br>รีเฟอร์บิช", labelEn: "Refurbished<br>Electronics" },
  { grad: "linear-gradient(to bottom,#7e858a,#3a3e42)", dark: true, icon: "🚲", subTh: "Vehicles", subEn: "Vehicles", labelTh: "จักรยาน", labelEn: "Bicycles" },
  { grad: "linear-gradient(to bottom,#5c6945,#263116)", dark: true, icon: "🌿", subTh: "Crafts & DIY", subEn: "Crafts & DIY", labelTh: "งานฝีมือ & DIY", labelEn: "Crafts & DIY" },
  { grad: "linear-gradient(to bottom,#344654,#111920)", dark: true, icon: "🏕️", subTh: "Rentals", subEn: "Rentals", labelTh: "ที่พักตากอากาศ<br>สุดแปลก", labelEn: "Unique<br>Getaways" },
  { grad: "linear-gradient(to bottom,#7c3aed,#3b0764)", dark: true, icon: "🎲", subTh: "Boardgames", subEn: "Boardgames", labelTh: "บอร์ดเกม<br>ใหม่มาแรง", labelEn: "Hot New<br>Boardgames" },
  { grad: "linear-gradient(to bottom,#b45309,#451a03)", dark: true, icon: "📚", subTh: "Books", subEn: "Books", labelTh: "หนังสือ<br>ราคาถูก", labelEn: "Budget Books" },
  { grad: "linear-gradient(to bottom,#0f766e,#042f2e)", dark: true, icon: "🎸", subTh: "Music & Gear", subEn: "Music & Gear", labelTh: "ดนตรี & อุปกรณ์", labelEn: "Music & Gear" },
];

export default function TrendingCarousel() {
  const { t, locale } = useLocaleStore();

  const renderCard = (card: TrendCard, i: number) => {
    const bg = card.grad ? { background: card.grad } : { background: card.bg, border: card.border };
    const textColor = card.dark ? "#fff" : "#111";
    const subColor = card.dark ? "rgba(255,255,255,0.6)" : "#9a9590";
    const label = locale === "en" ? card.labelEn : card.labelTh;
    const sub = locale === "en" ? card.subEn : card.subTh;

    return (
      <div key={i} className="trend-card" style={bg}>
        <span className="text-[28px]">{card.icon}</span>
        <div>
          <p className="text-[11px] mb-1" style={{ color: subColor }}>{sub}</p>
          <h3
            className="text-[13px] font-bold leading-tight"
            style={{ color: textColor }}
            dangerouslySetInnerHTML={{ __html: label }}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">{t("trending_title")}</h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#e8500a]">
          <span className="w-2 h-2 bg-[#e8500a] rounded-full animate-pulse" />
          Live
        </span>
      </div>
      <div className="trend-viewport">
        <div className="trend-track">
          {trendCards.map((c, i) => renderCard(c, i))}
          {trendCards.map((c, i) => renderCard(c, i + trendCards.length))}
        </div>
      </div>
    </section>
  );
}
