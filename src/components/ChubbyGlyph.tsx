import { useId } from "react";

type ChubbyGlyphProps = {
  /** The character(s) to render in chubby style */
  char: string;
  /** Font family for the glyph (defaults to a rounded playful stack) */
  fontFamily?: string;
  /** Font size in SVG units (viewBox is 400x400). Auto-scaled if omitted. */
  fontSize?: number;
  /** Two-stop gradient colors (top -> bottom) */
  gradientFrom?: string;
  gradientTo?: string;
  /** Outer stroke color for the glyph (defaults to white) */
  strokeColor?: string;
  /** RTL rendering (for Urdu) */
  rtl?: boolean;
  /** Extra spacing between characters in SVG units (e.g. for "Aa" combos) */
  letterSpacing?: number;
};

/**
 * Renders a big, chubby, kid-friendly glyph inside a 400x400 SVG viewBox.
 * Uses the same visual language as the reference chubby "A":
 *  - warm red -> orange gradient fill
 *  - soft drop shadow
 *  - thick white stroke with rounded joins
 *
 * Sizing is done via `width="100%" height="100%"` so the parent controls size.
 */
export function ChubbyGlyph({
  char,
  fontFamily = "'Fredoka', 'Baloo 2', 'Arial Rounded MT Bold', 'Comic Sans MS', system-ui, sans-serif",
  fontSize,
  gradientFrom = "#FF5964",
  gradientTo = "#FF8652",
  strokeColor = "#FFFFFF",
  rtl = false,
  letterSpacing,
}: ChubbyGlyphProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `chubby-gradient-${uid}`;
  const shadowId = `chubby-shadow-${uid}`;

  // Auto-scale so long labels (e.g. "10") still fit nicely
  const autoSize = fontSize ?? (char.length > 1 ? 240 : 320);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width="100%"
      height="100%"
      role="img"
      aria-label={char}
      
    >
      <defs>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#2D3748" floodOpacity="0.18" />
        </filter>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradientFrom} />
          <stop offset="100%" stopColor={gradientTo} />
        </linearGradient>
      </defs>

      <text
        x="200"
        y="200"
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${gradId})`}
        filter={`url(#${shadowId})`}
        stroke={strokeColor}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        paintOrder="stroke fill"
        fontFamily={fontFamily}
        fontWeight={900}
        fontSize={autoSize}
        direction={rtl ? "rtl" : "ltr"}
        letterSpacing={letterSpacing}
      >
        {char}
      </text>
    </svg>
  );
}
