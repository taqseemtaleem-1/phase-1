// src/components/games/Urdu/Huroof-e-Tahajji-Items Pick/svgMap.ts
// Resolves Urdu item SVGs from: src/assets/Urdu Items SVG/{1-40}/*.svg

const svgModules = import.meta.glob<string>(
  '/src/assets/Urdu Items SVG/*/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

export function getItemSvgUrl(letterNumber: number, itemId: string): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/${itemId}.svg`;
  const url = svgModules[key];
  if (!url) {
    console.warn(`[HuroofPick] Missing SVG: ${key}`);
  }
  return url ?? '';
}

export function getItemsForLetter(letterNumber: number): string[] {
  const prefix = `/src/assets/Urdu Items SVG/${letterNumber}/`;
  const items: string[] = [];

  for (const path of Object.keys(svgModules)) {
    if (path.startsWith(prefix)) {
      const filename = path.slice(prefix.length).replace(/\.svg$/, '');
      if (filename && !filename.includes('/')) {
        items.push(filename);
      }
    }
  }

  return items.sort();
}