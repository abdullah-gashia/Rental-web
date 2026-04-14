import { auth, signOut } from "@/lib/auth";

export const metadata = { title: "บัญชีถูกระงับ | PSU Store" };

export default async function BannedPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl">🚫</div>

        <div>
          <h1 className="text-2xl font-bold text-[#111]">บัญชีถูกระงับการใช้งาน</h1>
          <p className="text-[#555] mt-2 leading-relaxed">
            บัญชีของคุณถูกระงับเนื่องจากละเมิดกฎของแพลตฟอร์ม
            <br />หากคุณคิดว่าเกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>

        {session?.user && (
          <div className="bg-[#f0ede7] rounded-2xl px-5 py-4 text-sm text-[#555]">
            <p>บัญชี: <span className="font-semibold text-[#111]">{session.user.email}</span></p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="mailto:admin@psu.ac.th"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#e8500a] text-white rounded-xl font-semibold hover:bg-[#c94208] transition"
          >
            📧 ติดต่อผู้ดูแลระบบ
          </a>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full px-4 py-3 border border-[#e5e3de] text-[#555] rounded-xl font-semibold hover:bg-[#f0ede7] transition"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>

        <p className="text-xs text-[#9a9590]">
          LINE OA: @psustore_support
        </p>
      </div>
    </div>
  );
}
