import { auth, signOut } from "@/lib/auth";

export const metadata = { title: "บัญชีถูกระงับ | PSU Store" };

export default async function BannedPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#f7f9fd] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl">🚫</div>

        <div>
          <h1 className="text-2xl font-bold text-[#0f1e35]">บัญชีถูกระงับการใช้งาน</h1>
          <p className="text-[#3d4d66] mt-2 leading-relaxed">
            บัญชีของคุณถูกระงับเนื่องจากละเมิดกฎของแพลตฟอร์ม
            <br />หากคุณคิดว่าเกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>

        {session?.user && (
          <div className="bg-[#eaf0f8] rounded-2xl px-5 py-4 text-sm text-[#3d4d66]">
            <p>บัญชี: <span className="font-semibold text-[#0f1e35]">{session.user.email}</span></p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="mailto:admin@psu.ac.th"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] transition"
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
              className="w-full px-4 py-3 border border-[#dfe7f2] text-[#3d4d66] rounded-xl font-semibold hover:bg-[#eaf0f8] transition"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>

        <p className="text-xs text-[#64748b]">
          LINE OA: @psustore_support
        </p>
      </div>
    </div>
  );
}
