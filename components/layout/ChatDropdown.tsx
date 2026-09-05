"use client";

import { useState, useRef, useEffect } from "react";
import { getUserConversations } from "@/lib/actions/chat-actions";
import { useAuthStore } from "@/lib/stores/auth-store";

interface ConversationPreview {
  id: string;
  createdAt: string;
  updatedAt: string;
  item: { id: string; title: string; emoji: string | null; price: number };
  members: { id: string; name: string | null; image: string | null }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string | null };
  }[];
}

interface ChatDropdownProps {
  onClose: () => void;
  onOpenChat?: (itemId: string, sellerId: string, itemTitle: string, itemEmoji: string | null, itemPrice: number) => void;
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

export default function ChatDropdown({ onClose, onOpenChat }: ChatDropdownProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Load conversations
  useEffect(() => {
    async function load() {
      try {
        const result = await getUserConversations();
        if (result.conversations) {
          setConversations(result.conversations as ConversationPreview[]);
        }
      } catch (err) {
        console.error("Failed to load conversations", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getOtherMember = (conv: ConversationPreview) => {
    if (!user) return conv.members[0];
    return conv.members.find((m) => m.id !== user.id) || conv.members[0];
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[360px] bg-[var(--c-surface)] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.16)] border border-[var(--c-line)]/60 overflow-hidden z-[200] fade-up"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--c-line)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--c-ink)]">แชท</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs text-[var(--c-muted)] hover:text-[var(--c-ink)] transition" title="ค้นหา">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex gap-1.5 mt-2.5">
          <span className="px-3 py-1 bg-[var(--c-ink)] text-white text-[11px] font-semibold rounded-full">ทั้งหมด</span>
          <span className="px-3 py-1 bg-[var(--c-line-soft)] text-[var(--c-ink-2)] text-[11px] font-medium rounded-full hover:bg-[var(--c-line)] cursor-pointer transition">ยังไม่ได้อ่าน</span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-[var(--c-muted)] text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--c-line)] border-t-[var(--c-ink)] rounded-full mx-auto mb-2" />
            กำลังโหลด...
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-12 text-center text-[var(--c-muted)]">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm font-medium">ยังไม่มีแชท</p>
            <p className="text-xs mt-1">เริ่มแชทกับผู้ขายโดยคลิก &quot;แชทกับผู้ขาย&quot; ในหน้าสินค้า</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const other = getOtherMember(conv);
            const lastMsg = conv.messages[0];
            const lastMsgIsMine = lastMsg && user && lastMsg.sender.id === user.id;

            return (
              <div
                key={conv.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--c-canvas)] transition cursor-pointer"
                onClick={() => {
                  if (onOpenChat && other) {
                    onOpenChat(conv.item.id, other.id, conv.item.title, conv.item.emoji, conv.item.price);
                  }
                  onClose();
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {other?.name ? other.name[0].toUpperCase() : "?"}
                  </div>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22c55e] border-2 border-white rounded-full" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[var(--c-ink)] truncate">{other?.name || "ผู้ใช้"}</p>
                    <span className="text-[10px] text-[var(--c-muted)] flex-shrink-0 ml-2">
                      {lastMsg ? timeAgo(lastMsg.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-lg leading-none">{conv.item.emoji || "📦"}</span>
                    <p className="text-[12px] text-[var(--c-muted)] truncate">
                      {lastMsg ? (
                        <>
                          {lastMsgIsMine && <span className="text-[var(--c-ink-2)]">คุณ: </span>}
                          {lastMsg.content}
                        </>
                      ) : (
                        <span className="italic">เริ่มแชท</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--c-line)] text-center">
        <button className="text-[13px] font-medium text-[var(--c-accent)] hover:underline">
          ดูแชททั้งหมด
        </button>
      </div>
    </div>
  );
}
