"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import ReasonDialog from "./ReasonDialog";
import DeleteDialog from "./DeleteDialog";
import {
  approveItemDetail,
  rejectItemDetail,
  suspendItemDetail,
  unsuspendItemDetail,
  reapproveItemDetail,
  deleteItemDetail,
} from "../actions";
import { addToFeatured, removeFromFeatured } from "@/lib/actions/featured";

interface Props {
  item: {
    id: string;
    title: string;
    status: string;
    trending: { featuredId: string; position: number; addedAt: string } | null;
  };
}

export default function AdminActionPanel({ item }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Trending state (optimistic)
  const [trending, setTrending] = useState(item.trending);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveItemDetail(item.id);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  function handleReapprove() {
    startTransition(async () => {
      const res = await reapproveItemDetail(item.id);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  function handleUnsuspend() {
    startTransition(async () => {
      const res = await unsuspendItemDetail(item.id);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  function handleReject(reason: string) {
    startTransition(async () => {
      const res = await rejectItemDetail(item.id, reason);
      setRejectOpen(false);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  function handleSuspend(reason: string) {
    startTransition(async () => {
      const res = await suspendItemDetail(item.id, reason);
      setSuspendOpen(false);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  function handleDelete(reason: string) {
    startTransition(async () => {
      const res = await deleteItemDetail(item.id, reason);
      if (res) {
        setDeleteOpen(false);
        showToast(res.success, res.success ? res.message : res.error);
      }
      // If redirect happened, this code won't execute
    });
  }

  const isRemoved = item.status === "REMOVED";

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

      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-4">{tr("การจัดการ")}</h3>

        {/* Removed banner */}
        {isRemoved && (
          <div className="mb-4 bg-[var(--c-line-soft)] border border-[var(--c-line-str)] rounded-xl px-3 py-2.5 text-sm text-[var(--c-ink-3)] text-center font-medium">{tr("🗑️ สินค้านี้ถูกลบแล้ว")}</div>
        )}

        <div className="space-y-2.5">
          {/* ── Approve (PENDING) ── */}
          {item.status === "PENDING" && (
            <button
              onClick={handleApprove}
              disabled={pending}
              className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium
                         hover:bg-green-700 transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >
              {pending ? <Spinner /> : "✅"} อนุมัติสินค้า
            </button>
          )}

          {/* ── Reject (PENDING) ── */}
          {item.status === "PENDING" && (
            <button
              onClick={() => setRejectOpen(true)}
              disabled={pending}
              className="w-full px-4 py-2.5 border border-[var(--c-danger-line)] text-[var(--c-danger)] rounded-xl font-medium
                         hover:bg-[var(--c-danger-soft)] transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >{tr("❌ ปฏิเสธสินค้า")}</button>
          )}

          {/* ── Suspend (APPROVED / ACTIVE) ── */}
          {(item.status === "APPROVED" || item.status === "ACTIVE") && (
            <button
              onClick={() => setSuspendOpen(true)}
              disabled={pending}
              className="w-full px-4 py-2.5 border border-amber-300 text-[var(--c-warn)] rounded-xl font-medium
                         hover:bg-[var(--c-warn-soft)] transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >{tr("⚠️ ระงับการขาย")}</button>
          )}

          {/* ── Unsuspend (UNAVAILABLE) ── */}
          {item.status === "UNAVAILABLE" && (
            <button
              onClick={handleUnsuspend}
              disabled={pending}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium
                         hover:bg-blue-700 transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >
              {pending ? <Spinner /> : "🔓"} ปลดระงับ
            </button>
          )}

          {/* ── Re-approve (REJECTED) ── */}
          {item.status === "REJECTED" && (
            <button
              onClick={handleReapprove}
              disabled={pending}
              className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium
                         hover:bg-green-700 transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >
              {pending ? <Spinner /> : "✅"} อนุมัติใหม่
            </button>
          )}

          {/* ── Trending Toggle ── */}
          <div className="border-t border-[var(--c-line-soft)] my-2" />
          {trending ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--c-ink-2)] bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-3 py-2.5">
                <div>
                  <p className="font-semibold text-[var(--c-warn)]">{tr("🔥 อยู่ในรายการมาแรง")}</p>
                  <p className="text-[var(--c-warn)] mt-0.5">ตำแหน่ง #{trending.position}</p>
                </div>
                <button
                  onClick={() => startTransition(async () => {
                    const res = await removeFromFeatured(trending.featuredId);
                    if (res.success) { setTrending(null); showToast(true, res.message); }
                    else showToast(false, res.error);
                  })}
                  disabled={pending}
                  className="text-xs text-[var(--c-danger)] hover:text-[var(--c-danger)] font-medium disabled:opacity-40"
                >{tr("ลบออก")}</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => startTransition(async () => {
                const res = await addToFeatured({ itemId: item.id, section: "trending" });
                if (res.success) {
                  showToast(true, res.message);
                  // Refresh to get the new featuredId — simple page reload
                  window.location.reload();
                } else {
                  showToast(false, res.error);
                }
              })}
              disabled={pending || item.status !== "APPROVED"}
              title={item.status !== "APPROVED" ? tr("สินค้าต้องได้รับการอนุมัติก่อน") : undefined}
              className="w-full px-4 py-2.5 border border-orange-300 text-[var(--c-warn)] rounded-xl font-medium
                         hover:bg-[var(--c-warn-soft)] transition-colors flex items-center justify-center gap-2
                         disabled:opacity-40 text-sm"
            >{tr("🔥 เพิ่มเป็นสินค้ามาแรง")}</button>
          )}

          {/* ── Delete (always, unless already removed) ── */}
          {!isRemoved && (
            <>
              <div className="border-t border-[var(--c-line-soft)] my-2" />
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={pending}
                className="w-full px-4 py-2.5 border border-[var(--c-danger-line)] text-[var(--c-danger)] rounded-xl font-medium
                           hover:bg-[var(--c-danger-soft)] transition-colors flex items-center justify-center gap-2
                           disabled:opacity-50 text-sm"
              >{tr("🗑️ ลบสินค้าถาวร")}</button>
            </>
          )}

          {/* ── View public page ── */}
          <a
            href={`/items/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2.5 border border-[var(--c-line)] text-[var(--c-ink-2)] rounded-xl
                       hover:bg-[var(--c-subtle)] transition-colors flex items-center justify-center gap-2 text-xs font-medium"
          >{tr("🔗 ดูหน้าสินค้าจริง (เปิดแท็บใหม่)")}</a>
        </div>
      </div>

      {/* ── Dialogs ── */}

      <ReasonDialog
        open={rejectOpen}
        title={`❌ ปฏิเสธสินค้า "${item.title}"`}
        confirmLabel={tr("ยืนยันปฏิเสธ")}
        danger
        loading={pending}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />

      <ReasonDialog
        open={suspendOpen}
        title={`⚠️ ระงับสินค้า "${item.title}"`}
        confirmLabel={tr("ยืนยันระงับ")}
        loading={pending}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendOpen(false)}
      />

      <DeleteDialog
        open={deleteOpen}
        itemTitle={item.title}
        loading={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}
