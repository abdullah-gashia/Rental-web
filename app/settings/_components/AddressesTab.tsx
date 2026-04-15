"use client";

import { useState, useTransition } from "react";
import { createSavedAddress, updateSavedAddress } from "../actions";
import { deleteSavedAddress, setDefaultAddress } from "@/lib/actions/saved-addresses";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  id:            string;
  label:         string;
  recipientName: string;
  phone:         string;
  addressLine1:  string;
  addressLine2:  string | null;
  district:      string;
  province:      string;
  postalCode:    string;
  note:          string | null;
  isDefault:     boolean;
}

interface Props {
  addresses: Address[];
  showToast: (ok: boolean, msg: string) => void;
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = {
  label: "บ้าน",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  district: "",
  province: "",
  postalCode: "",
  note: "",
  isDefault: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressesTab({ addresses, showToast }: Props) {
  const [list, setList] = useState(addresses);
  const [editing, setEditing] = useState<string | null>(null); // address id or "new"
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const startNew = () => {
    if (list.length >= 5) {
      showToast(false, "คุณมีที่อยู่ครบ 5 รายการแล้ว กรุณาลบที่อยู่เดิมก่อนเพิ่มใหม่");
      return;
    }
    setForm(emptyForm);
    setEditing("new");
  };

  const startEdit = (addr: Address) => {
    setForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? "",
      district: addr.district,
      province: addr.province,
      postalCode: addr.postalCode,
      note: addr.note ?? "",
      isDefault: addr.isDefault,
    });
    setEditing(addr.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        ...form,
        addressLine2: form.addressLine2 || undefined,
        note: form.note || undefined,
      };

      let res;
      if (editing === "new") {
        res = await createSavedAddress(payload);
      } else {
        res = await updateSavedAddress(editing!, payload);
      }
      showToast(res.success, res.success ? res.message : res.error);
      if (res.success) setEditing(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteSavedAddress(id);
      if (res.error) {
        showToast(false, res.error);
      } else {
        showToast(true, "ลบที่อยู่เรียบร้อยแล้ว");
        setList((prev) => prev.filter((a) => a.id !== id));
      }
    });
  };

  const handleSetDefault = (id: string) => {
    startTransition(async () => {
      const res = await setDefaultAddress(id);
      if (res.error) {
        showToast(false, res.error);
      } else {
        showToast(true, "ตั้งเป็นค่าเริ่มต้นเรียบร้อยแล้ว");
        setList((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === id }))
        );
      }
    });
  };

  const updateField = (key: string, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111] flex items-center gap-2">
          <span>📍</span> ที่อยู่จัดส่ง
        </h2>
        <span className="text-xs text-[#9a9590]">
          {list.length}/5 ที่อยู่
        </span>
      </div>

      {/* Address cards */}
      {list.length === 0 && !editing && (
        <div className="py-12 text-center text-[#aaa] text-sm">
          <p className="text-3xl mb-2">📍</p>
          <p>ยังไม่มีที่อยู่จัดส่ง</p>
          <p className="text-xs mt-1">เพิ่มที่อยู่เพื่อใช้ในการสั่งซื้อ</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map((addr) => (
          <div
            key={addr.id}
            className={`p-4 rounded-xl border transition ${
              addr.isDefault
                ? "border-[#e8500a]/30 bg-orange-50/30"
                : "border-[#e5e3de] bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-[#111]">
                    🏠 {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="inline-flex items-center rounded-full border border-[#e8500a]/30 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#e8500a]">
                      ⭐ ค่าเริ่มต้น
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#333] font-medium">{addr.recipientName}</p>
                <p className="text-xs text-[#777]">{addr.phone}</p>
                <p className="text-xs text-[#777] mt-1">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                </p>
                <p className="text-xs text-[#777]">
                  อ.{addr.district} จ.{addr.province} {addr.postalCode}
                </p>
                {addr.note && (
                  <p className="text-[11px] text-[#9a9590] mt-1">📝 {addr.note}</p>
                )}
              </div>
            </div>

            {/* Card actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f0ede7]">
              <button
                onClick={() => startEdit(addr)}
                disabled={pending}
                className="text-xs text-[#555] hover:text-[#e8500a] transition flex items-center gap-1 disabled:opacity-50"
              >
                ✏️ แก้ไข
              </button>
              <span className="text-[#e5e3de]">|</span>
              <button
                onClick={() => handleDelete(addr.id)}
                disabled={pending}
                className="text-xs text-[#555] hover:text-red-600 transition flex items-center gap-1 disabled:opacity-50"
              >
                🗑️ ลบ
              </button>
              {!addr.isDefault && (
                <>
                  <span className="text-[#e5e3de]">|</span>
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={pending}
                    className="text-xs text-[#555] hover:text-[#e8500a] transition flex items-center gap-1 disabled:opacity-50"
                  >
                    ⭐ ตั้งเป็นค่าเริ่มต้น
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {editing ? (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-[#e5e3de] bg-[#faf9f7] space-y-3">
          <h3 className="text-sm font-semibold text-[#333]">
            {editing === "new" ? "➕ เพิ่มที่อยู่ใหม่" : "✏️ แก้ไขที่อยู่"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="ชื่อที่อยู่" value={form.label} onChange={(v) => updateField("label", v)} placeholder="เช่น บ้าน, หอพัก" required />
            <FormField label="ชื่อผู้รับ" value={form.recipientName} onChange={(v) => updateField("recipientName", v)} placeholder="ชื่อ-นามสกุลผู้รับ" required />
            <FormField label="เบอร์โทร" value={form.phone} onChange={(v) => updateField("phone", v.replace(/\D/g, "").slice(0, 10))} placeholder="0812345678" required />
            <FormField label="ที่อยู่บรรทัด 1" value={form.addressLine1} onChange={(v) => updateField("addressLine1", v)} placeholder="บ้านเลขที่ ซอย ถนน" required />
            <FormField label="ที่อยู่บรรทัด 2" value={form.addressLine2} onChange={(v) => updateField("addressLine2", v)} placeholder="(ไม่บังคับ)" />
            <FormField label="อำเภอ/เขต" value={form.district} onChange={(v) => updateField("district", v)} placeholder="หาดใหญ่" required />
            <FormField label="จังหวัด" value={form.province} onChange={(v) => updateField("province", v)} placeholder="สงขลา" required />
            <FormField label="รหัสไปรษณีย์" value={form.postalCode} onChange={(v) => updateField("postalCode", v.replace(/\D/g, "").slice(0, 5))} placeholder="90110" required />
          </div>

          <FormField label="หมายเหตุ" value={form.note} onChange={(v) => updateField("note", v)} placeholder="เช่น วางไว้หน้าห้อง" />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={pending}
              className="px-4 py-2 text-sm text-[#555] hover:text-[#333] transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 bg-[#e8500a] hover:bg-[#c94208] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
            >
              {pending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing === "new" ? "เพิ่มที่อยู่" : "บันทึก"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={startNew}
          disabled={list.length >= 5}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[#e5e3de] text-sm font-medium text-[#777] hover:border-[#e8500a] hover:text-[#e8500a] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + เพิ่มที่อยู่ใหม่
        </button>
      )}
    </div>
  );
}

// ─── Reusable form field ──────────────────────────────────────────────────────

function FormField({
  label, value, onChange, placeholder, required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#555] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] bg-white text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
      />
    </div>
  );
}
