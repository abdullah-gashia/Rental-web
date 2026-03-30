"use client";

import { useState, useEffect, useRef } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import Modal from "@/components/ui/Modal";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemEmoji: string | null;
  itemPrice: number;
  messages: ChatMessage[];
  currentUserId: string | null;
  onSend: (content: string) => void;
  loading?: boolean;
}

export default function ChatModal({
  isOpen,
  onClose,
  itemTitle,
  itemEmoji,
  itemPrice,
  messages,
  currentUserId,
  onSend,
  loading,
}: ChatModalProps) {
  const [input, setInput] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);
  const t = useLocaleStore((s) => s.t);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
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

      {/* Messages */}
      <div className="h-80 overflow-y-auto py-4 flex flex-col gap-2.5">
        {messages.length === 0 && !loading && (
          <div className="text-center text-[#9a9590] text-sm py-12">
            <p className="text-3xl mb-2">💬</p>
            <p>เริ่มแชทกับผู้ขาย</p>
          </div>
        )}
        {loading && (
          <div className="text-center text-[#9a9590] text-sm py-12">
            <p>กำลังโหลด...</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
                {!isMine && (
                  <p className="text-[10px] text-[#9a9590] mb-0.5 ml-1">{msg.sender.name}</p>
                )}
                <div
                  className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-[#111] text-white rounded-br-md"
                      : "bg-[#f0ede7] text-[#111] rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[9px] text-[#b0ada6] mt-0.5 ${isMine ? "text-right mr-1" : "ml-1"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={msgEndRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-[#e5e3de] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ…"
          className="flex-1 border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#111]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-[#111] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#333] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ส่ง
        </button>
      </div>
    </Modal>
  );
}
