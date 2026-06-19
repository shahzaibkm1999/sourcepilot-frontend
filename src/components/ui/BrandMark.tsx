interface BrandMarkProps {
  /**
   * `default` is the full-size mark for app bars and the cover.
   * `small` is the condensed mark for inline use (table meta,
   * status row, etc.).
   */
  size?: 'default' | 'small';
  /**
   * Override the brand text. Default is "SourcePilot".
   * Useful for future white-label work; the const is honest.
   */
  text?: string;
  /**
   * Visually hide the wordmark but keep it readable to screen
   * readers. Used in the sticky running header where only the
   * glyph is wanted.
   */
  hideText?: boolean;
}

/**
 * BrandMark
 * ---------
 * SourcePilot's wordmark + glyph. A custom SVG compass / orbit
 * mark sits to the left of the wordmark. The mark is intentionally
 * geometric — a circle with a single quadrant-arc and a center
 * pivot, the same proportions you'll see in consultancy and
 * product mark systems. Distinctive but neutral, never playful.
 *
 * No raster assets — the SVG is inline so it inherits `currentColor`
 * and scales to any size. This keeps the brand system fully
 * self-contained (Constitution Article VI — no new deps).
 */
export function BrandMark({ size = 'default', text = 'SourcePilot', hideText = false }: BrandMarkProps) {
  const className = size === 'small' ? 'brand-mark brand-mark--small' : 'brand-mark';

  return (
    <span className={className} aria-label={text}>
      <svg
        className="brand-mark-glyph"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring */}
        <circle
          cx="12"
          cy="12"
          r="10.25"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        {/* Inner ring (concentric, light) */}
        <circle
          cx="12"
          cy="12"
          r="5"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.35"
        />
        {/* Compass needle — north-east quadrant arc */}
        <path
          d="M 12 1.75 A 10.25 10.25 0 0 1 22.25 12"
          stroke="var(--color-gold, #a07836)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Center pivot dot */}
        <circle
          cx="12"
          cy="12"
          r="1.4"
          fill="currentColor"
        />
      </svg>
      {hideText ? (
        <span className="visually-hidden">{text}</span>
      ) : (
        <span>{text}</span>
      )}
    </span>
  );
}
