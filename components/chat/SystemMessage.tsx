"use client";

// ─── System-message protocol ──────────────────────────────────────────────────
//
// System messages are stored as regular Message rows but their content follows
// this wire format:
//
//   SYSTEM:SHIPPING:{...json...}
//   SYSTEM:RECEIPT:{...json...}
//
// The prefix makes them machine-detectable while remaining human-readable as a
// plain-text fallback for older clients.  Users cannot send messages beginning
// with "SYSTEM:" (enforced in the send handler).

export interface ShippingPayload {
  orderId:       string;
  itemTitle:     string;
  amount:        number;
  method:        string;          // code, e.g. "POST"
  methodLabel:   string;          // display name, e.g. "ไปรษณีย์ไทย"
  trackingNumber?: string;
  proofUrl?:     string;
  shippedAt:     string;          // ISO
}

export interface ReceiptPayload {
  orderId:     string;
  itemTitle:   string;
  amount:      number;
  completedAt: string;            // ISO
  buyerName:   string;
  sellerName:  string;
}

type ParsedSystem =
  | { type: "SHIPPING"; data: ShippingPayload }
  | { type: "RECEIPT";  data: ReceiptPayload  };

export function parseSystemMessage(content: string): ParsedSystem | null {
  if (!content.startsWith("SYSTEM:")) return null;
  const rest      = content.slice("SYSTEM:".length);
  const colonIdx  = rest.indexOf(":");
  if (colonIdx === -1) return null;
  const type = rest.slice(0, colonIdx);
  const json = rest.slice(colonIdx + 1);
  try {
    const data = JSON.parse(json);
    if (type === "SHIPPING") return { type: "SHIPPING", data };
    if (type === "RECEIPT")  return { type: "RECEIPT",  data };
    return null;
  } catch {
    return null;
  }
}

// ─── Shipping Receipt Card ────────────────────────────────────────────────────

function ShippingCard({ data }: { data: ShippingPayload }) {
  const shippedDate = new Date(data.shippedAt).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function copyTracking() {
    if (data.trackingNumber) {
      navigator.clipboard.writeText(data.trackingNumber).catch(() => {});
    }
  }

  return (
    <div className="w-full rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/60 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="bg-blue-600 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-white text-xs font-bold tracking-wide uppercase">ยืนยันการจัดส่งอย่างเป็นทางการ</span>
        <span className="ml-auto text-blue-200 text-[10px]">Official Shipping Confirmation</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Item & price */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">สินค้า</p>
            <p className="text-sm font-bold text-[#111] truncate">{data.itemTitle}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">ราคา</p>
            <p className="text-sm font-bold text-[#111]">฿{data.amount.toLocaleString()}</p>
          </div>
        </div>

        {/* Shipping method */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-blue-100">
          <span className="text-blue-600 text-sm">🚚</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[#9a9590]">วิธีจัดส่ง</p>
            <p className="text-sm font-semibold text-[#111]">{data.methodLabel}</p>
          </div>
        </div>

        {/* Tracking number */}
        {data.trackingNumber && (
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-blue-100">
            <span className="text-blue-600 text-sm">🔢</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-[#9a9590]">หมายเลขพัสดุ</p>
              <p className="text-sm font-mono font-bold text-[#111] truncate">{data.trackingNumber}</p>
            </div>
            <button
              onClick={copyTracking}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold transition"
              title="คัดลอกหมายเลข"
            >
              คัดลอก
            </button>
          </div>
        )}

        {/* Proof image */}
        {data.proofUrl && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-[#9a9590] font-semibold">🖼️ รูปหลักฐานการจัดส่ง</p>
            <a href={data.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={data.proofUrl}
                alt="หลักฐานการจัดส่ง"
                className="w-full max-h-48 object-cover rounded-xl border border-blue-100 hover:opacity-90 transition cursor-zoom-in"
              />
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-blue-100">
          <span className="text-[10px] text-[#9a9590]">จัดส่งเมื่อ {shippedDate}</span>
          <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
            🔒 ข้อมูลอย่างเป็นทางการ
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Receipt Card ────────────────────────────────────────────────────

function ReceiptCard({ data }: { data: ReceiptPayload }) {
  const completedDate = new Date(data.completedAt).toLocaleString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const shortId = data.orderId.slice(-8).toUpperCase();

  return (
    <div className="w-full rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/60 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="bg-emerald-600 px-4 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-white text-xs font-bold tracking-wide uppercase">ใบเสร็จรับเงิน</span>
        <span className="ml-auto text-emerald-200 text-[10px]">Official Purchase Receipt</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Order ref */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">หมายเลขอ้างอิง</p>
            <p className="text-sm font-mono font-bold text-[#111]">#{shortId}</p>
          </div>
          <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
            ✅ PAID via Escrow
          </span>
        </div>

        {/* Item */}
        <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5 space-y-2">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-[#9a9590]">สินค้า</p>
              <p className="text-sm font-semibold text-[#111] truncate">{data.itemTitle}</p>
            </div>
            <p className="text-sm font-extrabold text-emerald-700 flex-shrink-0 ml-4">
              ฿{data.amount.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-50">
            <div>
              <p className="text-[10px] text-[#9a9590]">ผู้ซื้อ</p>
              <p className="text-xs font-semibold text-[#333] truncate">{data.buyerName || "ไม่ระบุ"}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9a9590]">ผู้ขาย</p>
              <p className="text-xs font-semibold text-[#333] truncate">{data.sellerName || "ไม่ระบุ"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
          <span className="text-[10px] text-[#9a9590]">เสร็จสิ้น {completedDate}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
            🔒 ข้อมูลอย่างเป็นทางการ
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function SystemMessage({ content }: { content: string }) {
  const parsed = parseSystemMessage(content);
  if (!parsed) {
    // Graceful fallback — show as muted system notice
    return (
      <div className="w-full text-center py-1">
        <span className="text-[10px] text-[#9a9590] italic">[ข้อความระบบ]</span>
      </div>
    );
  }

  if (parsed.type === "SHIPPING") return <ShippingCard data={parsed.data} />;
  if (parsed.type === "RECEIPT")  return <ReceiptCard  data={parsed.data} />;
  return null;
}
