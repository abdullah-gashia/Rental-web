"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "./ProductCard";
import Panel from "@/components/ui/Panel";

interface ProductGridProps {
  title: string;
  items: ItemWithDetails[];
  limit?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

/** Photo-forward grid inside a panel — used for search results. */
export default function ProductGrid({ title, items, limit = 10, onItemClick }: ProductGridProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useT();

  const visible = expanded ? items : items.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <Panel
      title={title}
      sub={`${items.length} รายการ`}
      meta={
        items.length > limit ? (
          <button onClick={() => setExpanded(!expanded)} className="hp-btn hp-btn-ghost h-8 text-[12.5px]">
            {expanded ? t("show_less") : t("view_all")}
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </Panel>
  );
}
