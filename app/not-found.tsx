import { getTr } from "@/lib/i18n/server";
import Link from "next/link";

export const metadata = { title: "ไม่พบหน้านี้ | PSU Store" };

/**
 * The 404.
 *
 * There wasn't one, so a dead link dropped people onto Next's default black
 * page — which reads as a broken site rather than a wrong address. This says
 * what happened and offers the three places someone in this situation is
 * actually trying to reach.
 */
export default async function NotFound() {
  const tr = await getTr();
  const links = [
    { href: "/",          label: tr("หน้าร้าน"),       hint: tr("เลือกดูสินค้าทั้งหมด") },
    { href: "/borrow",    label: tr("ยืมของฟรี"),      hint: tr("อุปกรณ์จากงานภัทร") },
    { href: "/dashboard", label: tr("บัญชีของฉัน"),    hint: tr("คำสั่งซื้อและประกาศ") },
  ];

  return (
    <main className="ui-shell flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-[520px] text-center">
        <p className="ui-num text-[64px] font-semibold leading-none tracking-[-0.04em] text-[var(--psu-sky-200)]">
          404
        </p>

        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] mt-3">{tr("ไม่พบหน้าที่คุณกำลังหา")}</h1>
        <p className="text-[14px] text-[var(--hp-muted)] mt-2.5 leading-[1.9]">{tr("ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว ถ้าคุณมาจากลิงก์ในเว็บนี้ ช่วยแจ้งทีมงานได้ที่หน้าช่วยเหลือ")}</p>

        <div className="mt-7 grid gap-2.5 text-left">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="ui-card flex items-center gap-3 px-4 py-3.5 hover:border-[var(--psu-blue)] transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--hp-ink)] group-hover:text-[var(--psu-indigo)]">
                  {l.label}
                </p>
                <p className="text-[12px] text-[var(--hp-muted)] mt-0.5">{l.hint}</p>
              </div>
              <span className="text-[var(--psu-blue)] text-[15px]" aria-hidden>→</span>
            </Link>
          ))}
        </div>

        <Link href="/support" className="ui-btn ui-btn-quiet mt-5 !text-[13px]">{tr("ติดต่อทีมงาน")}</Link>
      </div>
    </main>
  );
}
