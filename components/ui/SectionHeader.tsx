interface SectionHeaderProps {
  /** Small uppercase kicker above the title */
  eyebrow?: string;
  title: string;
  /** Optional item count rendered next to the title */
  count?: number;
  /** Optional sub-line under the title */
  sub?: string;
  /** Right-aligned control (button, pager, …) */
  action?: React.ReactNode;
}

/**
 * One section header used across the homepage: hairline rule on top,
 * eyebrow + title on the left, a single control on the right.
 */
export default function SectionHeader({ eyebrow, title, count, sub, action }: SectionHeaderProps) {
  return (
    <div className="border-t border-[var(--hp-border)] pt-3.5 mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="hp-eyebrow mb-1.5">{eyebrow}</p>}
        <div className="flex items-baseline gap-2">
          <h2 className="hp-sec-title truncate">{title}</h2>
          {typeof count === "number" && (
            <span className="hp-num text-[12px] text-[var(--hp-muted)]">{count}</span>
          )}
        </div>
        {sub && <p className="text-[12px] text-[var(--hp-muted)] mt-1">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
