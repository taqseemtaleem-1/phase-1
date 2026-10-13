// Resolves item audio (.wav) files for the "Alphabet-Letter5Items Introduction Audios" folder
// through Vite's import.meta.glob. This ensures the assets are correctly bundled (and hashed)
// in the production build, instead of relying on a raw "/src/..." string path which only
// happens to work in dev and breaks after `vite build` (and can also break on folder names
// containing spaces) — same reasoning as svgMap.ts.
const audioModules = import.meta.glob<string>(
  '/src/assets/Alphabet-Letter5Items Introduction Audios/*/*.wav',
  { eager: true, query: '?url', import: 'default' }
);

export function getItemAudioUrl(letter: string, item: string): string {
  const key = `/src/assets/Alphabet-Letter5Items Introduction Audios/${letter.toUpperCase()}/${item}.wav`;
  const url = audioModules[key];
  if (!url) {
    console.warn(`[AlphabetLetter5Items] Missing audio asset for key: ${key}`);
  }
  return url ?? '';
}
