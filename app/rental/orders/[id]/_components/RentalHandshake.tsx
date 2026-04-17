"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRentalPickup, confirmRentalReturn } from "@/lib/actions/rental-transitions";
import SignatureCapture from "@/components/rental/SignatureCapture";

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
  { value: "SAME",         label: "สภาพเดิม ✅",       color: "bg-green-50 border-green-300 text-green-700" },
  { value: "MINOR_DAMAGE", label: "เสียหายเล็กน้อย ⚠️", color: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  { value: "MAJOR_DAMAGE", label: "เสียหายมาก 🔴",      color: "bg-red-50 border-red-300 text-red-700" },
  { value: "LOST",         label: "สูญหาย ❌",          color: "bg-red-100 border-red-500 text-red-800" },
];

function buildPickupAgreement(itemTitle: string, rentalDays: number, deposit: number, lateFee: number) {
  return [
    `ยอมรับว่าได้รับสินค้า "${itemTitle}" เรียบร้อยแล้ว ในสภาพที่ตรงตามรูปถ่ายหลักฐาน`,
    ``,
    `ข้าพเจ้าตกลงดังนี้:`,
    `• เช่าเป็นระยะเวลา ${rentalDays} วัน`,
    `• วางมัดจำ ฿${deposit.toLocaleString()} ไว้ในระบบ Escrow`,
    `• หากสินค้าชำรุดหรือเสียหาย ยินยอมให้หักค่าเสียหายจากเงินมัดจำ`,
    `• หากสินค้าสูญหาย ยินยอมให้ริบเงินมัดจำทั้งจำนวน`,
    lateFee > 0 ? `• หากคืนล่าช้า จะถูกคิดค่าปรับ ฿${lateFee.toLocaleString()}/วัน` : `• ไม่มีค่าปรับคืนล่าช้า`,
    `• ข้อตกลงนี้มีผลผูกพันตามประมวลกฎหมายแพ่งและพาณิชย์ ว่าด้วยการเช่าทรัพย์ มาตรา 537–571`,
  ].join("\n");
}

function buildReturnAgreement(itemTitle: string, condition: string, damageFee: number) {
  const conditionLabel: Record<string, string> = {
    SAME: "สภาพเดิม — ไม่มีความเสียหาย",
    MINOR_DAMAGE: "เสียหายเล็กน้อย",
    MAJOR_DAMAGE: "เสียหายมาก",
    LOST: "สูญหาย",
  };
  return [
    `ยอมรับว่าได้รับสินค้า "${itemTitle}" คืนเรียบร้อยแล้ว`,
    ``,
    `สภาพสินค้า: ${conditionLabel[condition] ?? condition}`,
    damageFee > 0
      ? `ค่าเสียหาย: ฿${damageFee.toLocaleString()} (จะถูกหักจากเงินมัดจำ)`
      : `ไม่มีค่าเสียหาย (มัดจำคืนเต็มจำนวน)`,
    ``,
    `ข้าพเจ้ายืนยันว่าได้ตรวจสอบสภาพสินค้าแล้ว และยอมรับการประเมินข้างต้น`,
    `การชำระเงินจะดำเนินการโดยอัตโนมัติหลังจากทั้งสองฝ่ายยืนยัน`,
  ].join("\n");
}

export default function RentalHandshake({
  orderId, type, role, myConfirmed, otherConfirmed,
  itemTitle = "สินค้า", rentalDays = 1, securityDeposit = 0, lateFeePerDay = 0, userName = "—",
}: Props) {
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
    ? buildPickupAgreement(itemTitle, rentalDays, securityDeposit, lateFeePerDay)
    : buildReturnAgreement(itemTitle, condition, damageFee);

  const title     = type === "pickup" ? "📦 ยืนยันการรับของ (Digital Handshake #1)" : "🔄 ยืนยันการคืนของ (Digital Handshake #2)";
  const meLabel   = isRenter ? "ผู้เช่า" : "เจ้าของ";
  const otherLabel = isRenter ? "เจ้าของ" : "ผู้เช่า";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
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
    if (!agreed) { setError("กรุณายืนยันว่าข้อมูลถูกต้อง"); return; }
    if (needsSignature && !signature) { setError("กรุณาลงลายเซ็นดิจิทัลก่อน"); return; }
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
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
        <h3 className="text-sm font-bold text-[#111] mb-2">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
          <span>✅</span>
          <span>คุณยืนยันแล้ว{otherConfirmed ? "" : ` — รอ${otherLabel}ยืนยัน`}</span>
        </div>
        {!otherConfirmed && (
          <p className="text-xs text-[#999] mt-2">เมื่อ{otherLabel}ยืนยันด้วย สถานะจะเปลี่ยนอัตโนมัติ</p>
        )}
      </div>
    );
  }

  // Signature pad overlay
  if (showSigPad) {
    return (
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
        <h3 className="text-sm font-bold text-[#111] mb-4">✍️ ลงลายเซ็นดิจิทัล</h3>
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
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
      {/* Title + party status */}
      <div>
        <h3 className="text-sm font-bold text-[#111]">{title}</h3>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={`px-2 py-1 rounded-full border ${
            myConfirmed ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"
          }`}>
            {meLabel}: {myConfirmed ? "✅ ยืนยันแล้ว" : "⏳ รอยืนยัน"}
          </span>
          <span className={`px-2 py-1 rounded-full border ${
            otherConfirmed ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"
          }`}>
            {otherLabel}: {otherConfirmed ? "✅ ยืนยันแล้ว" : "⏳ รอยืนยัน"}
          </span>
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-2">
          📷 ถ่ายรูปสภาพสินค้า {type === "pickup" ? "(ก่อนรับ)" : "(หลังคืน)"}
        </p>
        <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-[#e5e3de]
                          rounded-xl cursor-pointer hover:border-[#e8500a]/50 transition">
          <span className="text-xl">📷</span>
          <span className="text-sm text-[#777]">
            {uploading ? "กำลังอัปโหลด..." : "เลือกรูปภาพ (หลายรูปได้)"}
          </span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </label>
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#e5e3de]" />
            ))}
          </div>
        )}
      </div>

      {/* Condition rating — return, owner only */}
      {isReturn && isOwner && (
        <div>
          <p className="text-xs font-semibold text-[#555] mb-2">สภาพสินค้าหลังคืน</p>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                  condition === c.value ? c.color : "border-[#e5e3de] text-[#555]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {["MINOR_DAMAGE", "MAJOR_DAMAGE"].includes(condition) && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-[#555]">ค่าเสียหาย (฿)</p>
              <input
                type="number" min={0} value={damageFee}
                onChange={(e) => setDamageFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#e5e3de] rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-1.5">หมายเหตุ (ไม่บังคับ)</p>
        <textarea
          value={conditionNote}
          onChange={(e) => setConditionNote(e.target.value)}
          rows={2}
          placeholder="เช่น สภาพดี, มีรอยขีดข่วนเล็กน้อย..."
          className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                     focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
        />
      </div>

      {/* Digital Signature — renter at pickup, owner at return */}
      {needsSignature && (
        <div>
          <p className="text-xs font-semibold text-[#555] mb-2">✍️ ลายเซ็นดิจิทัล (จำเป็น)</p>
          {signature ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt="ลายเซ็น" className="h-12 object-contain" />
              <div className="flex-1">
                <p className="text-xs text-green-700 font-semibold">✅ ลงลายเซ็นแล้ว</p>
              </div>
              <button
                type="button"
                onClick={() => setSignature(null)}
                className="text-xs text-[#777] hover:text-red-600 transition"
              >
                เปลี่ยน
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSigPad(true)}
              className="w-full py-3 border-2 border-dashed border-[#e5e3de] rounded-xl text-sm
                         text-[#777] hover:border-[#e8500a]/40 hover:text-[#e8500a] transition"
            >
              ✍️ กดเพื่อลงลายเซ็น
            </button>
          )}
        </div>
      )}

      {/* Agreement checkbox */}
      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#555]">
        <input
          type="checkbox" checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="w-4 h-4 accent-[#e8500a]"
        />
        ข้าพเจ้ายืนยันว่าข้อมูลข้างต้นถูกต้องและเป็นความจริง
      </label>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      <button
        onClick={handleConfirm}
        disabled={isPending || !agreed || (needsSignature && !signature)}
        className="w-full py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                   hover:bg-[#c94208] transition disabled:opacity-50"
      >
        {isPending ? "กำลังยืนยัน..." : `✅ ยืนยัน${type === "pickup" ? "การรับของ" : "การคืนของ"}`}
      </button>
    </div>
  );
}
