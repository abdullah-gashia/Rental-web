"use client";

import { useState } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  title: string;
  items: ItemWithDetails[];
  limit?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

export default function ProductGrid({ title, items, limit = 5, onItemClick }: ProductGridProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useLocaleStore((s) => s.t);

  const visible = expanded ? items : items.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="flex justify-between items-end mb-5">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {items.length > limit && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-[#9a9590] hover:text-[#111] transition"
          >
            {expanded ? t("show_less") : t("view_all")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i < limit ? i : 0} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </section>
  );
}
