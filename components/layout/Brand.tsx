import Image from "next/image";

/**
 * The PSU Store mark.
 *
 * Everywhere used to draw its own: the top bar had a square with "ม.อ." typed
 * into it, the three consoles each hand-set "PSU.STORE" with a coloured full
 * stop, and the receipt did it a fourth way in print CSS. One component means
 * the logo is replaced in one place next time.
 */

interface Props {
  /** Height of the mark in px. The width follows the artwork's ratio. */
  size?: number;
  /** Show the wordmark next to the mark. Off on narrow bars. */
  withWordmark?: boolean;
  className?: string;
  /** Wrap in a link to the storefront. */
  href?: string | null;
}

export default function Brand({
  size = 30,
  withWordmark = true,
  className = "",
  href = "/",
}: Props) {
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/psu-store-logo.png"
        alt="PSU Store"
        width={size}
        height={size}
        priority
        className="object-contain"
        style={{ height: size, width: "auto" }}
      />
      {withWordmark && (
        <span className="hidden sm:inline text-[14px] font-bold tracking-tight text-[var(--psu-navy)] leading-none">
          PSU Store
        </span>
      )}
    </span>
  );

  if (!href) return inner;

  return (
    <a href={href} className="flex-shrink-0" aria-label="PSU Store">
      {inner}
    </a>
  );
}
