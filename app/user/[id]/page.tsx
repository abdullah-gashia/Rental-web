import { notFound } from "next/navigation";
import { getUserProfile, getMyPendingTransaction } from "@/lib/actions/trust-actions";
import TrustBadge from "@/components/ui/TrustBadge";
import ProfileReviewSection from "./ProfileReviewSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Star display helper — server-rendered, no JS needed
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-[#e5e3de]"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [profileResult, pendingResult] = await Promise.all([
    getUserProfile(id),
    getMyPendingTransaction(id),
  ]);

  if (profileResult.error || !profileResult.user) notFound();

  const { user } = profileResult;
  const pendingTransactionId = pendingResult.transaction?.id ?? null;

  // Compute average rating from received reviews
  const reviews = user.reviewsReceived;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : 0;

  const memberSince = new Date(user.createdAt).toLocaleDateString("th-TH", {
    year: "numeric", month: "long",
  });

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="text-lg font-extrabold tracking-tighter">
            PSU<span style={{ color: "#e8500a" }}>.</span>STORE
          </a>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#555] hover:text-[#111] transition"
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
        <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
          <div className="flex gap-5 items-start">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#f0ede7] flex-shrink-0 flex items-center justify-center">
              {user.image ? (
                <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-[#9a9590]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#111] truncate">
                  {user.name ?? "ผู้ใช้ไม่ระบุชื่อ"}
                </h1>
                <TrustBadge score={user.trustScore} />
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-2 mb-3">
                {avgRating > 0 ? (
                  <>
                    <Stars rating={Math.round(avgRating)} />
                    <span className="text-sm font-semibold text-[#555]">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#9a9590]">
                      ({reviews.length} รีวิว)
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-[#9a9590]">ยังไม่มีรีวิว</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-[#111] text-base">{user.totalSold}</span>
                  <span className="text-[#9a9590] text-xs">ธุรกรรมสำเร็จ</span>
                </div>
                <div className="w-px bg-[#e5e3de] self-stretch" />
                <div className="flex flex-col">
                  <span className="font-bold text-[#111] text-base">{user.trustScore}</span>
                  <span className="text-[#9a9590] text-xs">คะแนนความน่าเชื่อถือ</span>
                </div>
                <div className="w-px bg-[#e5e3de] self-stretch" />
                <div className="flex flex-col">
                  <span className="font-bold text-[#111] text-base">{memberSince}</span>
                  <span className="text-[#9a9590] text-xs">สมาชิกตั้งแต่</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
