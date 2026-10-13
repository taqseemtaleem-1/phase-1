// src/components/games/Urdu/Huroof-e-Tahajji-Items Introduction/audioMap.ts
// Resolves audio from the SAME folder as SVGs: src/assets/Urdu Items SVG/{1-40}/
//   - {itemId}.wav         → per-item audio
//   - intro.wav            → letter introduction audio

const audioModules = import.meta.glob<string>(
  '/src/assets/Urdu Items SVG/*/*.wav',
  { eager: true, query: '?url', import: 'default' }
);

/**
 * Get the audio URL for a specific Urdu item.
 */
export function getItemAudioUrl(letterNumber: number, itemId: string): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/${itemId}.wav`;
  const url = audioModules[key];
  if (!url) {
    console.warn(`[HuroofItems] Missing audio: ${key}`);
  }
  return url ?? '';
}

/**
 * Get the intro audio URL for a letter.
 * Each letter folder should have an `intro.wav` file.
 */
export function getIntroAudioUrl(letterNumber: number): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/intro.wav`;
  const url = audioModules[key];
  if (!url) {
    console.warn(`[HuroofItems] Missing intro audio: ${key}`);
  }
  return url ?? '';
}