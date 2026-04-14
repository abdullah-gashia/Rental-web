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
        <p className="text-xs font-medium text-[#9a9590] uppercase tracking-wide">{label}</p>
        <div className="aspect-video bg-[#f0ede7] rounded-xl flex items-center justify-center text-[#9a9590] text-sm">
          ไม่มีรูป
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[#9a9590] uppercase tracking-wide">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="relative aspect-video bg-[#f0ede7] rounded-xl overflow-hidden">
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
    PENDING:  "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/admin/verifications"
        className="inline-flex items-center gap-1.5 text-sm text-[#9a9590] hover:text-[#111] transition"
      >
        ← กลับรายการ
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111]">ตรวจสอบคำขอยืนยันตัวตน</h1>
          <p className="text-sm text-[#9a9590] mt-0.5 font-mono">{request.id}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_BADGE[request.status] ?? "bg-gray-100 text-gray-700"}`}>
          {request.status === "PENDING" ? "รอตรวจสอบ" : request.status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images */}
        <div className="lg:col-span-2 space-y-6">
          {/* ID Card */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
            <h2 className="font-semibold text-[#111]">บัตรประจำตัว</h2>
            <div className="grid grid-cols-2 gap-4">
              <ImageCard label="ด้านหน้า" url={request.idCardImageUrl} />
              <ImageCard label="ด้านหลัง" url={request.idCardBackUrl} />
            </div>
          </div>

          {/* Face liveness */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
            <h2 className="font-semibold text-[#111]">Face Liveness</h2>
            <SelfieGrid request={request} />
          </div>
        </div>

        {/* Right: Info + Review */}
        <div className="space-y-4">
          {/* Applicant info */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-3">
            <h2 className="font-semibold text-[#111]">ข้อมูลผู้สมัคร</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                {request.user.image ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={request.user.image} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#e5e3de] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {request.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[#111]">{request.user.name ?? "—"}</p>
                  <p className="text-xs text-[#9a9590]">{request.user.email}</p>
                </div>
              </div>

              <hr className="border-[#e5e3de]" />

              {[
                { label: "ประเภท", value: request.psuIdType === "STUDENT" ? "นักศึกษา" : "บุคลากร" },
                { label: "รหัส PSU", value: request.psuIdNumber, mono: true },
                { label: "คณะ/ภาควิชา", value: request.facultyOrDepartment ?? "—" },
                { label: "Trust Score", value: String(request.user.trustScore) },
                { label: "ส่งเมื่อ", value: submittedDate },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-[#9a9590]">{label}</span>
                  <span className={`font-medium text-[#333] text-right ${mono ? "font-mono" : ""}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review panel */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
            <ReviewPanel request={request} />
          </div>

          {/* Previous rejection */}
          {request.status === "REJECTED" && request.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">เหตุผลที่ปฏิเสธก่อนหน้า</p>
              <p>{request.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
