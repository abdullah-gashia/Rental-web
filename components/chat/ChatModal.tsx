"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import { getMessages, sendMessage, markMessagesAsRead } from "@/lib/actions/chat-actions";
import SystemMessage, { parseSystemMessage } from "@/components/chat/SystemMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:        string;
  content:   string;
  imageUrl:  string | null;
  read:      boolean;
  createdAt: string;
  sender:    { id: string; name: string | null; image: string | null };
}

interface ItemContext {
  imageUrl:     string | null;
  contact:      string | null;
  condition:    "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR" | null;
  negotiable:   boolean;
  allowShipping: boolean;
  allowMeetup:  boolean;
  location:     string | null;
  listingType:  "SELL" | "RENT";
}

interface ChatModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  itemTitle:      string;
  itemEmoji:      string | null;
  itemPrice:      number;
  conversationId: string | null;
  currentUserId:  string | null;
  convLoading?:   boolean;
  itemContext?:   ItemContext;
}

const POLL_INTERVAL_MS = 3000;

// ─── Condition labels ─────────────────────────────────────────────────────────

const CONDITION_LABEL: Record<string, string> = {
  LIKE_NEW:     "ใหม่มาก",
  GOOD:         "ดี",
  FAIR:         "พอใช้",
  NEEDS_REPAIR: "ซ่อมก่อนใช้",
};

// ─── Item Context Card ────────────────────────────────────────────────────────

function ItemContextCard({
  title,
  emoji,
  price,
  context,
  listingType,
  onSendGreeting,
  hasMessages,
}: {
  title:          string;
  emoji:          string | null;
  price:          number;
  context:        ItemContext;
  listingType:    "SELL" | "RENT";
  onSendGreeting: () => void;
  hasMessages:    boolean;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!context.contact) return;
    navigator.clipboard.writeText(context.contact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const priceLabel = listingType === "RENT"
    ? `฿${price.toLocaleString()} / วัน`
    : `฿${price.toLocaleString()}`;

  return (
    <div className="mx-0.5 mb-2">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-px flex-1 bg-[#e5e3de]" />
        <span className="text-[10px] font-bold text-[#9a9590] uppercase tracking-widest whitespace-nowrap">
          รายละเอียดสินค้า
        </span>
        <div className="h-px flex-1 bg-[#e5e3de]" />
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white border border-[#e5e3de] shadow-md overflow-hidden">

        {/* ── Image ──────────────────────────────────────────────── */}
        <div className="w-full aspect-[4/3] bg-[#f0ede7] overflow-hidden flex items-center justify-center">
          {context.imageUrl ? (
            <img
              src={context.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl select-none">{emoji ?? "📦"}</span>
          )}
        </div>

        {/* ── Title & Price ───────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2">
          <h4 className="text-sm font-bold text-[#111] leading-snug line-clamp-2">{title}</h4>
          <p className="text-xl font-extrabold text-[#e8500a] mt-1 leading-none">{priceLabel}</p>
        </div>

        {/* ── Badges ─────────────────────────────────────────────── */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {/* Condition */}
          {context.condition && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
              ✨ สภาพ: {CONDITION_LABEL[context.condition] ?? context.condition}
            </span>
          )}

          {/* Negotiable */}
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            context.negotiable
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {context.negotiable ? "💬 ต่อราคาได้" : "🔒 ราคาเน็ต/งดต่อ"}
          </span>

          {/* Shipping */}
          {context.allowShipping && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              📦 จัดส่งไปรษณีย์ได้
            </span>
          )}
          {context.allowMeetup && !context.allowShipping && (
            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full">
              🤝 นัดรับเท่านั้น
            </span>
          )}
          {context.allowMeetup && context.allowShipping && (
            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full">
              🤝 นัดรับได้
            </span>
          )}

          {/* Location */}
          {context.location && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
              📍 {context.location}
            </span>
          )}
        </div>

        {/* ── Contact ─────────────────────────────────────────────── */}
        {context.contact && (
          <div className="mx-4 mb-3 flex items-center justify-between gap-3 bg-[#f7f6f3] rounded-xl px-3 py-2.5 border border-[#e5e3de]">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#9a9590] uppercase tracking-wide mb-0.5">
                📞 ช่องทางติดต่อผู้ขาย
              </p>
              <p className="text-sm font-bold text-[#111] truncate">{context.contact}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-white text-[#555] border border-[#e5e3de] hover:border-[#111] hover:text-[#111]"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  คัดลอกแล้ว
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  คัดลอก
                </>
              )}
            </button>
          </div>
        )}

        {/* ── CTA — only when no messages yet ────────────────────── */}
        {!hasMessages && (
          <div className="px-4 pb-4">
            <button
              onClick={onSendGreeting}
              className="w-full py-2.5 rounded-xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              </svg>
              สวัสดีครับ/ค่ะ สนใจสินค้าชิ้นนี้
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ChatModal({
  isOpen,
  onClose,
  itemTitle,
  itemEmoji,
  itemPrice,
  conversationId,
  currentUserId,
  convLoading,
  itemContext,
}: ChatModalProps) {
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [msgLoading,   setMsgLoading]   = useState(false);
  const [input,        setInput]        = useState("");
  const [uploading,    setUploading]    = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Merge helper ──────────────────────────────────────────────
  const mergeMessages = useCallback((serverMsgs: ChatMessage[]) => {
    setMessages((prev) => {
      const pending = prev.filter((m) => m.id.startsWith("optimistic-"));
      if (serverMsgs.length < prev.length - pending.length) return prev;
      return [...serverMsgs, ...pending];
    });
  }, []);

  // ── Polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    setMsgLoading(true);
    setMessages([]);

    getMessages(conversationId).then((result) => {
      if (result.messages) mergeMessages(result.messages as ChatMessage[]);
      setMsgLoading(false);
    });

    const interval = setInterval(async () => {
      const result = await getMessages(conversationId);
      if (result.messages) mergeMessages(result.messages as ChatMessage[]);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [conversationId, isOpen, mergeMessages]);

  // ── Mark read ─────────────────────────────────────────────────
  useEffect(() => {
    if (conversationId && isOpen) markMessagesAsRead(conversationId);
  }, [conversationId, isOpen]);

  // ── Reset on close ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput("");
      setImagePreview(null);
      setPendingImage(null);
    }
  }, [isOpen]);

  // ── File → upload ─────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const blob = URL.createObjectURL(file);
    setImagePreview(blob);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setPendingImage(data.url);
      } else {
        setImagePreview(null);
        alert(data.error ?? "อัปโหลดรูปภาพไม่สำเร็จ");
      }
    } catch {
      setImagePreview(null);
      alert("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const clearPendingImage = () => {
    setImagePreview(null);
    setPendingImage(null);
  };

  // ── Send ──────────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && !pendingImage) || !conversationId || !currentUserId) return;
    if (text.startsWith("SYSTEM:")) return;

    if (!overrideText) setInput("");
    const img     = pendingImage;
    const preview = imagePreview;
    clearPendingImage();

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id:        tempId,
      content:   text,
      imageUrl:  preview,
      read:      false,
      createdAt: new Date().toISOString(),
      sender:    { id: currentUserId, name: null, image: null },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const result = await sendMessage(conversationId, text, img ?? undefined);
    if (result.message) {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? (result.message as ChatMessage) : m)
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Read-receipt: index of last sent message ──────────────────
  const lastSentIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender.id === currentUserId && !messages[i].id.startsWith("optimistic-")) {
        return i;
      }
    }
    return -1;
  })();

  const loading = convLoading || msgLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e3de]">
        <div className="w-10 h-10 bg-[#f0ede7] rounded-xl flex items-center justify-center text-lg">
          {itemEmoji || "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{itemTitle}</h3>
          <p className="text-xs text-[#e8500a] font-semibold">{itemPrice.toLocaleString()} ฿</p>
        </div>
        <button onClick={onClose} className="text-[#9a9590] hover:text-[#111] text-xl leading-none">✕</button>
      </div>

      {/* ── Messages area ───────────────────────────────────────── */}
      <div className="h-80 overflow-y-auto py-4 flex flex-col gap-2.5">

        {/* Item Context Card */}
        {itemContext && (
          <ItemContextCard
            title={itemTitle}
            emoji={itemEmoji}
            price={itemPrice}
            context={itemContext}
            listingType={itemContext.listingType}
            onSendGreeting={() => handleSend("สวัสดีครับ/ค่ะ สนใจสินค้าชิ้นนี้ครับ 👋")}
            hasMessages={messages.length > 0}
          />
        )}

        {/* Empty state */}
        {messages.length === 0 && !loading && !itemContext && (
          <div className="text-center text-[#9a9590] text-sm py-12">
            <p className="text-3xl mb-2">💬</p>
            <p>เริ่มแชทกับผู้ขาย</p>
          </div>
        )}

        {/* Loading state */}
        {loading && messages.length === 0 && (
          <div className="text-center text-[#9a9590] text-sm py-12">
            <p>กำลังโหลด...</p>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, idx) => {
          const isSystem = parseSystemMessage(msg.content) !== null;

          if (isSystem) {
            return (
              <div key={msg.id} className="w-full px-1 py-1">
                <SystemMessage content={msg.content} />
              </div>
            );
          }

          const isMine     = msg.sender.id === currentUserId;
          const isLastSent = idx === lastSentIdx;
          const hasImage   = !!msg.imageUrl;
          const hasText    = msg.content.trim() !== "";

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && (
                <p className="text-[10px] text-[#9a9590] mb-0.5 ml-1">{msg.sender.name}</p>
              )}
              <div className="max-w-[75%]">
                {hasImage && (
                  <a href={msg.imageUrl!} target="_blank" rel="noopener noreferrer" className="block mb-1">
                    <img
                      src={msg.imageUrl!}
                      alt="รูปภาพ"
                      className={`max-w-full max-h-56 rounded-2xl object-cover cursor-zoom-in hover:opacity-90 transition border border-black/5 ${
                        isMine ? "rounded-br-md" : "rounded-bl-md"
                      }`}
                    />
                  </a>
                )}
                {hasText && (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isMine
                      ? "bg-[#111] text-white rounded-br-md"
                      : "bg-[#f0ede7] text-[#111] rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end mr-1" : "ml-1"}`}>
                <p className="text-[9px] text-[#b0ada6]">
                  {new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {isMine && isLastSent && msg.read && (
                  <span className="text-[9px] text-[#e8500a] font-semibold">อ่านแล้ว</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={msgEndRef} />
      </div>

      {/* ── Image preview strip ──────────────────────────────────── */}
      {imagePreview && (
        <div className="mx-1 mb-2 flex items-center gap-2 p-2 bg-[#f7f6f3] rounded-xl border border-[#e5e3de]">
          <div className="relative flex-shrink-0">
            <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#333]">{uploading ? "กำลังอัปโหลด..." : "พร้อมส่ง"}</p>
            <p className="text-[10px] text-[#9a9590]">คุณสามารถพิมพ์ข้อความเพิ่มได้</p>
          </div>
          <button
            onClick={clearPendingImage}
            disabled={uploading}
            className="text-[#9a9590] hover:text-red-500 transition text-lg leading-none disabled:opacity-30"
            aria-label="ยกเลิกรูปภาพ"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Input row ────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-[#e5e3de] flex gap-2 items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !!imagePreview}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-[#e5e3de] text-[#9a9590] hover:text-[#111] hover:border-[#111] transition disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="แนบรูปภาพ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imagePreview ? "เพิ่มข้อความ (ไม่บังคับ)…" : "พิมพ์ข้อความ…"}
          className="flex-1 border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#111]"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !pendingImage) || !!uploading || !conversationId}
          className="bg-[#111] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#333] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ส่ง
        </button>
      </div>
    </Modal>
  );
}
