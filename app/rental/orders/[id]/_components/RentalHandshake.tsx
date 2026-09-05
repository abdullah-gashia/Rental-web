"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import type { TrFn } from "@/lib/i18n/phrases";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRentalPickup, confirmRentalReturn } from "@/lib/actions/rental-transitions";
import SignatureCapture from "@/components/rental/SignatureCapture";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

interface Props {
  orderId:        string;
  type:           "pickup" | "return";
  role:           "RENTER" | "OWNER";
  myConfirmed:    boolean;
  otherConfirmed: boolean;
  // For building the agreement text
  itemTitle?:     string;
  rentalDays?:    number;
  securityDeposit?: number;
  lateFeePerDay?: number;
  userName?:      string;
}

const CONDITIONS = [
  { value: "SAME",         label: "สภาพเดิม ✅",       color: "bg-[var(--c-ok-soft)] border-green-300 text-[var(--c-ok)]" },
  { value: "MINOR_DAMAGE", label: "เสียหายเล็กน้อย ⚠️", color: "bg-[var(--c-warn-soft)] border-yellow-300 text-[var(--c-warn)]" },
  { value: "MAJOR_DAMAGE", label: "เสียหายมาก 🔴",      color: "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]" },
  { value: "LOST",         label: "สูญหาย ❌",          color: "bg-[var(--c-danger-soft)] border-red-500 text-[var(--c-danger)]" },
];

function buildPickupAgreement(itemTitle: string, rentalDays: number, deposit: number, lateFee: number, tr: TrFn) {
  return [
    tr("ยอมรับว่าได้รับสินค้า \"{0}\" เรียบร้อยแล้ว ในสภาพที่ตรงตามรูปถ่ายหลักฐาน", [itemTitle]),
    ``,
    tr("ข้าพเจ้าตกลงดังนี้:"),
    tr("• เช่าเป็นระยะเวลา {0} วัน", [rentalDays]),
    tr("• วางมัดจำ ฿{0} ไว้ในระบบ Escrow", [deposit.toLocaleString()]),
    tr("• หากสินค้าชำรุดหรือเสียหาย ยินยอมให้หักค่าเสียหายจากเงินมัดจำ"),
    tr("• หากสินค้าสูญหาย ยินยอมให้ริบเงินมัดจำทั้งจำนวน"),
    lateFee > 0 ? tr("• หากคืนล่าช้า จะถูกคิดค่าปรับ ฿{0}/วัน", [lateFee.toLocaleString()]) : tr("• ไม่มีค่าปรับคืนล่าช้า"),
    tr("• ข้อตกลงนี้มีผลผูกพันตามประมวลกฎหมายแพ่งและพาณิชย์ ว่าด้วยการเช่าทรัพย์ มาตรา 537–571"),
  ].join("\n");
}

function buildReturnAgreement(itemTitle: string, condition: string, damageFee: number, tr: TrFn) {
  const conditionLabel: Record<string, string> = {
    SAME: "สภาพเดิม — ไม่มีความเสียหาย",
    MINOR_DAMAGE: "เสียหายเล็กน้อย",
    MAJOR_DAMAGE: "เสียหายมาก",
    LOST: "สูญหาย",
  };
  return [
    tr("ยอมรับว่าได้รับสินค้า \"{0}\" คืนเรียบร้อยแล้ว", [itemTitle]),
    ``,
    tr("สภาพสินค้า: {0}", [conditionLabel[condition] ?? condition]),
    damageFee > 0
      ? tr("ค่าเสียหาย: ฿{0} (จะถูกหักจากเงินมัดจำ)", [damageFee.toLocaleString()])
      : tr("ไม่มีค่าเสียหาย (มัดจำคืนเต็มจำนวน)"),
    ``,
    tr("ข้าพเจ้ายืนยันว่าได้ตรวจสอบสภาพสินค้าแล้ว และยอมรับการประเมินข้างต้น"),
    tr("การชำระเงินจะดำเนินการโดยอัตโนมัติหลังจากทั้งสองฝ่ายยืนยัน"),
  ].join("\n");
}

export default function RentalHandshake({
  orderId, type, role, myConfirmed, otherConfirmed,
  itemTitle = "สินค้า", rentalDays = 1, securityDeposit = 0, lateFeePerDay = 0, userName = "—",
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [photos,        setPhotos]        = useState<string[]>([]);
  const [uploading,     setUploading]     = useState(false);
  const [condition,     setCondition]     = useState("SAME");
  const [conditionNote, setConditionNote] = useState("");
  const [damageFee,     setDamageFee]     = useState(0);
  const [agreed,        setAgreed]        = useState(false);
  const [signature,     setSignature]     = useState<string | null>(null);
  const [showSigPad,    setShowSigPad]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const isReturn = type === "return";
  const isOwner  = role === "OWNER";
  const isRenter = role === "RENTER";

  // Signature is required: renter signs at pickup, owner signs at return
  const needsSignature = (type === "pickup" && isRenter) || (type === "return" && isOwner);
  const signerRole: "ผู้เช่า" | "เจ้าของ" = isRenter ? "ผู้เช่า" : "เจ้าของ";

  const agreementText = type === "pickup"
    ? buildPickupAgreement(itemTitle, rentalDays, securityDeposit, lateFeePerDay, tr)
    : buildReturnAgreement(itemTitle, condition, damageFee, tr);

  const title     = type === "pickup" ? tr("📦 ยืนยันการรับของ (Digital Handshake #1)") : tr("🔄 ยืนยันการคืนของ (Digital Handshake #2)");
  const meLabel   = isRenter ? "ผู้เช่า" : "เจ้าของ";
  const otherLabel = isRenter ? "เจ้าของ" : "ผู้เช่า";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const { file: prepared } = await prepareImageForUpload(file);
      const form = new FormData();
      form.append("file", prepared);
      try {
        const res  = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      } catch { /* ignore */ }
    }
    setPhotos((p) => [...p, ...uploaded]);
    setUploading(false);
  }

  function handleConfirm() {
  const tr = useLocaleStore((s) => s.tr);
    if (!agreed) { setError(tr("กรุณายืนยันว่าข้อมูลถูกต้อง")); return; }
    if (needsSignature && !signature) { setError(tr("กรุณาลงลายเซ็นดิจิทัลก่อน")); return; }
    setError(null);
    startTransition(async () => {
      let res;
      if (type === "pickup") {
        res = await confirmRentalPickup(orderId, photos, conditionNote);
      } else {
        res = await confirmRentalReturn(orderId, photos, condition, conditionNote, damageFee);
      }
      if (!res.success) setError((res as any).error);
      else router.refresh();
    });
  }

  // Already confirmed — show status only
  if (myConfirmed) {
    return (
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <h3 className="text-sm font-bold text-[var(--c-ink)] mb-2">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-[var(--c-ok)] bg-[var(--c-ok-soft)] rounded-xl px-3 py-2.5">
          <span>✅</span>
          <span>คุณยืนยันแล้ว{otherConfirmed ? "" : tr(" — รอ{0}ยืนยัน", [otherLabel])}</span>
        </div>
        {!otherConfirmed && (
          <p className="text-xs text-[var(--c-faint)] mt-2">{tr("เมื่อ{0}ยืนยันด้วย สถานะจะเปลี่ยนอัตโนมัติ", [otherLabel])}</p>
        )}
      </div>
    );
  }

  // Signature pad overlay
  if (showSigPad) {
    return (
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <h3 className="text-sm font-bold text-[var(--c-ink)] mb-4">{tr("✍️ ลงลายเซ็นดิจิทัล")}</h3>
        <SignatureCapture
          signerName={userName}
          signerRole={signerRole}
          agreementText={agreementText}
          onComplete={(dataUrl) => {
            setSignature(dataUrl);
            setShowSigPad(false);
          }}
          onCancel={() => setShowSigPad(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-4">
      {/* Title + party status */}
      <div>
        <h3 className="text-sm font-bold text-[var(--c-ink)]">{title}</h3>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={`px-2 py-1 rounded-full border ${
            myConfirmed ? "bg-[var(--c-ok-soft)] border-green-300 text-[var(--c-ok)]" : "bg-[var(--c-subtle)] border-[var(--c-line)] text-[var(--c-muted)]"
          }`}>
            {meLabel}: {myConfirmed ? "✅ ยืนยันแล้ว" : tr("⏳ รอยืนยัน")}
          </span>
          <span className={`px-2 py-1 rounded-full border ${
            otherConfirmed ? "bg-[var(--c-ok-soft)] border-green-300 text-[var(--c-ok)]" : "bg-[var(--c-subtle)] border-[var(--c-line)] text-[var(--c-muted)]"
          }`}>
            {otherLabel}: {otherConfirmed ? "✅ ยืนยันแล้ว" : tr("⏳ รอยืนยัน")}
          </span>
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-2">
          📷 ถ่ายรูปสภาพสินค้า {type === "pickup" ? tr("(ก่อนรับ)") : tr("(หลังคืน)")}
        </p>
        <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-[var(--c-line)]
                          rounded-xl cursor-pointer hover:border-[var(--c-accent)]/50 transition">
          <span className="text-xl">📷</span>
          <span className="text-sm text-[var(--c-ink-3)]">
            {uploading ? "กำลังอัปโหลด..." : tr("เลือกรูปภาพ (หลายรูปได้)")}
          </span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </label>
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-contain border border-[var(--c-line)]" />
            ))}
          </div>
        )}
      </div>

      {/* Condition rating — return, owner only */}
      {isReturn && isOwner && (
        <div>
          <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-2">{tr("สภาพสินค้าหลังคืน")}</p>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                  condition === c.value ? c.color : "border-[var(--c-line)] text-[var(--c-ink-2)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {["MINOR_DAMAGE", "MAJOR_DAMAGE"].includes(condition) && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-[var(--c-ink-2)]">{tr("ค่าเสียหาย (฿)")}</p>
              <input
                type="number" min={0} value={damageFee}
                onChange={(e) => setDamageFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--c-line)] rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("หมายเหตุ (ไม่บังคับ)")}</p>
        <textarea
          value={conditionNote}
          onChange={(e) => setConditionNote(e.target.value)}
          rows={2}
          placeholder={tr("เช่น สภาพดี, มีรอยขีดข่วนเล็กน้อย...")}
          className="w-full px-3 py-2 text-sm border border-[var(--c-line)] rounded-xl resize-none
                     focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30"
        />
      </div>

      {/* Digital Signature — renter at pickup, owner at return */}
      {needsSignature && (
        <div>
          <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-2">{tr("✍️ ลายเซ็นดิจิทัล (จำเป็น)")}</p>
          {signature ? (
            <div className="flex items-center gap-3 bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-xl px-3 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt={tr("ลายเซ็น")} className="h-12 object-contain" />
              <div className="flex-1">
                <p className="text-xs text-[var(--c-ok)] font-semibold">{tr("✅ ลงลายเซ็นแล้ว")}</p>
              </div>
              <button
                type="button"
                onClick={() => setSignature(null)}
                className="text-xs text-[var(--c-ink-3)] hover:text-[var(--c-danger)] transition"
              >{tr("เปลี่ยน")}</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSigPad(true)}
              className="w-full py-3 border-2 border-dashed border-[var(--c-line)] rounded-xl text-sm
                         text-[var(--c-ink-3)] hover:border-[var(--c-accent)]/40 hover:text-[var(--c-accent)] transition"
            >{tr("✍️ กดเพื่อลงลายเซ็น")}</button>
          )}
        </div>
      )}

      {/* Agreement checkbox */}
      <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--c-ink-2)]">
        <input
          type="checkbox" checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="w-4 h-4 accent-[var(--c-accent)]"
        />{tr("ข้าพเจ้ายืนยันว่าข้อมูลข้างต้นถูกต้องและเป็นความจริง")}</label>

      {error && (
        <div className="bg-[var(--c-danger-soft)] text-[var(--c-danger)] text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      <button
        onClick={handleConfirm}
        disabled={isPending || !agreed || (needsSignature && !signature)}
        className="w-full py-3 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl
                   hover:bg-[var(--c-accent-str)] transition disabled:opacity-50"
      >
        {isPending ? tr("กำลังยืนยัน...") : tr("✅ ยืนยัน{0}", [type === "pickup" ? tr("การรับของ") : tr("การคืนของ")])}
      </button>
    </div>
  );
}
