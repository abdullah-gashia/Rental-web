"use client";

import { useState, useTransition } from "react";
import Image                        from "next/image";
import type { ItemRow }             from "../../_lib/types";
import { formatThaiDate, formatCurrency } from "../../_lib/utils";
import StatusBadge                  from "../../_components/StatusBadge";
import ConfirmDialog                from "../../_components/ConfirmDialog";
import { approveItem, rejectItem, forceDeleteItem } from "../actions";
import { addToFeatured, removeFromFeatured }          from "@/lib/actions/featured";

interface Props {
  rows: ItemRow[];
}

export default function ItemsTable({ rows }: Props) {
  const [pending, startTransition] = useTransition();

  type DialogKind = "approve" | "reject" | "delete";
  const [dialog, setDialog] = useState<{
    kind:   DialogKind;
    itemId: string;
    label:  string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function handleConfirm() {
    if (!dialog) return;
    startTransition(async () => {
      let res;
      if (dialog.kind === "approve") {
        res = await approveItem(dialog.itemId);
      } else if (dialog.kind === "reject") {
        if (!rejectReason.trim()) return;
        res = await rejectItem(dialog.itemId, rejectReason.trim());
      } else {
        res = await forceDeleteItem(dialog.itemId);
      }
      setDialog(null);
      setRejectReason("");
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-[#aaa] text-sm">ไม่พบสินค้า</div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[600] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!dialog}
        title={
          dialog?.kind === "approve" ? "อนุมัติสินค้านี้?" :
          dialog?.kind === "reject"  ? "ปฏิเสธสินค้านี้?" :
          "ลบสินค้านี้?"
        }
        description={
          dialog?.kind === "approve"
            ? `"${dialog?.label}" จะเปลี่ยนสถานะเป็น อนุมัติแล้ว`
            : dialog?.kind === "reject"
            ? `"${dialog?.label}" จะถูกปฏิเสธ กรุณาระบุเหตุผล`
            : `"${dialog?.label}" จะถูกลบออกจากระบบ`
        }
        confirmLabel={
          dialog?.kind === "approve" ? "อนุมัติ" :
          dialog?.kind === "reject"  ? "ปฏิเสธ"  :
          "ลบ"
        }
        danger={dialog?.kind === "reject" || dialog?.kind === "delete"}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => { setDialog(null); setRejectReason(""); }}
      >
        {dialog?.kind === "reject" && (
          <textarea
            className="w-full border border-[#e5e3de] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a]"
            placeholder="เหตุผลในการปฏิเสธ..."
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        )}
      </ConfirmDialog>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e3de] bg-[#faf9f7]">
              <th className="text-left px-4 py-3 font-semibold text-[#555] w-[280px]">สินค้า</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">ผู้ขาย</th>
              <th className="text-right px-4 py-3 font-semibold text-[#555]">ราคา</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">ประเภท</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">สถานะ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">โพสต์เมื่อ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede7]">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-[#faf9f7] transition">
                {/* Item */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.thumbnailUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#f0ede7]">
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#f0ede7] flex items-center justify-center text-lg flex-shrink-0">
                        📦
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[#111] truncate max-w-[200px]">{item.title}</p>
                      {item.category && (
                        <p className="text-xs text-[#9a9590]">{item.category}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Seller */}
                <td className="px-4 py-3">
                  <p className="text-[#333] truncate max-w-[140px]">{item.seller.name ?? "—"}</p>
                  <p className="text-xs text-[#9a9590] truncate max-w-[140px]">{item.seller.email}</p>
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right font-medium text-[#333] whitespace-nowrap">
                  {formatCurrency(item.price)}
                </td>

                {/* Type */}
                <td className="px-4 py-3 text-[#555]">
                  {item.listingType === "SELL" ? "ขาย" : "เช่า"}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={item.status} type="item" />
                    {item.isTrending && (
                      <span className="inline-flex items-center text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">
                        🔥 มาแรง
                      </span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-[#777] whitespace-nowrap">
                  {formatThaiDate(item.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <ItemActionsDropdown
                    item={item}
                    onApprove={() => setDialog({ kind: "approve", itemId: item.id, label: item.title })}
                    onReject={() => setDialog({ kind: "reject",  itemId: item.id, label: item.title })}
                    onDelete={() => setDialog({ kind: "delete",  itemId: item.id, label: item.title })}
                    onTrendingToggle={() => {
                      startTransition(async () => {
                        const res = item.isTrending && item.featuredTrendingId
                          ? await removeFromFeatured(item.featuredTrendingId)
                          : await addToFeatured({ itemId: item.id, section: "trending" });
                        showToast(res.success, res.success ? res.message : res.error);
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Actions dropdown ─────────────────────────────────────────────────────────

function ItemActionsDropdown({
  item, onApprove, onReject, onDelete, onTrendingToggle,
}: {
  item:      ItemRow;
  onApprove: () => void;
  onReject:  () => void;
  onDelete:  () => void;
  onTrendingToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isPending = item.status === "PENDING";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ede7] transition text-[#555]"
        aria-label="เมนูการจัดการ"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-40 bg-white rounded-xl border border-[#e5e3de] shadow-lg py-1">
            {isPending && (
              <>
                <button
                  onClick={() => { setOpen(false); onApprove(); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-green-700 transition"
                >
                  ✅ อนุมัติ
                </button>
                <button
                  onClick={() => { setOpen(false); onReject(); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-red-600 transition"
                >
                  ❌ ปฏิเสธ
                </button>
                <div className="my-1 border-t border-[#f0ede7]" />
              </>
            )}
            <a
              href={`/admin/items/${item.id}`}
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-[#333] transition"
            >
              🔗 ดูสินค้า
            </a>
            {/* Trending toggle */}
            {item.status === "APPROVED" && (
              <button
                onClick={() => { setOpen(false); onTrendingToggle(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-orange-600 transition"
              >
                {item.isTrending ? "🔥 ลบออกจากมาแรง" : "🔥 ตั้งเป็นสินค้ามาแรง"}
              </button>
            )}
            {item.status !== "REMOVED" && (
              <button
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-red-600 transition"
              >
                🗑 ลบสินค้า
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
