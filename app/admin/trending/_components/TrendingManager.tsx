"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import type { AdminFeaturedItem, ItemSearchResult } from "@/lib/actions/featured";
import {
  removeFromFeatured,
  reorderFeatured,
  addToFeatured,
  updateFeaturedLabel,
  searchAvailableItems,
} from "@/lib/actions/featured";

interface Props {
  initialItems: AdminFeaturedItem[];
}

export default function TrendingManager({ initialItems }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [items, setItems]           = useState<AdminFeaturedItem[]>(initialItems);
  const [pending, startTransition]  = useTransition();
  const [toast, setToast]           = useState<{ ok: boolean; msg: string } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<ItemSearchResult[]>([]);
  const [searching, setSearching]         = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchAvailableItems(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ── Add item ────────────────────────────────────────────────────────────

  function handleAdd(itemId: string) {
    startTransition(async () => {
      const res = await addToFeatured({ itemId, section: "trending" });
      showToast(res.success, res.success ? res.message : res.error);
      if (res.success) {
        // Refetch
        const { getAdminFeaturedItems } = await import("@/lib/actions/featured");
        const updated = await getAdminFeaturedItems("trending");
        setItems(updated);
        setSearchResults((prev) => prev.filter((r) => r.id !== itemId));
      }
    });
  }

  // ── Remove item ─────────────────────────────────────────────────────────

  function handleRemove(featuredId: string) {
    startTransition(async () => {
      const res = await removeFromFeatured(featuredId);
      showToast(res.success, res.success ? res.message : res.error);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== featuredId));
      }
    });
  }

  // ── Update label ────────────────────────────────────────────────────────

  function handleLabelUpdate(featuredId: string, label: string) {
    startTransition(async () => {
      const res = await updateFeaturedLabel(featuredId, label.trim() || null);
      if (res.success) {
        setItems((prev) => prev.map((i) =>
          i.id === featuredId ? { ...i, customLabel: label.trim() || null } : i
        ));
      }
    });
  }

  // ── Drag & Drop (native HTML) ───────────────────────────────────────────

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, overIdx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === overIdx) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
    setDragIdx(overIdx);
  }

  function handleDragEnd() {
    if (dragIdx === null) return;
    setDragIdx(null);

    // Save new order
    startTransition(async () => {
      const orderedIds = items.map((i) => i.id);
      const res = await reorderFeatured("trending", orderedIds);
      if (!res.success) showToast(false, res.error);
    });
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[600] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.ok ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Current Featured List ──────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--c-ink-1)] flex items-center gap-2">{tr("📋 รายการมาแรงปัจจุบัน")}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                items.length >= 10
                  ? "bg-[var(--c-danger-soft)] text-[var(--c-danger)]"
                  : "bg-[var(--c-line-soft)] text-[var(--c-ink-2)]"
              }`}>{tr("{0}/10 รายการ", [items.length])}</span>
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center text-[var(--c-faint)]">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-sm">{tr("ยังไม่มีสินค้ามาแรง")}</p>
                <p className="text-xs text-[var(--c-faint-2)] mt-1">{tr("ค้นหาและเพิ่มสินค้าด้านล่าง")}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((fi, idx) => (
                  <FeaturedRow
                    key={fi.id}
                    item={fi}
                    index={idx}
                    onRemove={() => handleRemove(fi.id)}
                    onLabelUpdate={(label) => handleLabelUpdate(fi.id, label)}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    isDragging={dragIdx === idx}
                    pending={pending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Search & Add Items ─────────────────────────────────────── */}
          <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
            <h2 className="text-sm font-bold text-[var(--c-ink-1)] flex items-center gap-2 mb-3">{tr("➕ เพิ่มสินค้าเข้ารายการมาแรง")}</h2>

            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={tr("ค้นหาสินค้าเพื่อเพิ่ม...")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm
                           focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="w-4 h-4 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin inline-block" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--c-faint)] mb-3">{tr("แสดงเฉพาะสินค้าที่สถานะ \"อนุมัติแล้ว\" และยังไม่ได้อยู่ในรายการมาแรง")}</p>

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-[360px] overflow-y-auto">
                {searchResults.map((item) => (
                  <SearchResultRow
                    key={item.id}
                    item={item}
                    onAdd={() => handleAdd(item.id)}
                    disabled={pending || items.length >= 10}
                  />
                ))}
              </div>
            )}

            {searchQuery.trim().length > 0 && searchResults.length === 0 && !searching && (
              <div className="py-6 text-center text-[var(--c-faint)] text-sm">{tr("ไม่พบสินค้าที่ตรงกัน")}</div>
            )}
          </div>
        </div>

        {/* ── Right: Live Preview ──────────────────────────────────────── */}
        <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
          <h2 className="text-sm font-bold text-[var(--c-ink-1)] flex items-center gap-2 mb-4">{tr("👁️ ตัวอย่างหน้าจริง")}</h2>

          {/* Preview header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-bold tracking-tight text-[var(--c-ink)]">{tr("กำลังมาแรงในขณะนี้")}</h3>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-accent)]">
              <span className="w-2 h-2 bg-[var(--c-accent)] rounded-full animate-pulse" />
              Live
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-[var(--c-subtle)] rounded-xl border border-dashed border-[#d5d2cc]">
              <p className="text-sm text-[var(--c-faint)]">{tr("เพิ่มสินค้าเพื่อดูตัวอย่าง")}</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
              {items.map((fi) => {
                const img = fi.item.images[0];
                return (
                  <div
                    key={fi.id}
                    className="relative flex-shrink-0 w-[160px] h-[220px] rounded-xl overflow-hidden snap-start bg-[var(--c-line-soft)]"
                  >
                    {img ? (
                      <Image src={img.url} alt={fi.item.title} fill className="object-contain" sizes="160px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--c-line-soft)]">
                        <span className="text-3xl">📦</span>
                      </div>
                    )}

                    {/* Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-0.5 bg-[var(--c-accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        🔥 {fi.customLabel ?? tr("มาแรง")}
                      </span>
                    </div>

                    {/* Bottom overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                        {fi.item.title}
                      </p>
                      <p className="text-white/90 text-xs font-bold mt-0.5">
                        ฿{fi.item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Featured Row (draggable) ─────────────────────────────────────────────────

function FeaturedRow({
  item, index, onRemove, onLabelUpdate, onDragStart, onDragOver, onDragEnd, isDragging, pending,
}: {
  item:          AdminFeaturedItem;
  index:         number;
  onRemove:      () => void;
  onLabelUpdate: (label: string) => void;
  onDragStart:   () => void;
  onDragOver:    (e: React.DragEvent) => void;
  onDragEnd:     () => void;
  isDragging:    boolean;
  pending:       boolean;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal]         = useState(item.customLabel ?? "");
  const img = item.item.images[0];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? "border-[var(--c-accent)] bg-[var(--c-accent)]/5 shadow-md scale-[1.02]"
          : "border-transparent hover:bg-[var(--c-subtle)]"
      }`}
    >
      {/* Drag handle */}
      <div className="text-[var(--c-faint-2)] flex-shrink-0 cursor-grab">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </div>

      {/* Position */}
      <span className="text-xs font-bold text-[var(--c-faint)] w-5 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Image */}
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--c-line-soft)]">
        {img ? (
          <Image src={img.url} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-ink)] truncate">{item.item.title}</p>
        <p className="text-xs text-[var(--c-muted)]">
          ฿{item.item.price.toLocaleString()} — {item.item.seller.name ?? "—"}
        </p>
      </div>

      {/* Label editor */}
      {editingLabel ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={labelVal}
            onChange={(e) => setLabelVal(e.target.value.slice(0, 50))}
            className="w-24 px-2 py-1 text-xs border border-[var(--c-line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--c-accent)]"
            placeholder={tr("เช่น ขายดีสุด")}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onLabelUpdate(labelVal);
                setEditingLabel(false);
              }
              if (e.key === "Escape") setEditingLabel(false);
            }}
          />
          <button
            onClick={() => { onLabelUpdate(labelVal); setEditingLabel(false); }}
            className="text-[10px] text-[var(--c-accent)] hover:underline"
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingLabel(true)}
          className="text-[10px] text-[var(--c-faint)] hover:text-[var(--c-accent)] px-2 py-1 rounded-lg hover:bg-[var(--c-line-soft)] transition flex-shrink-0"
          title={tr("แก้ไข label")}
        >
          🏷️ {item.customLabel ?? tr("ไม่มี label")}
        </button>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        disabled={pending}
        className="text-xs text-[var(--c-danger)] hover:text-[var(--c-danger)] hover:bg-[var(--c-danger-soft)] px-2 py-1 rounded-lg transition flex-shrink-0 disabled:opacity-50"
        title={tr("ลบออกจากมาแรง")}
      >
        🗑️
      </button>
    </div>
  );
}

// ─── Search Result Row ────────────────────────────────────────────────────────

function SearchResultRow({
  item, onAdd, disabled,
}: {
  item:     ItemSearchResult;
  onAdd:    () => void;
  disabled: boolean;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const img = item.images[0];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--c-subtle)] transition">
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--c-line-soft)]">
        {img ? (
          <Image src={img.url} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm">
            {item.category.emoji ?? "📦"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-ink)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--c-muted)]">
          ฿{item.price.toLocaleString()} — {item.seller.name ?? "—"}
        </p>
      </div>

      <button
        onClick={onAdd}
        disabled={disabled}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--c-accent)] rounded-lg
                   hover:bg-[var(--c-accent-str)] transition disabled:opacity-40"
      >{tr("+ เพิ่ม")}</button>
    </div>
  );
}
