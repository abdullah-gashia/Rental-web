import { getTr } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyVerificationStatus } from "./actions";
import VerifyWizard from "./_components/VerifyWizard";
import Link from "next/link";

export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ยืนยันตัวตน | PSU Store"),};
}

// ─── Status Display Components ────────────────────────────────────────────────

function PendingCard({ submittedAt }: { submittedAt: Date | string }) {
  const date = new Date(submittedAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12 px-4">
      <div className="text-6xl">⏳</div>
      <h1 className="text-2xl font-bold text-[var(--c-ink)]">รอการตรวจสอบ</h1>
      <p className="text-[var(--c-ink-2)]">
        คำขอของคุณอยู่ระหว่างการตรวจสอบโดยแอดมิน กรุณารอผลภายใน 24 ชั่วโมง
      </p>
      <div className="bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-2xl px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">ส่งคำขอเมื่อ</p>
        <p>{date}</p>
      </div>
      <p className="text-xs text-[var(--c-muted)]">
        คุณจะได้รับการแจ้งเตือนเมื่อผลการตรวจสอบออก
      </p>
      <Link
        href="/dashboard"
        className="inline-block px-6 py-2.5 bg-[var(--c-canvas)] rounded-xl text-sm font-semibold text-[var(--c-ink-1)] hover:bg-[#eee] transition"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}

function ApprovedCard({
  psuIdNumber,
  psuIdType,
  verifiedAt,
}: {
  psuIdNumber: string | null;
  psuIdType: string | null;
  verifiedAt: Date | string | null;
}) {
  const masked = psuIdNumber
    ? psuIdNumber.slice(0, 3) + "•".repeat(psuIdNumber.length - 3)
    : "—";

  const date = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString("th-TH", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12 px-4">
      <div className="text-6xl">✅</div>
      <h1 className="text-2xl font-bold text-[var(--c-ink)]">ยืนยันตัวตนแล้ว</h1>
      <p className="text-[var(--c-ink-2)]">บัญชีของคุณผ่านการยืนยันตัวตนเรียบร้อยแล้ว คุณสามารถลงขายสินค้าได้</p>

      <div className="bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-2xl px-5 py-4 text-sm text-emerald-800 space-y-2">
        <div className="flex justify-between">
          <span className="text-[var(--c-ok)]">ประเภท</span>
          <span className="font-semibold">{psuIdType === "STUDENT" ? "นักศึกษา" : "บุคลากร"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--c-ok)]">รหัสประจำตัว</span>
          <span className="font-semibold font-mono">{masked}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--c-ok)]">ยืนยันเมื่อ</span>
          <span className="font-semibold">{date}</span>
        </div>
      </div>

      <Link
        href="/dashboard/my-items"
        className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
      >
        ไปที่สินค้าของฉัน →
      </Link>
    </div>
  );
}

async function RejectedBanner({
  reason,
  submittedAt,
}: {
  reason: string | null;
  submittedAt: Date | string;
}) {
  const tr = await getTr();
  const date = new Date(submittedAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-lg mx-auto mb-6 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-2xl px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">❌</span>
        <div>
          <p className="font-semibold text-[var(--c-danger)]">คำขอถูกปฏิเสธ</p>
          {reason && (
            <p className="text-sm text-[var(--c-danger)] mt-1">{tr("เหตุผล: {0}", [reason])}</p>
          )}
          <p className="text-xs text-[var(--c-danger)] mt-1">{tr("ส่งคำขอเมื่อ {0} — คุณสามารถส่งคำขอใหม่ได้", [date])}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const tr = await getTr();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const data = await getMyVerificationStatus();

  const status = data?.user?.verificationStatus ?? "UNVERIFIED";

  // ── Submitted success state ──────────────────────────────────────────────
  if (sp.submitted === "1") {
    return (
      <main className="min-h-screen bg-[var(--c-subtle)] flex items-center justify-center">
        <PendingCard submittedAt={data?.latestRequest?.submittedAt ?? new Date()} />
      </main>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (status === "PENDING") {
    return (
      <main className="min-h-screen bg-[var(--c-subtle)] flex items-center justify-center">
        <PendingCard submittedAt={data?.latestRequest?.submittedAt ?? new Date()} />
      </main>
    );
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (status === "APPROVED") {
    return (
      <main className="min-h-screen bg-[var(--c-subtle)] flex items-center justify-center">
        <ApprovedCard
          psuIdNumber={data?.user?.psuIdNumber ?? null}
          psuIdType={data?.user?.psuIdType ?? null}
          verifiedAt={data?.user?.verifiedAt ?? null}
        />
      </main>
    );
  }

  // ── UNVERIFIED or REJECTED — show wizard ─────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--c-subtle)]">
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--c-ink)]">{tr("ยืนยันตัวตน PSU")}</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">{tr("กรุณายืนยันตัวตนก่อนลงขายสินค้า")}</p>
        </div>

        {/* Rejection banner */}
        {status === "REJECTED" && data?.latestRequest && (
          <RejectedBanner
            reason={data.latestRequest.rejectionReason}
            submittedAt={data.latestRequest.submittedAt}
          />
        )}

        {/* Wizard */}
        <VerifyWizard />
      </div>
    </main>
  );
}
