import { getTr } from "@/lib/i18n/server";
import { auth }            from "@/lib/auth";
import { redirect }        from "next/navigation";
import { isMailConfigured } from "@/lib/email";
import { getAudienceCounts } from "./actions";
import BroadcastForm       from "./BroadcastForm";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ส่งอีเมลถึงทุกคน | Admin"),};
}

export default async function AdminBroadcastPage() {
  const tr = await getTr();
  const session = await auth();
  const user = session?.user as { role?: string; email?: string | null } | undefined;
  if (!user || user.role !== "ADMIN") redirect("/");

  const counts = await getAudienceCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">{tr("📣 ส่งอีเมลถึงทุกคน")}</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">{tr("ประกาศจากทีมงานถึงผู้ใช้ในระบบ — ตรวจดูจำนวนผู้รับก่อนกดส่งเสมอ")}</p>
      </div>

      <BroadcastForm
        counts={counts}
        adminEmail={user.email ?? tr("อีเมลของคุณ")}
        mailReady={isMailConfigured}
      />
    </div>
  );
}
