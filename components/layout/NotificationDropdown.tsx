"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useRef, useEffect } from "react";
import { getNotifications, markNotificationsRead } from "@/lib/actions/notification-actions";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ตอนนี้";
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  const days = Math.floor(hrs / 24);
  return `${days} วัน`;
}

function typeIcon(type: string): string {
  switch (type) {
    case "MESSAGE": return "💬";
    case "ORDER": return "🛒";
    case "MODERATION": return "🛡️";
    case "BORROW": return "🤝";
    default: return "🔔";
  }
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const tr = useLocaleStore((s) => s.tr);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      try {
        const result = await getNotifications();
        if (result.notifications) {
          setNotifications(result.notifications as NotificationItem[]);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }

      // Mark all as read when dropdown opens
      try {
        await markNotificationsRead();
      } catch {}
    }
    load();
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[360px] bg-[var(--c-surface)] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.16)] border border-[var(--c-line)]/60 overflow-hidden z-[200] fade-up"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--c-line)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--c-ink)]">การแจ้งเตือน</h3>
          <button className="text-xs text-[var(--c-accent)] font-medium hover:underline">{tr("อ่านทั้งหมด")}</button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-[var(--c-muted)] text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--c-line)] border-t-[var(--c-ink)] rounded-full mx-auto mb-2" />{tr("กำลังโหลด...")}</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-[var(--c-muted)]">
            <p className="text-3xl mb-2">🔕</p>
            <p className="text-sm">{tr("ยังไม่มีการแจ้งเตือน")}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--c-canvas)] transition cursor-pointer ${
                !notif.isRead ? "bg-[#fff8f5]" : ""
              }`}
            >
              <div className="w-10 h-10 bg-[var(--c-line-soft)] rounded-full flex items-center justify-center text-lg flex-shrink-0">
                {typeIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${!notif.isRead ? "font-semibold text-[var(--c-ink)]" : "text-[var(--c-ink-2)]"}`}>
                  {notif.message}
                </p>
                <p className={`text-[11px] mt-0.5 ${!notif.isRead ? "text-[var(--c-accent)] font-medium" : "text-[var(--c-muted)]"}`}>
                  {timeAgo(notif.createdAt)}
                </p>
              </div>
              {!notif.isRead && (
                <div className="w-2.5 h-2.5 bg-[var(--c-accent)] rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--c-line)] text-center">
          <button className="text-[13px] font-medium text-[var(--c-accent)] hover:underline">{tr("ดูการแจ้งเตือนทั้งหมด")}</button>
        </div>
      )}
    </div>
  );
}
