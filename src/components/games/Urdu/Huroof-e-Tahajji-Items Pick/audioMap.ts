// src/components/games/Urdu/Huroof-e-Tahajji-Items Pick/audioMap.ts
// Item audio + intro audio — same folder as SVGs.

const audioModules = import.meta.glob<string>(
  '/src/assets/Urdu Items SVG/*/*.wav',
  { eager: true, query: '?url', import: 'default' }
);

export function getItemAudioUrl(letterNumber: number, itemId: string): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/${itemId}.wav`;
  const url = audioModules[key];
  if (!url) {
    console.warn(`[HuroofPick] Missing audio: ${key}`);
  }
  return url ?? '';
}

export function getIntroAudioUrl(letterNumber: number): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/intro.wav`;
  const url = audioModules[key];
  if (!url) {
    console.warn(`[HuroofPick] Missing intro: ${key}`);
  }
  return url ?? '';
}