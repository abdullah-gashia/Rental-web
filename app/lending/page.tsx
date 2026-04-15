import Link from "next/link";
import { auth } from "@/lib/auth";
import { browseLendingItems } from "@/lib/actions/lending-items";
import LendingBrowseClient from "./_components/LendingBrowseClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "ระบบปล่อยเช่า | PSU Store" };

export default async function LendingPage() {
  const [session, items] = await Promise.all([
    auth(),
    browseLendingItems(),
  ]);

  const user = session?.user as any;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e3de]">
        <div className="max-w-7xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/" className="text-sm text-[#999] hover:text-[#555] transition">
                  PSU Store
                </Link>
                <span className="text-[#ccc]">/</span>
                <span className="text-sm font-semibold text-[#111]">ระบบปล่อยเช่า</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111]">
                🔑 ระบบปล่อยเช่าเพื่อนนักศึกษา
              </h1>
              <p className="text-sm text-[#777] mt-1">
                ยืม-ให้ยืมสิ่งของระหว่างนักศึกษา PSU อย่างปลอดภัย มีมัดจำค้ำประกัน
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <>
                  <Link
                    href="/dashboard/lending"
                    className="px-4 py-2 border border-[#e5e3de] text-sm font-medium text-[#555] rounded-xl
                               hover:bg-[#f0ede7] transition"
                  >
                    📋 การยืมของฉัน
                  </Link>
                  <Link
                    href="/lending/post"
                    className="px-4 py-2 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                               hover:bg-[#c94208] transition"
                  >
                    + ลงรายการให้ยืม
                  </Link>
                </>
              )}
              {!user && (
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                             hover:bg-[#c94208] transition"
                >
                  เข้าสู่ระบบเพื่อยืม
                </Link>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5 mt-4 text-xs text-[#777]">
            <span>🔒 มัดจำค้ำประกันทุกรายการ</span>
            <span>🤝 Digital Handshake ถ่ายรูปหลักฐาน</span>
            <span>⏰ แจ้งเตือนอัตโนมัติก่อนครบกำหนด</span>
            <span>✅ ยืนยัน KYC ทุกคน</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6">
        <LendingBrowseClient initialItems={items} />
      </div>
    </div>
  );
}
