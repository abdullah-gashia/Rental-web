"use client";

import { useRef } from "react";

export interface ReceiptData {
  orderId:       string;
  itemTitle:     string;
  amount:        number;
  completedAt:   string;   // ISO
  buyerName:     string;
  sellerName:    string;
  // Shipping details (optional — only present if status is COMPLETED)
  shippingMethod?:     string;
  trackingNumber?:     string;
  shippingProofImage?: string;
}

interface Props {
  data:    ReceiptData;
  onClose: () => void;
}

export default function ReceiptModal({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const shortId     = data.orderId.slice(-10).toUpperCase();
  const completedDate = new Date(data.completedAt).toLocaleString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const METHOD_LABELS: Record<string, string> = {
    POST:    "ไปรษณีย์ไทย",
    KERRY:   "Kerry Express",
    FLASH:   "Flash Express",
    "J&T":   "J&T Express",
    MEETUP:  "นัดรับด้วยตนเอง",
    OTHER:   "อื่นๆ",
  };
  const methodLabel = data.shippingMethod
    ? (METHOD_LABELS[data.shippingMethod] ?? data.shippingMethod)
    : null;

  function handlePrint() {
    if (!printRef.current) return;

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>ใบเสร็จ #${shortId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #111; padding: 40px; font-size: 14px; }
    .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -1px; }
    .logo span { color: #e8500a; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 99px; margin-top: 8px; }
    .title { font-size: 18px; font-weight: 800; margin-top: 12px; }
    .ref { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; }
    .row .label { color: #6b7280; }
    .row .value { font-weight: 600; }
    .amount { font-size: 28px; font-weight: 900; color: #10b981; text-align: center; margin: 8px 0; }
    .proof { margin-top: 12px; border-radius: 8px; overflow: hidden; max-height: 200px; text-align: center; }
    .proof img { max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">PSU<span>.</span>STORE</div>
    <div class="badge">✅ ชำระเงินแล้ว (PAID via Escrow)</div>
    <div class="title">ใบเสร็จรับเงิน</div>
    <div class="ref">หมายเลขอ้างอิง: #${shortId}</div>
  </div>

  <div class="section">
    <div class="section-title">รายละเอียดธุรกรรม</div>
    <div class="row"><span class="label">สินค้า</span><span class="value">${data.itemTitle}</span></div>
    <div class="row"><span class="label">ผู้ซื้อ</span><span class="value">${data.buyerName}</span></div>
    <div class="row"><span class="label">ผู้ขาย</span><span class="value">${data.sellerName}</span></div>
    <div class="row"><span class="label">วันที่เสร็จสิ้น</span><span class="value">${completedDate}</span></div>
    <div class="row"><span class="label">สถานะ</span><span class="value">✅ PAID via Escrow</span></div>
  </div>

  <div class="amount">฿${data.amount.toLocaleString("th-TH")}</div>

  ${methodLabel ? `
  <div class="section">
    <div class="section-title">ข้อมูลการจัดส่ง</div>
    <div class="row"><span class="label">วิธีจัดส่ง</span><span class="value">${methodLabel}</span></div>
    ${data.trackingNumber ? `<div class="row"><span class="label">หมายเลขพัสดุ</span><span class="value">${data.trackingNumber}</span></div>` : ""}
    ${data.shippingProofImage ? `<div class="proof"><img src="${data.shippingProofImage}" alt="หลักฐานจัดส่ง"/></div>` : ""}
  </div>` : ""}

  <div class="footer">
    <p>เอกสารนี้ออกโดยระบบ PSU.STORE อัตโนมัติ • ไม่ต้องมีลายเซ็น</p>
    <p>Order ID: ${data.orderId}</p>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-base font-bold text-white">ใบเสร็จรับเงิน</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-200 hover:bg-emerald-500 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt body */}
        <div ref={printRef} className="px-6 py-5 space-y-4">
          {/* Logo + status */}
          <div className="text-center space-y-1.5 pb-4 border-b border-[#e5e3de]">
            <p className="text-xl font-black tracking-tighter">
              PSU<span style={{ color: "#e8500a" }}>.</span>STORE
            </p>
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
              ✅ ชำระเงินแล้ว (PAID via Escrow)
            </span>
            <p className="text-xs text-[#9a9590] font-mono">#{shortId}</p>
          </div>

          {/* Transaction details */}
          <div className="bg-[#f7f6f3] rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-[#9a9590] uppercase tracking-wider mb-3">รายละเอียดธุรกรรม</p>
            {[
              { label: "สินค้า",         value: data.itemTitle },
              { label: "ผู้ซื้อ",         value: data.buyerName  || "ไม่ระบุ" },
              { label: "ผู้ขาย",         value: data.sellerName || "ไม่ระบุ" },
              { label: "วันที่เสร็จสิ้น", value: completedDate },
              { label: "สถานะ",          value: "✅ PAID via Escrow" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-[#9a9590] flex-shrink-0">{label}</span>
                <span className="font-semibold text-[#111] text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Amount */}
          <div className="text-center py-3 border-y border-[#e5e3de]">
            <p className="text-[10px] text-[#9a9590] uppercase tracking-wider mb-1">ยอดรวม</p>
            <p className="text-4xl font-black text-emerald-600">฿{data.amount.toLocaleString()}</p>
          </div>

          {/* Shipping info */}
          {methodLabel && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">ข้อมูลการจัดส่ง</p>
              <div className="flex items-start justify-between gap-2 text-sm">
                <span className="text-[#9a9590]">วิธีจัดส่ง</span>
                <span className="font-semibold text-[#111]">{methodLabel}</span>
              </div>
              {data.trackingNumber && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-[#9a9590]">หมายเลขพัสดุ</span>
                  <span className="font-mono font-bold text-[#111]">{data.trackingNumber}</span>
                </div>
              )}
              {data.shippingProofImage && (
                <a href={data.shippingProofImage} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img
                    src={data.shippingProofImage}
                    alt="หลักฐานจัดส่ง"
                    className="w-full max-h-36 object-cover rounded-xl border border-blue-200 hover:opacity-90 transition cursor-zoom-in"
                  />
                </a>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-center text-[#9a9590] leading-relaxed">
            เอกสารนี้ออกโดยระบบ PSU.STORE อัตโนมัติ ไม่ต้องมีลายเซ็น<br />
            Order ID: <span className="font-mono">{data.orderId}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-[#e5e3de] px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            ดาวน์โหลด / พิมพ์
          </button>
        </div>
      </div>
    </div>
  );
}
