"use client";

import { useState } from "react";
import type { ItemWithDetails } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import ProductRow from "./ProductRow";

interface ProductPanelProps {
  title: string;
  items: ItemWithDetails[];
  /** Rows shown per page (arrows page through the rest) */
  perPage?: number;
  /** Clicking the panel title jumps to this category */
  onTitleClick?: () => void;
  onItemClick: (item: ItemWithDetails) => void;
}

/** A panel of paged list rows — the Store's "popular apps" block. */
export default function ProductPanel({
  title,
  items,
  perPage = 6,
  onTitleClick,
  onItemClick,
}: ProductPanelProps) {
  const [page, setPage] = useState(0);

  if (items.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const visible    = items.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <Panel
      title={title}
      onTitleClick={onTitleClick}
      onPrev={() => setPage((p) => Math.max(0, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      prevDisabled={safePage === 0}
      nextDisabled={safePage >= totalPages - 1}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-x-5 gap-y-1 -mx-2">
        {visible.map((item) => (
          <ProductRow key={item.id} item={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </Panel>
  );
}
