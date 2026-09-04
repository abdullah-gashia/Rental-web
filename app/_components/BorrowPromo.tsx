"use client";

import { BORROW_CATEGORY_LABEL } from "@/lib/borrow-config";

export interface BorrowPromoItem {
  id: string;
  title: string;
  category: string;
  image: string | null;
}

interface Props {
  items: BorrowPromoItem[];
  raised: number;
  itemsTotal: number;
  timesLent: number;
}

/**
 * The homepage's way in to the lending service.
 *
 * It leads with where the equipment came from rather than with the equipment,
 * because that is the part people do not expect: the fee they paid on their
 * own purchase is what put these things on the shelf.
 *
 * Renders nothing when the shelf is empty — an aisle with no stock is worse
 * than no aisle.
 */
export default function BorrowPromo({ items, raised, itemsTotal, timesLent }: Props) {
  if (itemsTotal === 0) return null;

  return (
    <section className="bw-scope mb-6">
      <div className="rounded-[14px] border border-[var(--psu-sky-200)] bg-[linear-gradient(180deg,#f5f9ff,#ffffff_55%)] overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--psu-blue)]">
              งานภัทร
            </p>
            <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-[var(--psu-navy)] mt-1.5">
              ยืมอุปกรณ์ฟรี ไม่ต้องมัดจำ
            </h2>
            <p className="text-[13px] text-[var(--hp-muted)] mt-1.5 max-w-[54ch] leading-[1.85]">
              ค่าธรรมเนียม{" "}
              <strong className="text-[var(--hp-ink)] hp-num">
                ฿{raised.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
              </strong>{" "}
              ที่เก็บได้จากการซื้อขายในเว็บนี้ กลายเป็นอุปกรณ์ให้ยืมแล้ว{" "}
              <strong className="text-[var(--hp-ink)] hp-num">{itemsTotal}</strong> ชิ้น
              {timesLent > 0 && (
                <> · ให้ยืมไปแล้ว <strong className="text-[var(--hp-ink)] hp-num">{timesLent}</strong> ครั้ง</>
              )}
            </p>
          </div>

          <a href="/borrow" className="bw-btn bw-btn-primary flex-shrink-0">
            ดูของที่ยืมได้
          </a>
        </div>

        {items.length > 0 && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {items.map((i) => (
                <a
                  key={i.id}
                  href={`/borrow/${i.id}`}
                  className="group rounded-xl border border-[var(--hp-border)] bg-white overflow-hidden hover:border-[var(--psu-blue)] transition-colors"
                >
                  <div className="bw-thumb aspect-square !rounded-none !border-0 !border-b border-[var(--hp-border)]">
                    {i.image
                      ? <img src={i.image} alt={i.title} loading="lazy" />
                      : <span className="text-2xl opacity-30">📦</span>}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[12px] font-medium leading-snug line-clamp-2 text-[var(--hp-ink)] group-hover:text-[var(--psu-indigo)]">
                      {i.title}
                    </p>
                    <p className="text-[10.5px] text-[var(--hp-muted)] mt-1">
                      {BORROW_CATEGORY_LABEL[i.category] ?? i.category}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
