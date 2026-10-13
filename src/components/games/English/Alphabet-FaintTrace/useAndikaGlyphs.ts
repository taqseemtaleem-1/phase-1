// File: src/components/games/English/Alphabet-RuledLineTrace/useAndikaGlyphs.ts
//
// Loads the Andika font file and parses it with opentype.js so we can pull
// out each letter's real vector outline (SVG path) instead of relying on
// CSS font-size / canvas fillText, which leaves unpredictable blank space
// around the glyph.

import { useEffect, useState } from 'react';
import * as opentype from 'opentype.js';
import type { Font } from 'opentype.js';

// eslint-disable-next-line import/no-unresolved
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

let fontPromise: Promise<Font> | null = null;

function loadAndikaFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = fetch(andikaFontUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => opentype.parse(buffer));
  }
  return fontPromise;
}

/**
 * Returns the parsed Andika Font once it's ready, or null while loading.
 * The font is fetched & parsed only once per page load and shared across
 * every letter/lesson that uses this hook.
 */
export function useAndikaFont(): Font | null {
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAndikaFont()
      .then((f) => {
        if (!cancelled) setFont(f);
      })
      .catch(() => {
        // If parsing fails for any reason, `font` stays null and the game
        // simply keeps showing its loading state rather than crashing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return font;
}
