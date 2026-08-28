"use client";

import { useState } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "./ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";

interface ProductGridProps {
  title: string;
  eyebrow?: string;
  items: ItemWithDetails[];
  limit?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

export default function ProductGrid({ title, eyebrow, items, limit = 5, onItemClick }: ProductGridProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useLocaleStore((s) => s.t);

  const visible = expanded ? items : items.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        count={items.length}
        action={
          items.length > limit ? (
            <button onClick={() => setExpanded(!expanded)} className="hp-btn hp-btn-quiet">
              {expanded ? t("show_less") : t("view_all")}
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </section>
  );
}
