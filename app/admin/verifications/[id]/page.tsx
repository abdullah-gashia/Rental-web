import { getTr } from "@/lib/i18n/server";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVerificationDetail } from "../actions";
import ReviewPanel from "../_components/ReviewPanel";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ImageCard({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--c-muted)] uppercase tracking-wide">{label}</p>
        <div className="aspect-video bg-[var(--c-line-soft)] rounded-xl flex items-center justify-center text-[var(--c-muted)] text-sm">
          ไม่มีรูป
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--c-muted)] uppercase tracking-wide">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="relative aspect-video bg-[var(--c-line-soft)] rounded-xl overflow-hidden">
          <Image
            src={url}
            alt={label}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition">
            เปิดเต็ม ↗
          </span>
        </div>
      </a>
    </div>
  );
}

function SelfieGrid({ request }: { request: NonNullable<Awaited<ReturnType<typeof getVerificationDetail>>> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ImageCard label="หน้าตรง" url={request.selfieFrontUrl} />
      <ImageCard label="หันซ้าย" url={request.selfieLeftUrl} />
      <ImageCard label="หันขวา" url={request.selfieRightUrl} />
      <ImageCard label="เงยหน้า" url={request.selfieUpUrl} />
    </div>
  );
}

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tr = await getTr();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const request = await getVerificationDetail(id);
  if (!request) notFound();

  const submittedDate = new Date(request.submittedAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const STATUS_BADGE: Record<string, string> = {
    PENDING:  "bg-[var(--c-warn-soft)] text-[var(--c-warn)]",
    APPROVED: "bg-emerald-100 text-[var(--c-ok)]",
    REJECTED: "bg-[var(--c-danger-soft)] text-[var(--c-danger)]",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/admin/verifications"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-ink)] transition"
      >{tr("← กลับรายการ")}</Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--c-ink)]">{tr("ตรวจสอบคำขอยืนยันตัวตน")}</h1>
          <p className="text-sm text-[var(--c-muted)] mt-0.5 font-mono">{request.id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[request.status] ?? "bg-[var(--c-line-soft)] text-[var(--c-ink-2)]"}`}>
          {request.status === "PENDING" ? tr("รอตรวจสอบ") : request.status === "APPROVED" ? tr("อนุมัติแล้ว") : tr("ปฏิเสธแล้ว")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="lg:col-span-2 space-y-6">
          {/* ID Card */}
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-4">
            <h2 className="font-semibold text-[var(--c-ink)]">{tr("บัตรประจำตัว")}</h2>
            <div className="grid grid-cols-2 gap-4">
              <ImageCard label={tr("ด้านหน้า")} url={request.idCardImageUrl} />
              <ImageCard label={tr("ด้านหลัง")} url={request.idCardBackUrl} />
            </div>
          </div>

          {/* Face liveness */}
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-4">
            <h2 className="font-semibold text-[var(--c-ink)]">Face Liveness</h2>
            <SelfieGrid request={request} />
          </div>
        </div>

        {/* Right: Info + Review */}
        <div className="space-y-4">
          {/* Applicant info */}
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-3">
            <h2 className="font-semibold text-[var(--c-ink)]">{tr("ข้อมูลผู้สมัคร")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                {request.user.image ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={request.user.image} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--c-line)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {request.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--c-ink)]">{request.user.name ?? "—"}</p>
                  <p className="text-xs text-[var(--c-muted)]">{request.user.email}</p>
                </div>
              </div>

              <hr className="border-[var(--c-line)]" />

              {[
                { label: tr("ประเภท"), value: request.psuIdType === "STUDENT" ? tr("นักศึกษา") : tr("บุคลากร") },
                { label: tr("รหัส PSU"), value: request.psuIdNumber, mono: true },
                { label: tr("คณะ/ภาควิชา"), value: request.facultyOrDepartment ?? "—" },
                { label: "Trust Score", value: String(request.user.trustScore) },
                { label: tr("ส่งเมื่อ"), value: submittedDate },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-[var(--c-muted)]">{label}</span>
                  <span className={`font-medium text-[var(--c-ink-1)] text-right ${mono ? "font-mono" : ""}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review panel */}
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
            <ReviewPanel request={request} />
          </div>

          {/* Previous rejection */}
          {request.status === "REJECTED" && request.rejectionReason && (
            <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-2xl p-4 text-sm text-[var(--c-danger)]">
              <p className="font-semibold mb-1">{tr("เหตุผลที่ปฏิเสธก่อนหน้า")}</p>
              <p>{request.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
