"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

interface PanelProps {
  title: string;
  /** Optional line under the title */
  sub?: string;
  /** Fires when the title (or its chevron) is clicked */
  onTitleClick?: () => void;
  /** Paging controls — omit either handler to hide/disable that arrow */
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Extra control rendered left of the arrows (e.g. "3 / 8") */
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * White surface with a header row: clickable title + chevron on the left,
 * round paging arrows on the right. The one container used by every
 * homepage section.
 */
export default function Panel({
  title,
  sub,
  onTitleClick,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  meta,
  className = "",
  children,
}: PanelProps) {
  const tr = useTr();
  const showArrows = !!(onPrev || onNext);

  return (
    <section className={`hp-panel ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <button
            type="button"
            className="hp-panel-title"
            onClick={onTitleClick}
            disabled={!onTitleClick}
          >
            <span className="truncate">{title}</span>
            {onTitleClick && (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          {sub && <p className="text-[12.5px] text-[var(--hp-muted)] mt-1">{sub}</p>}
        </div>

        {(showArrows || meta) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {meta}
            {showArrows && (
              <>
                <button
                  className="hp-arrow"
                  onClick={onPrev}
                  disabled={prevDisabled || !onPrev}
                  aria-label={tr("ก่อนหน้า")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="hp-arrow"
                  onClick={onNext}
                  disabled={nextDisabled || !onNext}
                  aria-label={tr("ถัดไป")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}
