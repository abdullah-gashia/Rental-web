import { getTr } from "@/lib/i18n/server";
import { auth, signOut } from "@/lib/auth";

export const metadata = { title: "บัญชีถูกระงับ | PSU Store" };

export default async function BannedPage() {
  const tr = await getTr();
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--c-subtle)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl">🚫</div>

        <div>
          <h1 className="text-2xl font-bold text-[var(--c-ink)]">{tr("บัญชีถูกระงับการใช้งาน")}</h1>
          <p className="text-[var(--c-ink-2)] mt-2 leading-relaxed">{tr("บัญชีของคุณถูกระงับเนื่องจากละเมิดกฎของแพลตฟอร์ม")}<br />{tr("หากคุณคิดว่าเกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ")}</p>
        </div>

        {session?.user && (
          <div className="bg-[var(--c-line-soft)] rounded-2xl px-5 py-4 text-sm text-[var(--c-ink-2)]">
            <p>{tr("บัญชี:")}<span className="font-semibold text-[var(--c-ink)]">{session.user.email}</span></p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="mailto:admin@psu.ac.th"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--c-accent)] text-white rounded-xl font-semibold hover:bg-[var(--c-accent-str)] transition"
          >{tr("📧 ติดต่อผู้ดูแลระบบ")}</a>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full px-4 py-3 border border-[var(--c-line)] text-[var(--c-ink-2)] rounded-xl font-semibold hover:bg-[var(--c-line-soft)] transition"
            >{tr("ออกจากระบบ")}</button>
          </form>
        </div>

        <p className="text-xs text-[var(--c-muted)]">
          LINE OA: @psustore_support
        </p>
      </div>
    </div>
  );
}
