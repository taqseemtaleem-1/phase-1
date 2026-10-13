// File: src/components/games/English/Alphabet-Letter5Items Pick/svgMap.ts

// Resolves item SVGs for the "A2Z Items SVG" folder through Vite's import.meta.glob.
// This creates a NEW map with 180px SVGs for the Pick game.
const svgModules = import.meta.glob<string>(
  '/src/assets/A2Z Items SVG/*/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

export function getItemSvgUrl(letter: string, item: string): string {
  const key = `/src/assets/A2Z Items SVG/${letter} For/${item}.svg`;
  const url = svgModules[key];
  if (!url) {
    console.warn(`[AlphabetLetter5ItemsPick] Missing SVG asset for key: ${key}`);
  }
  return url ?? '';
}