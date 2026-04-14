// Server Component — no "use client" needed; purely static content
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ศูนย์ช่วยเหลือ | PSU.STORE",
  description: "คำถามที่พบบ่อยและข้อมูลติดต่อสำหรับแพลตฟอร์ม PSU.STORE",
};

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQS: { q: string; a: string; icon: string }[] = [
  {
    q: "ระบบชำระเงิน Escrow ทำงานอย่างไร?",
    a: "ระบบจะเก็บเงินของคุณไว้เป็นตัวกลางอย่างปลอดภัย เงินจะถูกโอนให้ผู้ขายก็ต่อเมื่อคุณกดยืนยันว่า «ได้รับสินค้าและตรวจสอบความเรียบร้อยแล้ว» เท่านั้น หากเกิดปัญหาใดๆ ก่อนกดยืนยัน คุณสามารถเปิดข้อพิพาทเพื่อให้ผู้ดูแลระบบเข้ามาตรวจสอบและคุ้มครองเงินของคุณ",
    icon: "🔒",
  },
  {
    q: "การนัดรับสินค้า (Meetup) ต้องทำอย่างไร?",
    a: "เมื่อตกลงนัดรับ ผู้ขายจะต้องนำสินค้าไปส่งมอบตามจุดที่กำหนด และใช้มือถือกดปุ่ม «ยืนยันการส่งมอบ» เพื่อให้ผู้ซื้อเซ็นรับบนหน้าจอ จากนั้นระบบ Escrow จะปล่อยเงินให้ผู้ขายโดยอัตโนมัติ ทั้งลายเซ็นและภาพถ่ายหลักฐานจะถูกบันทึกไว้ในใบเสร็จเพื่อความปลอดภัยของทั้งสองฝ่าย",
    icon: "🤝",
  },
  {
    q: "มีค่าธรรมเนียมการขายหรือไม่?",
    a: "แพลตฟอร์มมีการหักค่าธรรมเนียม 5% จากราคาสินค้า (ไม่รวมค่าจัดส่ง) เมื่อการขายเสร็จสมบูรณ์ ค่าธรรมเนียมนี้ครอบคลุมต้นทุนระบบ Escrow และการดูแลความปลอดภัยของธุรกรรมทุกรายการบนแพลตฟอร์ม",
    icon: "💰",
  },
  {
    q: "หากสินค้ามีปัญหาหรือไม่ได้รับสินค้า ต้องทำอย่างไร?",
    a: "คุณสามารถกดปุ่ม «รายงานปัญหา/ข้อพิพาท» ในหน้ารายละเอียดคำสั่งซื้อ เพื่อระงับการโอนเงินชั่วคราว และให้ผู้ดูแลระบบ (Admin) เข้ามาตรวจสอบ ทีมงานจะพิจารณาหลักฐานจากทั้งสองฝ่ายและตัดสินใจภายใน 3–5 วันทำการ",
    icon: "⚠️",
  },
  {
    q: "ฉันจะเติมเงินเข้ากระเป๋าเงินได้อย่างไร?",
    a: "ไปที่หน้า «กระเป๋าเงิน» ในแดชบอร์ดของคุณ แล้วเลือก «เติมเงิน» ระบบรองรับการโอนผ่านธนาคาร และ QR Code PromptPay เมื่อยอดเงินเข้าระบบแล้ว คุณสามารถใช้ชำระสินค้าผ่าน Escrow ได้ทันที",
    icon: "💳",
  },
  {
    q: "ลงขายสินค้าต้องใช้เอกสารอะไรบ้าง?",
    a: "ไม่ต้องใช้เอกสารพิเศษ เพียงเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย กดปุ่ม «ลงขายสินค้า» และกรอกรายละเอียดสินค้า ราคา รูปภาพ รวมถึงเลือกวิธีส่งมอบและรับชำระเงินที่คุณต้องการ ทีมงานจะตรวจสอบและอนุมัติรายการภายใน 24 ชั่วโมง",
    icon: "🏷️",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8500a]/10 mb-2">
            <svg className="w-7 h-7 text-[#e8500a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">
            ศูนย์ช่วยเหลือ
            <span className="text-[#e8500a]"> Help &amp; Support</span>
          </h1>
          <p className="text-[#9a9590] text-base max-w-lg mx-auto leading-relaxed">
            มีอะไรให้เราช่วยเหลือหรือไม่? ค้นหาคำตอบจากคำถามที่พบบ่อย หรือติดต่อทีมงานได้โดยตรง
          </p>
        </div>

        {/* ── Escrow trust banner ───────────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex gap-4 items-start">
          <div className="text-2xl leading-none mt-0.5">🔒</div>
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">ระบบ Escrow คุ้มครองทุกธุรกรรม</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              PSU.STORE ใช้ระบบ Escrow เพื่อให้มั่นใจว่าทั้งผู้ซื้อและผู้ขายได้รับความเป็นธรรม
              เงินจะถูกเก็บไว้อย่างปลอดภัยจนกว่าการส่งมอบสินค้าจะสำเร็จ
            </p>
          </div>
        </div>

        {/* ── FAQ Section ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-extrabold text-[#111] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#e8500a] inline-block" />
            คำถามที่พบบ่อย (FAQ)
          </h2>

          <div className="space-y-2">
            {FAQS.map(({ q, a, icon }) => (
              <details
                key={q}
                className="group bg-white border border-[#e5e3de] rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none list-none hover:bg-[#f7f6f3] transition">
                  {/* Emoji icon */}
                  <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>

                  {/* Question text */}
                  <span className="flex-1 text-sm font-semibold text-[#111]">{q}</span>

                  {/* Chevron — rotates when open */}
                  <svg
                    className="w-4 h-4 text-[#9a9590] flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>

                {/* Answer */}
                <div className="px-5 pb-5 pt-1 border-t border-[#f0ede7]">
                  <p className="text-sm text-[#555] leading-relaxed pl-11">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Escrow How-It-Works visual ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-extrabold text-[#111] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#e8500a] inline-block" />
            ขั้นตอนระบบ Escrow
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: "1", icon: "🛒", label: "ผู้ซื้อสั่งซื้อ", sub: "เงินถูกล็อคไว้ใน Escrow" },
              { step: "2", icon: "📦", label: "ผู้ขายจัดส่ง", sub: "อัปโหลดหลักฐานการส่ง" },
              { step: "3", icon: "✅", label: "ผู้ซื้อยืนยัน", sub: "กดรับสินค้าหรือเซ็นชื่อ" },
              { step: "4", icon: "💸", label: "โอนเงินให้ผู้ขาย", sub: "Escrow ปลดล็อคเงินทันที" },
            ].map(({ step, icon, label, sub }) => (
              <div key={step} className="bg-white border border-[#e5e3de] rounded-2xl p-4 text-center space-y-2 relative">
                <div className="absolute -top-2.5 left-4 bg-[#e8500a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ขั้นตอนที่ {step}
                </div>
                <div className="text-3xl pt-2">{icon}</div>
                <p className="text-sm font-bold text-[#111]">{label}</p>
                <p className="text-xs text-[#9a9590]">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact Card ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-extrabold text-[#111] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#e8500a] inline-block" />
            ติดต่อเรา
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e5e3de] p-8 text-center space-y-5">
            <div>
              <p className="text-base font-bold text-[#111]">ยังต้องการความช่วยเหลือ?</p>
              <p className="text-sm text-[#9a9590] mt-1">
                ทีมดูแลระบบพร้อมช่วยเหลือคุณ จันทร์ – ศุกร์ เวลา 9:00 – 17:00 น.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Email */}
              <a
                href="mailto:admin@psu.ac.th"
                className="flex items-center gap-3 px-5 py-3.5 bg-[#f7f6f3] hover:bg-[#f0ede7] border border-[#e5e3de] rounded-2xl transition group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-[#9a9590] uppercase tracking-wider font-semibold">Email</p>
                  <p className="text-sm font-bold text-[#111] group-hover:text-blue-600 transition">admin@psu.ac.th</p>
                </div>
              </a>

              {/* LINE OA */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-[#f7f6f3] border border-[#e5e3de] rounded-2xl">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  {/* LINE icon — simple chat bubble */}
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-[#9a9590] uppercase tracking-wider font-semibold">LINE OA</p>
                  <p className="text-sm font-bold text-[#111]">@psustore_support</p>
                </div>
              </div>
            </div>

            {/* Response time note */}
            <p className="text-xs text-[#9a9590]">
              ⏱ เวลาตอบกลับเฉลี่ย: ภายใน 1 วันทำการ
            </p>
          </div>
        </section>

        {/* ── Back link ───────────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#9a9590] hover:text-[#111] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับหน้าหลัก
          </a>
        </div>

      </div>
    </div>
  );
}
