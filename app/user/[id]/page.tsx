import { notFound } from "next/navigation";
import { getUserProfile, getMyPendingTransaction } from "@/lib/actions/trust-actions";
import TrustBadge from "@/components/ui/TrustBadge";
import ReportButton from "./ReportButton";
import { getUserPublicItems } from "@/lib/actions/user-directory";
import { hasOpenReport } from "@/lib/actions/report-actions";
import ProfileReviewSection from "./ProfileReviewSection";
import OfficeProfile from "./OfficeProfile";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Star display helper — server-rendered, no JS needed
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-[#dfe7f2]"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;

  // An office is a different kind of thing from a person, so it gets its own
  // page rather than this one with half the sections switched off.
  const early = await getUserProfile(id);
  if (early.user && (early.user as { role?: string }).role === "PATTARA") {
    return <OfficeProfile user={early.user} />;
  }

  const [profileResult, pendingResult, publicItems, reportState] = await Promise.all([
    getUserProfile(id),
    getMyPendingTransaction(id),
    getUserPublicItems(id),
    hasOpenReport(id),
  ]);

  if (profileResult.error || !profileResult.user) notFound();

  const { user } = profileResult;
  const pendingTransactionId = pendingResult.transaction?.id ?? null;

  // Summary comes from the server, aggregated over every review — not just
  // the ten most recent rows fetched for the list below.
  const reviews    = user.reviewsReceived;
  const avgRating  = user.avgRating;
  const reviewCount = user.reviewCount;

  const memberSince = new Date(user.createdAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "long",
  });

  return (
    <div className="min-h-screen bg-[#f1f5fb]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dfe7f2] shadow-sm">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-extrabold tracking-tighter">
            PSU<span style={{ color: "#2563eb" }}>.</span>STORE
          </a>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#3d4d66] hover:text-[#0f1e35] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับหน้าหลัก
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">

        {/* ── Profile Header Card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
          <div className="flex gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#eaf0f8] flex-shrink-0 flex items-center justify-center">
              {user.image ? (
                <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-[#64748b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#0f1e35] truncate">
                  {user.name ?? "ผู้ใช้ไม่ระบุชื่อ"}
                </h1>
                <TrustBadge score={user.trustScore} />
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-2 mb-3">
                {avgRating > 0 ? (
                  <>
                    <Stars rating={Math.round(avgRating)} />
                    <span className="text-sm font-semibold text-[#3d4d66]">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#64748b]">
                      ({reviewCount} รีวิว)
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-[#64748b]">ยังไม่มีรีวิว</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-[#0f1e35] text-base">{user.totalSold}</span>
                  <span className="text-[#64748b] text-xs">ธุรกรรมสำเร็จ</span>
                </div>
                <div className="w-px bg-[#dfe7f2] self-stretch" />
                <div className="flex flex-col">
                  <span className="font-bold text-[#0f1e35] text-base">{user.trustScore}</span>
                  <span className="text-[#64748b] text-xs">คะแนนความน่าเชื่อถือ</span>
                </div>
                <div className="w-px bg-[#dfe7f2] self-stretch" />
                <div className="flex flex-col">
                  <span className="font-bold text-[#0f1e35] text-base">{memberSince}</span>
                  <span className="text-[#64748b] text-xs">สมาชิกตั้งแต่</span>
                </div>
              </div>

              {/* Flag this seller — admins only ever see the result */}
              <div className="pt-1">
                <ReportButton
                  reportedId={user.id}
                  reportedName={user.name ?? "ผู้ใช้รายนี้"}
                  signedIn={reportState.signedIn}
                  isSelf={!!reportState.isSelf}
                  alreadyReported={reportState.reported}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── What this person has for sale ───────────────────────────────── */}
        {publicItems.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#dfe7f2] p-5 sm:p-6 mb-6">
            <h2 className="text-base font-bold text-[#0f1e35] mb-4">
              สินค้าของผู้ใช้รายนี้
              <span className="ml-2 text-xs font-normal text-[#64748b]">{publicItems.length} รายการ</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {publicItems.map((it) => (
                <a
                  key={it.id}
                  href={it.href}
                  className="group block rounded-xl border border-[#dfe7f2] overflow-hidden hover:border-[#c3d0e2] transition"
                >
                  <div className="aspect-square bg-[#eef2f8] flex items-center justify-center overflow-hidden">
                    {it.imageUrl
                      ? <img src={it.imageUrl} alt={it.title} className="w-full h-full object-contain" />
                      : <span className="text-3xl opacity-50">{it.emoji ?? "\ud83d\udce6"}</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12.5px] font-medium text-[#0f1e35] line-clamp-2 leading-snug group-hover:text-[#2563eb]">
                      {it.title}
                    </p>
                    <p className={`text-[13px] font-bold mt-1 ${it.isRent ? "text-[#1d4ed8]" : "text-[#0f1e35]"}`}>
                      {it.priceLabel}
                    </p>
                    <p className="text-[11px] text-[#64748b] truncate mt-0.5">
                      {it.categoryTh}{it.location ? ` \u00b7 ${it.location}` : ""}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Leave a Review + Reviews List ───────────────────────────────── */}
        {/* ProfileReviewSection is a Client Component — it handles the review
            form submission and router.refresh() to reflect the new review     */}
        <ProfileReviewSection
          reviews={reviews}
          sellerId={user.id}
          sellerName={user.name ?? "ผู้ขาย"}
        />

      </main>
    </div>
  );
}
