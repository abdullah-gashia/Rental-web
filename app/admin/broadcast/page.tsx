import { auth }            from "@/lib/auth";
import { redirect }        from "next/navigation";
import { isMailConfigured } from "@/lib/email";
import { getAudienceCounts } from "./actions";
import BroadcastForm       from "./BroadcastForm";

export const dynamic  = "force-dynamic";
export const metadata = { title: "ส่งอีเมลถึงทุกคน | Admin" };

export default async function AdminBroadcastPage() {
  const session = await auth();
  const user = session?.user as { role?: string; email?: string | null } | undefined;
  if (!user || user.role !== "ADMIN") redirect("/");

  const counts = await getAudienceCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0f1e35] flex items-center gap-2">
          📣 ส่งอีเมลถึงทุกคน
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          ประกาศจากทีมงานถึงผู้ใช้ในระบบ — ตรวจดูจำนวนผู้รับก่อนกดส่งเสมอ
        </p>
      </div>

      <BroadcastForm
        counts={counts}
        adminEmail={user.email ?? "อีเมลของคุณ"}
        mailReady={isMailConfigured}
      />
    </div>
  );
}
