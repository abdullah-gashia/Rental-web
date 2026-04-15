"use client";

import Image from "next/image";
import Link from "next/link";
import {
  LENDING_CATEGORY_EMOJI,
  CONDITION_LABELS,
  RENTAL_TYPE_LABELS,
  LENDING_TIER_LABELS,
} from "@/lib/actions/lending-items";
import type { LendingItemWithOwner } from "@/lib/actions/lending-items";

interface Props {
  item: LendingItemWithOwner;
}

export default function LendingItemCard({ item }: Props) {
  const img = item.images[0];
  const emoji = LENDING_CATEGORY_EMOJI[item.category] ?? "📦";

  function renderPrice() {
    if (item.rentalType === "FREE") return <span className="text-green-600 font-bold text-base">ให้ยืมฟรี</span>;
    if (item.rentalType === "DAILY_RATE")
      return (
        <span className="font-bold text-base text-[#111]">
          ฿{(item.dailyRate ?? 0).toLocaleString()}
          <span className="text-xs text-[#9a9590] font-normal">/วัน</span>
        </span>
      );
    return (
      <span className="font-bold text-base text-[#111]">
        ฿{(item.flatFee ?? 0).toLocaleString()}
        <span className="text-xs text-[#9a9590] font-normal"> เหมา</span>
      </span>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[#f0ede7] overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            {emoji}
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold bg-white/90 text-[#555] px-2 py-0.5 rounded-full border border-[#e5e3de]">
            {emoji} {LENDING_CATEGORY_EMOJI[item.category] ? item.category.replace("_", " ") : ""}
          </span>
        </div>
        {/* Rental type badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            item.rentalType === "FREE"
              ? "bg-green-500 text-white"
              : "bg-[#e8500a] text-white"
          }`}>
            {RENTAL_TYPE_LABELS[item.rentalType]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-[#111] line-clamp-2 leading-snug mb-1.5">
          {item.title}
        </h3>

        <div className="flex items-center justify-between mb-2">
          {renderPrice()}
          {item.depositAmount > 0 && (
            <span className="text-[11px] text-[#9a9590]">มัดจำ ฿{item.depositAmount.toLocaleString()}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#9a9590] mb-3">
          <span>{CONDITION_LABELS[item.condition]}</span>
          <span>·</span>
          <span>ยืมได้ {item.minLendingDays}–{item.maxLendingDays} วัน</span>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-2 mb-3">
          {item.owner.image ? (
            <Image src={item.owner.image} alt="" width={20} height={20} className="rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#e5e3de] flex items-center justify-center text-[9px] font-bold text-[#555]">
              {(item.owner.name ?? "?")[0].toUpperCase()}
            </div>
          )}
          <span className="text-[11px] text-[#555] truncate">{item.owner.name ?? "ผู้ใช้"}</span>
          {item.owner.verificationStatus === "APPROVED" && (
            <span className="text-[10px]" title="KYC ยืนยันแล้ว">✅</span>
          )}
        </div>

        {/* Action */}
        <Link
          href={`/lending/${item.id}`}
          className="block w-full text-center py-2 bg-[#e8500a] text-white text-xs font-bold rounded-xl
                     hover:bg-[#c94208] transition-colors"
        >
          เช่าเลย
        </Link>
      </div>
    </div>
  );
}
