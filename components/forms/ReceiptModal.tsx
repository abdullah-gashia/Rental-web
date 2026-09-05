"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useRef } from "react";

export interface ReceiptData {
  orderId:       string;
  itemTitle:     string;
  amount:        number;
  completedAt:   string;   // ISO
  buyerName:     string;
  sellerName:    string;
  deliveryMethod?:      string;
  // Shipping details (optional)
  shippingMethod?:      string;
  trackingNumber?:      string;
  shippingProofImage?:  string;
  // Meetup proof of delivery (optional)
  handoverSignature?:   string;   // base64 PNG
  handoverPhotoUrl?:    string;
  handoverConfirmedAt?: string;   // ISO
}

interface Props {
  data:    ReceiptData;
  onClose: () => void;
}

export default function ReceiptModal({ data, onClose }: Props) {
  const tr = useTr();
  const printRef = useRef<HTMLDivElement>(null);

  const shortId     = data.orderId.slice(-10).toUpperCase();
  const completedDate = new Date(data.completedAt).toLocaleString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const METHOD_LABELS: Record<string, string> = {
    POST:    tr("ไปรษณีย์ไทย"),
    KERRY:   "Kerry Express",
    FLASH:   "Flash Express",
    "J&T":   "J&T Express",
    MEETUP:  tr("นัดรับด้วยตนเอง"),
    OTHER:   tr("อื่นๆ"),
  };
  const methodLabel = data.shippingMethod
    ? (tr(METHOD_LABELS[data.shippingMethod] ?? data.shippingMethod))
    : null;

  function handlePrint() {
    if (!printRef.current) return;

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${tr("ใบเสร็จ #{0}", [shortId])}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #0f1e35; padding: 40px; font-size: 14px; }
    .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -1px; }
    .logo span { color: #2563eb; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 99px; margin-top: 8px; }
    .title { font-size: 18px; font-weight: 800; margin-top: 12px; }
    .ref { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; }
    .row .label { color: #64748b; }
    .row .value { font-weight: 600; }
    .amount { font-size: 28px; font-weight: 900; color: #10b981; text-align: center; margin: 8px 0; }
    .proof { margin-top: 12px; border-radius: 8px; overflow: hidden; max-height: 200px; text-align: center; }
    .proof img { max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; }
    .evidence { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .evidence-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 12px; }
    .evidence-label { font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .sig-box { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; text-align: center; margin-bottom: 12px; }
    .sig-box img { max-height: 80px; object-fit: contain; }
    .photo-box { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; margin-bottom: 8px; }
    .photo-box img { width: 100%; max-height: 220px; object-fit: contain; display: block; }
    .timestamp { font-size: 10px; color: #9ca3af; margin-top: 4px; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">PSU<span>.</span>STORE</div>
    <div class="badge">${tr("✅ ชำระเงินแล้ว (PAID via Escrow)")}</div>
    <div class="title">${tr("ใบเสร็จรับเงิน")}</div>
    <div class="ref">${tr("หมายเลขอ้างอิง: #{0}", [shortId])}</div>
  </div>

  <div class="section">
    <div class="section-title">${tr("รายละเอียดธุรกรรม")}</div>
    <div class="row"><span class="label">${tr("สินค้า")}</span><span class="value">${data.itemTitle}</span></div>
    <div class="row"><span class="label">${tr("ผู้ซื้อ")}</span><span class="value">${data.buyerName}</span></div>
    <div class="row"><span class="label">${tr("ผู้ขาย")}</span><span class="value">${data.sellerName}</span></div>
    <div class="row"><span class="label">${tr("วันที่เสร็จสิ้น")}</span><span class="value">${completedDate}</span></div>
    <div class="row"><span class="label">${tr("สถานะ")}</span><span class="value">✅ PAID via Escrow</span></div>
  </div>

  <div class="amount">฿${data.amount.toLocaleString("th-TH")}</div>

  ${methodLabel ? `
  <div class="section">
    <div class="section-title">${tr("ข้อมูลการจัดส่ง")}</div>
    <div class="row"><span class="label">${tr("วิธีจัดส่ง")}</span><span class="value">${methodLabel}</span></div>
    ${data.trackingNumber ? `<div class="row"><span class="label">${tr("หมายเลขพัสดุ")}</span><span class="value">${data.trackingNumber}</span></div>` : ""}
    ${data.shippingProofImage ? `<div class="proof"><img src="${data.shippingProofImage}" alt="${tr("หลักฐานจัดส่ง")}"/></div>` : ""}
  </div>` : ""}

  ${data.deliveryMethod === "MEETUP" && (data.handoverSignature || data.handoverPhotoUrl) ? `
  <div class="evidence">
    <div class="evidence-title">${tr("🤝 หลักฐานการส่งมอบสินค้า (Proof of Delivery)")}</div>
    ${data.handoverSignature ? `
    <div class="evidence-label">${tr("ลายมือชื่อผู้รับสินค้า")}</div>
    <div class="sig-box">
      <img src="${data.handoverSignature}" alt="${tr("ลายมือชื่อผู้รับสินค้า")}" />
    </div>` : ""}
    ${data.handoverPhotoUrl ? `
    <div class="evidence-label">${tr("ภาพถ่ายหลักฐานการส่งมอบ")}</div>
    <div class="photo-box">
      <img src="${data.handoverPhotoUrl}" alt="${tr("ภาพถ่ายหลักฐานการส่งมอบ")}" />
    </div>
    ${data.handoverConfirmedAt ? tr("<div class=\"timestamp\">บันทึกเมื่อ: {0}</div>", [new Date(data.handoverConfirmedAt).toLocaleString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })]) : ""}` : ""}
  </div>` : ""}

  <div class="footer">
    <p>${tr("เอกสารนี้ออกโดยระบบ PSU.STORE อัตโนมัติ • ไม่ต้องมีลายเซ็น")}</p>
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

      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-base font-bold text-white">{tr("ใบเสร็จรับเงิน")}</h3>
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
          <div className="text-center space-y-1.5 pb-4 border-b border-[var(--c-line)]">
            <p className="text-xl font-black tracking-tighter">
              PSU<span style={{ color: "var(--c-accent)" }}>.</span>STORE
            </p>
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">{tr("✅ ชำระเงินแล้ว (PAID via Escrow)")}</span>
            <p className="text-xs text-[var(--c-muted)] font-mono">#{shortId}</p>
          </div>

          {/* Transaction details */}
          <div className="bg-[var(--c-canvas)] rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-wider mb-3">{tr("รายละเอียดธุรกรรม")}</p>
            {[
              { label: tr("สินค้า"),         value: data.itemTitle },
              { label: tr("ผู้ซื้อ"),         value: data.buyerName  || tr("ไม่ระบุ") },
              { label: tr("ผู้ขาย"),         value: data.sellerName || tr("ไม่ระบุ") },
              { label: tr("วันที่เสร็จสิ้น"), value: completedDate },
              { label: tr("สถานะ"),          value: "✅ PAID via Escrow" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-[var(--c-muted)] flex-shrink-0">{label}</span>
                <span className="font-semibold text-[var(--c-ink)] text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Amount */}
          <div className="text-center py-3 border-y border-[var(--c-line)]">
            <p className="text-[10px] text-[var(--c-muted)] uppercase tracking-wider mb-1">{tr("ยอดรวม")}</p>
            <p className="text-4xl font-black text-[var(--c-ok)]">฿{data.amount.toLocaleString()}</p>
          </div>

          {/* Shipping info */}
          {methodLabel && (
            <div className="bg-[var(--c-accent-soft)] border border-blue-100 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-[var(--c-accent)] uppercase tracking-wider mb-2">{tr("ข้อมูลการจัดส่ง")}</p>
              <div className="flex items-start justify-between gap-2 text-sm">
                <span className="text-[var(--c-muted)]">{tr("วิธีจัดส่ง")}</span>
                <span className="font-semibold text-[var(--c-ink)]">{methodLabel}</span>
              </div>
              {data.trackingNumber && (
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-[var(--c-muted)]">{tr("หมายเลขพัสดุ")}</span>
                  <span className="font-mono font-bold text-[var(--c-ink)]">{data.trackingNumber}</span>
                </div>
              )}
              {data.shippingProofImage && (
                <a href={data.shippingProofImage} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img
                    src={data.shippingProofImage}
                    alt={tr("หลักฐานจัดส่ง")}
                    className="w-full max-h-36 object-contain rounded-xl border border-[var(--c-line-str)] hover:opacity-90 transition cursor-zoom-in"
                  />
                </a>
              )}
            </div>
          )}

          {/* Proof of Delivery — meetup completed orders only */}
          {data.deliveryMethod === "MEETUP" && (data.handoverSignature || data.handoverPhotoUrl) && (
            <div className="bg-[var(--c-subtle)] rounded-xl border border-[var(--c-line)] p-4 space-y-4">
              <p className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <span>🤝</span>{tr("หลักฐานการส่งมอบสินค้า")}</p>

              {/* Signature block */}
              {data.handoverSignature && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--c-ink-2)]">{tr("ลายมือชื่อผู้รับสินค้า")}</p>
                  <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg p-2 flex items-center justify-center">
                    <img
                      src={data.handoverSignature}
                      alt={tr("ลายมือชื่อผู้รับสินค้า")}
                      className="h-24 w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Photo block */}
              {data.handoverPhotoUrl && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--c-ink-2)]">{tr("ภาพถ่ายหลักฐานการส่งมอบ")}</p>
                  <a
                    href={data.handoverPhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-zoom-in"
                  >
                    <img
                      src={data.handoverPhotoUrl}
                      alt={tr("ภาพถ่ายหลักฐานการส่งมอบ")}
                      className="aspect-video h-40 w-full object-contain rounded-md border border-[var(--c-line)] hover:opacity-90 transition"
                    />
                  </a>
                  {data.handoverConfirmedAt && (
                    <p className="text-[10px] text-[var(--c-muted)]">
                      บันทึกเมื่อ:{" "}
                      {new Date(data.handoverConfirmedAt).toLocaleString("th-TH", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-center text-[var(--c-muted)] leading-relaxed">{tr("เอกสารนี้ออกโดยระบบ PSU.STORE อัตโนมัติ ไม่ต้องมีลายเซ็น")}<br />
            Order ID: <span className="font-mono">{data.orderId}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[var(--c-surface)] border-t border-[var(--c-line)] px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
          >{tr("ปิด")}</button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>{tr("ดาวน์โหลด / พิมพ์")}</button>
        </div>
      </div>
    </div>
  );
}
