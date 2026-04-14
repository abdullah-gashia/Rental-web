"use client";

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

interface Props {
  item: {
    id: string;
    title: string;
    status: string;
  };
}

export default function AdminActionPanel({ item }: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

      <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
        <h3 className="text-sm font-semibold text-[#555] mb-4">การจัดการ</h3>

        {/* Removed banner */}
        {isRemoved && (
          <div className="mb-4 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-600 text-center font-medium">
            🗑️ สินค้านี้ถูกลบแล้ว
          </div>
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
              className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-xl font-medium
                         hover:bg-red-50 transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >
              ❌ ปฏิเสธสินค้า
            </button>
          )}

          {/* ── Suspend (APPROVED / ACTIVE) ── */}
          {(item.status === "APPROVED" || item.status === "ACTIVE") && (
            <button
              onClick={() => setSuspendOpen(true)}
              disabled={pending}
              className="w-full px-4 py-2.5 border border-amber-300 text-amber-700 rounded-xl font-medium
                         hover:bg-amber-50 transition-colors flex items-center justify-center gap-2
                         disabled:opacity-50 text-sm"
            >
              ⚠️ ระงับการขาย
            </button>
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

          {/* ── Delete (always, unless already removed) ── */}
          {!isRemoved && (
            <>
              <div className="border-t border-[#f0ede7] my-2" />
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={pending}
                className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-xl font-medium
                           hover:bg-red-50 transition-colors flex items-center justify-center gap-2
                           disabled:opacity-50 text-sm"
              >
                🗑️ ลบสินค้าถาวร
              </button>
            </>
          )}

          {/* ── View public page ── */}
          <a
            href={`/items/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2.5 border border-[#e5e3de] text-[#555] rounded-xl
                       hover:bg-[#faf9f7] transition-colors flex items-center justify-center gap-2 text-xs font-medium"
          >
            🔗 ดูหน้าสินค้าจริง (เปิดแท็บใหม่)
          </a>
        </div>
      </div>

      {/* ── Dialogs ── */}

      <ReasonDialog
        open={rejectOpen}
        title={`❌ ปฏิเสธสินค้า "${item.title}"`}
        confirmLabel="ยืนยันปฏิเสธ"
        danger
        loading={pending}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />

      <ReasonDialog
        open={suspendOpen}
        title={`⚠️ ระงับสินค้า "${item.title}"`}
        confirmLabel="ยืนยันระงับ"
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
