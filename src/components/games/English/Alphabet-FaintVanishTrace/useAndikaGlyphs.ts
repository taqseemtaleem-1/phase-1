// src/components/games/English/Alphabet-FaintVanishTrace/useAndikaGlyphs.ts
// (Same as original - copy from FaintTrace folder)

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

export function useAndikaFont(): Font | null {
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAndikaFont()
      .then((f) => {
        if (!cancelled) setFont(f);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return font;
}