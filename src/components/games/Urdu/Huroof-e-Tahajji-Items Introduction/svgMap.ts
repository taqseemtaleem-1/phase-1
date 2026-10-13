// src/components/games/Urdu/Huroof-e-Tahajji-Items Introduction/svgMap.ts
// Resolves Urdu item SVGs from: src/assets/Urdu Items SVG/{1-40}/*.svg
// Auto-discovers items per letter folder — empty folders skip cleanly.

const svgModules = import.meta.glob<string>(
  '/src/assets/Urdu Items SVG/*/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

/**
 * Get the SVG URL for a specific Urdu item.
 */
export function getItemSvgUrl(letterNumber: number, itemId: string): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/${itemId}.svg`;
  const url = svgModules[key];
  if (!url) {
    console.warn(`[HuroofItems] Missing SVG: ${key}`);
  }
  return url ?? '';
}

/**
 * Get ALL item ids available for a letter (from SVG folder contents).
 * Empty folder → returns [] → game auto-skips that letter.
 */
export function getItemsForLetter(letterNumber: number): string[] {
  const prefix = `/src/assets/Urdu Items SVG/${letterNumber}/`;
  const items: string[] = [];

  for (const path of Object.keys(svgModules)) {
    if (path.startsWith(prefix)) {
      const filename = path.slice(prefix.length).replace(/\.svg$/, '');
      // Only direct children (no subfolders)
      if (filename && !filename.includes('/')) {
        items.push(filename);
      }
    }
  }

  return items.sort();
}