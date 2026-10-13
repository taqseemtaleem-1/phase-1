// Resolves item SVGs for the "A2Z Items SVG" folder through Vite's import.meta.glob.
// This ensures the assets are correctly bundled (and hashed) in the production build,
// instead of relying on a raw "/src/..." string path which only happens to work in dev
// and breaks after `vite build` (and can also break on folder names containing spaces).
const svgModules = import.meta.glob<string>(
  '/src/assets/A2Z Items SVG/*/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

export function getItemSvgUrl(letter: string, item: string): string {
  const key = `/src/assets/A2Z Items SVG/${letter} For/${item}.svg`;
  const url = svgModules[key];
  if (!url) {
    console.warn(`[AlphabetLetter5Items] Missing SVG asset for key: ${key}`);
  }
  return url ?? '';
}
