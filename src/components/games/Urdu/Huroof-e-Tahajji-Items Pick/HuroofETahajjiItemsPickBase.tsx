// src/components/games/Urdu/Huroof-e-Tahajji-Items Pick/HuroofETahajjiItemsPickBase.tsx
// ✅ Urdu version of AlphabetLetter5ItemsPickBase
// 🔥 2 Sessions · 8 CARDS per session (correct + distractors) · FIXED
// 🔥 Layout: 4 cards upar, 4 neeche · no scrollbar
// 🔥 Distractors RANDOMLY picked from ANY letter folder
// ⬆️ Letter outline offset EM-based (font-size ke relative — predictable)
// 🔠 Per-letter SIZE SCALE (Khay chhota, etc.)
// 📦 Outline box FIXED size — letter size change se box shrink nahi hota
// 🎯 Cards: proper padding + centered grid
// 🎯 Summary: NO "on Attempt N" phrase — simple count-based

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { getItemSvgUrl, getItemsForLetter } from "./svgMap";
import { getItemAudioUrl, getIntroAudioUrl } from "./audioMap";

const CelebrationSVG = "/assets/Celebration.svg";

const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎯 LETTER → NUMBER MAPPING
// ═══════════════════════════════════════════════════════════════

const LETTER_TO_NUMBER: Record<string, number> = {
  "ا": 1,  "آ": 2,  "ب": 3,  "پ": 4,
  "ت": 5,  "ٹ": 6,  "ث": 7,  "ج": 8,
  "چ": 9,  "ح": 10, "خ": 11, "د": 12,
  "ڈ": 13, "ذ": 14, "ر": 15, "ڑ": 16,
  "ز": 17, "ژ": 18, "س": 19, "ش": 20,
  "ص": 21, "ض": 22, "ط": 23, "ظ": 24,
  "ع": 25, "غ": 26, "ف": 27, "ق": 28,
  "ک": 29, "گ": 30, "ل": 31, "م": 32,
  "ن": 33, "ں": 34, "و": 35, "ہ": 36,
  "ھ": 37, "ء": 38, "ی": 39, "ے": 40,
};

const CARD_GRADIENT = "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))";
const CARD_SHADOW = "oklch(0.4 0.18 40 / 0.85)";

const NO_ITEMS_LETTERS = new Set<number>([16, 18, 34, 37, 38, 40]);

// ═══════════════════════════════════════════════════════════════
//  ⬆️ LETTER VERTICAL OFFSETS (EM-based)
// ═══════════════════════════════════════════════════════════════

const LETTER_Y_OFFSETS: Record<number, string> = {
  1: "-0.10em",
  2: "-0.10em",
  3: "-0.45em",  4: "-0.55em",  5: "-0.15em",  6: "-0.15em",
  7: "-0.15em",  8: "-0.40em",  9: "-0.40em",  10: "-0.40em",
  11: "-0.15em",
  12: "-0.35em",  13: "-0.1em",  14: "-0.1em",  15: "-0.35em",
  16: "-0.1em",  17: "-0.1em",  18: "-0.1em",
  19: "-0.40em",  20: "-0.30em",  21: "-0.40em",  22: "-0.35em",
  23: "-0.35em",  24: "-0.35em",  25: "-0.35em",  26: "-0.35em",
  27: "-0.10em",  28: "-0.40em",
  29: "0em",  30: "0em",  31: "-0.10em",  32: "-0.50em",
  33: "-0.50em", 34: "-0.1em",
  35: "-0.35em",
  36: "-0.35em",  37: "0em",  38: "0em",
  39: "-0.40em", 40: "-0.35em",
};

function getLetterOffset(letterNum: number): string {
  return LETTER_Y_OFFSETS[letterNum] ?? "0em";
}

// ═══════════════════════════════════════════════════════════════
//  🔠 LETTER SIZE SCALE
// ═══════════════════════════════════════════════════════════════

const LETTER_SIZE_SCALE: Record<number, number> = {
  1: 1.0,
  2: 1.0,
  3: 1.0,  4: 1.0,  5: 1.0,  6: 1.0,
  7: 1.0,  8: 1.0,  9: 1.0,  10: 1.0,
  11: 0.7,
  12: 1.7,  13: 1.0,  14: 1.0,  15: 1.7,
  16: 2.0,  17: 1.0,  18: 1.0,
  19: 1.0,  20: 0.8,  21: 1.0,  22: 1.0,
  23: 1.3,  24: 1.3,  25: 1.0,  26: 0.8,
  27: 1.0,  28: 1.0,
  29: 0.8,  30: 0.8,  31: 0.7,  32: 0.9,
  33: 1.0,  34: 1.0,
  35: 1.7,
  36: 1.8,  37: 1.0,  38: 1.0,
  39: 1.0, 40: 1.0,
};

function getLetterSizeScale(letterNum: number): number {
  return LETTER_SIZE_SCALE[letterNum] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════
//  📦 OUTLINE BOX FIXED DIMENSIONS
// ═══════════════════════════════════════════════════════════════

const OUTLINE_BOX_WIDTH = "min(26vh, 220px)";
const OUTLINE_BOX_HEIGHT = "min(20vh, 200px)";

const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

const ANIMATION_CSS = `
  @keyframes h5ipp-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes h5ipp-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes h5ipp-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes h5ipp-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes h5ipp-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes h5ipp-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @keyframes h5ipp-card-result-pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes h5ipp-screen-vanish {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes h5ipp-card-center-zoom {
    0%   { opacity: 0; transform: scale(0.5) translateY(30px); }
    60%  { opacity: 1; transform: scale(1.15) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes h5ipp-card-center-exit {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.2); }
  }
  @keyframes h5ipp-locked-bounce {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.08); }
    60%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes h5ipp-session-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.96); }
  }
  @keyframes h5ipp-session-fade-in {
    0%   { opacity: 0; transform: scale(0.96); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes h5ipp-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .h5ipp-pop-in { animation: h5ipp-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .h5ipp-shake { animation: h5ipp-shake 0.45s ease-in-out; }
  .h5ipp-bounce-in { animation: h5ipp-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .h5ipp-celebration-pop { 
    animation: h5ipp-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .h5ipp-celebration-fade-out {
    animation: h5ipp-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .h5ipp-card-select { animation: h5ipp-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .h5ipp-card-result-pop { animation: h5ipp-card-result-pop 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .h5ipp-screen-vanish { animation: h5ipp-screen-vanish 0.4s ease-out forwards; }
  .h5ipp-card-center-zoom { animation: h5ipp-card-center-zoom 0.6s cubic-bezier(.34,1.56,.64,1) both; }
  .h5ipp-card-center-exit { animation: h5ipp-card-center-exit 0.4s ease-in forwards; }
  .h5ipp-locked-bounce { animation: h5ipp-locked-bounce 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .h5ipp-session-fade-out { animation: h5ipp-session-fade-out 0.4s ease-out forwards; }
  .h5ipp-session-fade-in { animation: h5ipp-session-fade-in 0.4s ease-in forwards; }

  .h5ipp-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .h5ipp-lock-overlay-enter {
    animation: h5ipp-overlay-enter 0.15s ease-out both;
  }
  @keyframes h5ipp-overlay-enter {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// ─── Types ──────────────────────────────────────────────────────

interface Item {
  id: string;
  name: string;
  svgUrl: string;
  isCorrect: boolean;
  sourceLetterNumber: number;
}

type Session = 1 | 2;

interface Props {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
  subject: string;
  level: number;
  lessonId: number;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 HELPERS
// ═══════════════════════════════════════════════════════════════

function prettyNameFromId(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function pickRandomDistractors(
  count: number,
  currentLetterNum: number,
  otherLetterNum: number,
  alreadyUsedIds: Set<string>,
): Array<{ id: string; letterNum: number }> {
  if (count <= 0) return [];

  const usedIds = new Set(alreadyUsedIds);
  const result: Array<{ id: string; letterNum: number }> = [];

  const eligibleLetters: number[] = [];
  for (let num = 1; num <= 40; num++) {
    if (num === currentLetterNum) continue;
    if (num === otherLetterNum) continue;
    if (NO_ITEMS_LETTERS.has(num)) continue;
    const items = getItemsForLetter(num);
    if (items.length === 0) continue;
    eligibleLetters.push(num);
  }

  const shuffledLetters = [...eligibleLetters];
  for (let i = shuffledLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledLetters[i], shuffledLetters[j]] = [shuffledLetters[j], shuffledLetters[i]];
  }

  for (const letterNum of shuffledLetters) {
    if (result.length >= count) break;

    const items = getItemsForLetter(letterNum);
    const available = items.filter((id) => !usedIds.has(id));
    if (available.length === 0) continue;

    const randomIdx = Math.floor(Math.random() * available.length);
    const chosenId = available[randomIdx];

    result.push({ id: chosenId, letterNum });
    usedIds.add(chosenId);
  }

  if (result.length < count) {
    for (const letterNum of shuffledLetters) {
      if (result.length >= count) break;
      const items = getItemsForLetter(letterNum);
      for (const id of items) {
        if (result.length >= count) break;
        if (usedIds.has(id)) continue;
        result.push({ id, letterNum });
        usedIds.add(id);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — Simple count-based (NO "on Attempt N")
// ═══════════════════════════════════════════════════════════════

interface SessionAttempts {
  session1WrongCount: number;
  session2WrongCount: number;
  session1Completed: boolean;
  session2Completed: boolean;
  session1TotalCorrect: number;
  session2TotalCorrect: number;
}

function buildLetter1Summary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  totalCorrect: number,
  wrongCount: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const letterLabel = letter1Name ? `'${letter1}' (${letter1Name})` : `'${letter1}'`;

  if (wrongCount === 0) {
    return `${studentName} successfully selected all ${totalCorrect} items of the first letter ${letterLabel} correctly on the very first attempt.`;
  }

  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting all ${totalCorrect} items of the first letter ${letterLabel}.`;
}

function buildLetter2Summary(
  studentName: string,
  letter2: string,
  letter2Name: string,
  totalCorrect: number,
  wrongCount: number,
  completed: boolean,
  wasAttempted: boolean,
): string {
  if (!wasAttempted) {
    return `Not attempted.`;
  }

  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const letterLabel = letter2Name ? `'${letter2}' (${letter2Name})` : `'${letter2}'`;

  if (wrongCount === 0) {
    return `${studentName} successfully selected all ${totalCorrect} items of the second letter ${letterLabel} correctly on the very first attempt.`;
  }

  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting all ${totalCorrect} items of the second letter ${letterLabel}.`;
}

function buildFullSummary(
  studentName: string,
  letter1: string, letter1Name: string,
  letter2: string, letter2Name: string,
  data: SessionAttempts,
  session1Exists: boolean,
  session2Exists: boolean,
): string {
  const parts: string[] = [];

  if (session1Exists) {
    const line1 = buildLetter1Summary(
      studentName, letter1, letter1Name,
      data.session1TotalCorrect, data.session1WrongCount, data.session1Completed,
    );
    parts.push(`First Letter:\n${line1}`);
  }

  if (session2Exists) {
    const secondWasAttempted = data.session2Completed || data.session2WrongCount > 0;
    const line2 = buildLetter2Summary(
      studentName, letter2, letter2Name,
      data.session2TotalCorrect, data.session2WrongCount, data.session2Completed,
      secondWasAttempted,
    );
    parts.push(`Second Letter:\n${line2}`);
  }

  return parts.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiItemsPickBase({
  letter1, letter1Name, letter2, letter2Name,
  subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();

  const letter1Number = LETTER_TO_NUMBER[letter1] || 0;
  const letter2Number = LETTER_TO_NUMBER[letter2] || 0;

  const session1Items = letter1Number ? getItemsForLetter(letter1Number) : [];
  const session2Items = letter2Number ? getItemsForLetter(letter2Number) : [];

  const session1Exists = session1Items.length > 0;
  const session2Exists = session2Items.length > 0;
  const hasAnySession = session1Exists || session2Exists;

  const [session, setSession] = useState<Session>(1);
  const [sessionTransitioning, setSessionTransitioning] = useState(false);

  const currentLetter = session === 1 ? letter1 : letter2;
  const currentLetterNumber = session === 1 ? letter1Number : letter2Number;
  const currentSessionItems = session === 1 ? session1Items : session2Items;

  const [gameItems, setGameItems] = useState<Item[]>([]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [foundCorrectCount, setFoundCorrectCount] = useState(0);
  const [playingLockedIndex, setPlayingLockedIndex] = useState<number | null>(null);

  const [isInitialLocked, setIsInitialLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INITIAL_LOCK_DURATION = 4000;

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");
  const [showCardAnimation, setShowCardAnimation] = useState(false);
  const [cardAnimationPhase, setCardAnimationPhase] = useState<"idle" | "zoom" | "exit">("idle");
  const [animatingCardIndex, setAnimatingCardIndex] = useState<number | null>(null);
  const [vanish, setVanish] = useState(false);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);

  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vanishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMountedRef = useRef(true);
  const introPlayedRef = useRef<Record<Session, boolean>>({ 1: false, 2: false });
  const isNavigatingRef = useRef(false);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const s1WrongCountRef = useRef<number>(0);
  const s2WrongCountRef = useRef<number>(0);
  const s1CompletedRef = useRef<boolean>(false);
  const s2CompletedRef = useRef<boolean>(false);
  const s1TotalCorrectRef = useRef<number>(0);
  const s2TotalCorrectRef = useRef<number>(0);

  const totalCorrect = currentSessionItems.length;

  const currentLetterYOffset = getLetterOffset(currentLetterNumber);

  const BASE_LETTER_FONT_SIZE = "min(14vh, 140px)";
  const currentLetterSizeScale = getLetterSizeScale(currentLetterNumber);
  const currentLetterFontSize = `calc(${BASE_LETTER_FONT_SIZE} * ${currentLetterSizeScale})`;

  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
  }, []);

  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => stopAudio(audio));
    audioRefs.current = [];
    setIsIntroPlaying(false);
  }, [stopAudio]);

  const playMultipleAudios = useCallback(
    (srcs: string[]): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();
        let completedCount = 0;
        const totalFiles = srcs.length;
        let isResolved = false;
        srcs.forEach((src) => {
          try {
            const audio = new Audio(src);
            audioRefs.current.push(audio);
            const done = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                audioRefs.current = [];
                resolve();
              }
            };
            audio.onended = done;
            audio.onerror = done;
            audio.play().catch(done);
          } catch {
            completedCount++;
            if (completedCount >= totalFiles && !isResolved) {
              isResolved = true;
              audioRefs.current = [];
              resolve();
            }
          }
        });
      });
    },
    [stopAllAudio],
  );

  const playAudio = useCallback(
    (src: string, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();
        try {
          const audio = new Audio(src);
          audioRefs.current.push(audio);
          const finish = () => {
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        } catch {
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  const playResultAudio = useCallback(
    (isCorrectResult: boolean): Promise<void> => {
      const srcs = isCorrectResult ? [correctMP3, correctWAV] : [wrongMP3, wrongWAV];
      return playMultipleAudios(srcs);
    },
    [playMultipleAudios],
  );

  const playIntroAudio = useCallback(
    (sessionNum: Session) => {
      if (introPlayedRef.current[sessionNum]) return;
      const letterNum = sessionNum === 1 ? letter1Number : letter2Number;
      const introUrl = getIntroAudioUrl(letterNum);
      if (!introUrl) {
        introPlayedRef.current[sessionNum] = true;
        return;
      }
      setIsIntroPlaying(true);
      playAudio(introUrl, () => {
        setIsIntroPlaying(false);
        introPlayedRef.current[sessionNum] = true;
      });
    },
    [letter1Number, letter2Number, playAudio],
  );

  const playItemAudio = useCallback(
    (item: Item): Promise<void> => {
      return new Promise((resolve) => {
        const url = getItemAudioUrl(item.sourceLetterNumber, item.id);
        if (!url) { resolve(); return; }
        playAudio(url, () => resolve());
      });
    },
    [playAudio],
  );

  const playLockedCardAudio = useCallback(
    (item: Item): Promise<void> => {
      return new Promise((resolve) => {
        const url = getItemAudioUrl(item.sourceLetterNumber, item.id);
        if (!url) { resolve(); return; }
        playAudio(url, () => {
          setPlayingLockedIndex(null);
          resolve();
        });
      });
    },
    [playAudio],
  );

  const goToLevelPopup = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
  }, [navigate, subject, level, stopAllAudio]);

  const startInitialLock = useCallback(() => {
    setIsInitialLocked(true);
    setShowLockOverlay(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsInitialLocked(false);
      setShowLockOverlay(false);
    }, INITIAL_LOCK_DURATION);
  }, []);

  const initializeSession = useCallback(
    (sessionNum: Session) => {
      if (sessionNum === 1 && !session1Exists) return;
      if (sessionNum === 2 && !session2Exists) return;

      const sourceLetterNum = sessionNum === 1 ? letter1Number : letter2Number;
      const otherLetterNum = sessionNum === 1 ? letter2Number : letter1Number;
      const sessionItemIds = sessionNum === 1 ? session1Items : session2Items;

      const correctItems: Item[] = sessionItemIds.map((id) => ({
        id,
        name: prettyNameFromId(id),
        svgUrl: getItemSvgUrl(sourceLetterNum, id),
        isCorrect: true,
        sourceLetterNumber: sourceLetterNum,
      }));

      const usedIds = new Set(correctItems.map((it) => it.id));

      const distractorsNeeded = Math.max(0, 8 - correctItems.length);

      const distractorsPicked = pickRandomDistractors(
        distractorsNeeded,
        sourceLetterNum,
        otherLetterNum,
        usedIds,
      );

      const distractorItems: Item[] = distractorsPicked.map((d) => ({
        id: d.id,
        name: prettyNameFromId(d.id),
        svgUrl: getItemSvgUrl(d.letterNum, d.id),
        isCorrect: false,
        sourceLetterNumber: d.letterNum,
      }));

      const allItems = [...correctItems, ...distractorItems];

      const shuffled = [...allItems];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      console.log('[HuroofPick] Session', sessionNum, {
        correct: correctItems.length,
        distractors: distractorItems.length,
        total: shuffled.length,
      });

      setGameItems(shuffled);
      setLockedIndices(new Set());
      setSelectedIndex(null);
      setResult(null);
      setIsLocked(false);
      setFoundCorrectCount(0);
      setPlayingLockedIndex(null);

      if (sessionNum === 1) {
        s1TotalCorrectRef.current = correctItems.length;
        s1WrongCountRef.current = 0;
      } else {
        s2TotalCorrectRef.current = correctItems.length;
        s2WrongCountRef.current = 0;
      }

      setShowCelebration(false);
      setCelebrationPhase("idle");
      setShowCardAnimation(false);
      setCardAnimationPhase("idle");
      setAnimatingCardIndex(null);
      setVanish(false);

      startInitialLock();

      setTimeout(() => {
        if (isMountedRef.current) {
          playIntroAudio(sessionNum);
        }
      }, 600);
    },
    [
      session1Exists, session2Exists, session1Items, session2Items,
      letter1Number, letter2Number, startInitialLock, playIntroAudio,
    ],
  );

  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    s1WrongCountRef.current = 0;
    s2WrongCountRef.current = 0;
    s1CompletedRef.current = false;
    s2CompletedRef.current = false;
    s1TotalCorrectRef.current = 0;
    s2TotalCorrectRef.current = 0;

    if (!hasAnySession) {
      console.warn("[HuroofPick] No items — finishing lesson");
      setTimeout(() => goToLevelPopup(), 300);
      return () => { isMountedRef.current = false; };
    }

    const startSession: Session = session1Exists ? 1 : 2;
    setSession(startSession);
    initializeSession(startSession);

    return () => {
      isMountedRef.current = false;
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      stopAllAudio();

      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (vanishTimerRef.current) clearTimeout(vanishTimerRef.current);
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || "Student";

            const attempts: SessionAttempts = {
              session1WrongCount: s1WrongCountRef.current,
              session2WrongCount: s2WrongCountRef.current,
              session1Completed: s1CompletedRef.current,
              session2Completed: s2CompletedRef.current,
              session1TotalCorrect: s1TotalCorrectRef.current,
              session2TotalCorrect: s2TotalCorrectRef.current,
            };

            const summary = buildFullSummary(
              studentName,
              letter1, letter1Name || "",
              letter2, letter2Name || "",
              attempts,
              session1Exists, session2Exists,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject, level, lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter1, letter1Name, letter2, letter2Name,
                session1WrongCount: s1WrongCountRef.current,
                session2WrongCount: s2WrongCountRef.current,
                session1Completed: s1CompletedRef.current,
                session2Completed: s2CompletedRef.current,
                session1TotalCorrect: s1TotalCorrectRef.current,
                session2TotalCorrect: s2TotalCorrectRef.current,
                session1Exists, session2Exists,
                completed: false,
              },
            }).catch((err) => console.warn("[HuroofPick] Save partial failed:", err));
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardSelect = useCallback(
    (index: number) => {
      if (isInitialLocked) return;
      if (isLocked) return;
      if (lockedIndices.has(index)) return;
      if (selectedIndex !== null) return;
      if (showCardAnimation) return;
      if (isNavigatingRef.current) return;

      const item = gameItems[index];
      if (!item) return;

      setIsLocked(true);
      setSelectedIndex(index);

      if (item.isCorrect) {
        setResult("correct");
        if (isIntroPlaying) stopAllAudio();
        setShowCelebration(true);
        setCelebrationPhase("pop");

        playResultAudio(true).then(() => {
          setCelebrationPhase("fade");
          celebrationTimerRef.current = setTimeout(() => {
            setShowCelebration(false);
            setCelebrationPhase("idle");
            setLockedIndices((prev) => new Set(prev).add(index));
            const newCount = foundCorrectCount + 1;
            setFoundCorrectCount(newCount);
            setSelectedIndex(null);
            setResult(null);
            startCardAnimation(index, newCount);
          }, 500);
        });
      } else {
        if (session === 1) {
          s1WrongCountRef.current += 1;
        } else {
          s2WrongCountRef.current += 1;
        }

        setResult("wrong");
        if (isIntroPlaying) stopAllAudio();
        playResultAudio(false).then(() => {
          setResult(null);
          setSelectedIndex(null);
          setIsLocked(false);
          const nonLockedIndices = gameItems
            .map((_, idx) => idx)
            .filter((idx) => !lockedIndices.has(idx));
          const shuffled = [...nonLockedIndices];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          const newItems = [...gameItems];
          const nonLockedItems = shuffled.map((idx) => gameItems[idx]);
          shuffled.forEach((idx, i) => { newItems[idx] = nonLockedItems[i]; });
          setGameItems(newItems);
          setIsLocked(false);
        });
      }
    },
    [
      isInitialLocked, gameItems, isLocked, lockedIndices, selectedIndex,
      showCardAnimation, isIntroPlaying, foundCorrectCount,
      stopAllAudio, playResultAudio, session,
    ],
  );

  const handleLockedCardTap = useCallback(
    (index: number) => {
      if (showCardAnimation) return;
      if (isNavigatingRef.current) return;
      const item = gameItems[index];
      if (!item) return;
      if (!lockedIndices.has(index)) return;
      setPlayingLockedIndex(index);
      playLockedCardAudio(item).then(() => setPlayingLockedIndex(null));
    },
    [gameItems, lockedIndices, showCardAnimation, playLockedCardAudio],
  );

  const startCardAnimation = useCallback(
    (index: number, newCount: number) => {
      const item = gameItems[index];
      if (!item) return;
      const isSessionComplete = newCount >= totalCorrect;

      setAnimatingCardIndex(index);
      setVanish(true);

      vanishTimerRef.current = setTimeout(() => {
        setShowCardAnimation(true);
        setCardAnimationPhase("zoom");

        playItemAudio(item).then(() => {
          setCardAnimationPhase("exit");

          cardTimerRef.current = setTimeout(() => {
            setShowCardAnimation(false);
            setCardAnimationPhase("idle");
            setAnimatingCardIndex(null);
            setVanish(false);

            if (isSessionComplete) {
              if (session === 1) {
                s1CompletedRef.current = true;
                setSessionTransitioning(true);

                sessionTimerRef.current = setTimeout(() => {
                  if (!isMountedRef.current) return;
                  if (session2Exists) {
                    setSession(2);
                    setSessionTransitioning(false);
                    setTimeout(() => {
                      if (isMountedRef.current) initializeSession(2);
                    }, 300);
                  } else {
                    setSessionTransitioning(false);
                    finishAllSessions();
                  }
                }, 500);
              } else {
                s2CompletedRef.current = true;
                finishAllSessions();
              }
            } else {
              setIsLocked(false);
              const nonLockedIndices = gameItems
                .map((_, idx) => idx)
                .filter((idx) => idx !== index && !lockedIndices.has(idx));
              if (nonLockedIndices.length > 0) {
                const shuffled = [...nonLockedIndices];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                const newItems = [...gameItems];
                const nonLockedItems = shuffled.map((idx) => gameItems[idx]);
                shuffled.forEach((idx, i) => { newItems[idx] = nonLockedItems[i]; });
                setGameItems(newItems);
              }
            }
          }, 400);
        });
      }, 400);
    },
    [
      gameItems, lockedIndices, playItemAudio,
      session, session2Exists, initializeSession, totalCorrect,
    ],
  );

  const finishAllSessions = useCallback(() => {
    if (isNavigatingRef.current) return;
    setVanish(true);

    if (!completedRef.current && !progressSavedRef.current) {
      completedRef.current = true;
      progressSavedRef.current = true;

      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const sessionData = getSession();
      if (sessionData?.student) {
        const studentName = sessionData.student.studentName || "Student";

        const attempts: SessionAttempts = {
          session1WrongCount: s1WrongCountRef.current,
          session2WrongCount: s2WrongCountRef.current,
          session1Completed: s1CompletedRef.current,
          session2Completed: s2CompletedRef.current,
          session1TotalCorrect: s1TotalCorrectRef.current,
          session2TotalCorrect: s2TotalCorrectRef.current,
        };

        const summary = buildFullSummary(
          studentName,
          letter1, letter1Name || "",
          letter2, letter2Name || "",
          attempts,
          session1Exists, session2Exists,
        );

        saveProgress({
          studentId: sessionData.student.studentId,
          deviceToken: sessionData.student.token,
          subject, level, lessonId,
          status: "completed",
          timeSpentSec: elapsed,
          summary,
          gameData: {
            letter1, letter1Name, letter2, letter2Name,
            session1WrongCount: s1WrongCountRef.current,
            session2WrongCount: s2WrongCountRef.current,
            session1Completed: s1CompletedRef.current,
            session2Completed: s2CompletedRef.current,
            session1TotalCorrect: s1TotalCorrectRef.current,
            session2TotalCorrect: s2TotalCorrectRef.current,
            session1Exists, session2Exists,
            completed: true,
          },
        }).catch((err) => console.warn("[HuroofPick] Save completed failed:", err));
      }
    }

    navigateTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) goToLevelPopup();
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    letter1, letter1Name, letter2, letter2Name,
    subject, level, lessonId,
    session1Exists, session2Exists, goToLevelPopup,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  if (showCardAnimation && animatingCardIndex !== null) {
    const item = gameItems[animatingCardIndex];
    if (!item) return null;

    return (
      <div dir="rtl" className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        <div className={`relative z-10 ${cardAnimationPhase === "zoom" ? "h5ipp-card-center-zoom" : cardAnimationPhase === "exit" ? "h5ipp-card-center-exit" : ""}`}>
          <div
            className="clay-sm flex flex-col items-center justify-center rounded-3xl border-4 border-white p-6"
            style={{
              ["--clay-shadow" as string]: CARD_SHADOW,
              width: "min(72vh, 560px)",
              height: "min(72vh, 560px)",
              maxWidth: "90vw", maxHeight: "90vh",
              background: CARD_GRADIENT,
            }}
          >
            <img src={item.svgUrl} alt={item.name} className="pointer-events-none" style={{ width: "88%", height: "88%", objectFit: "contain" }} />
          </div>
        </div>
      </div>
    );
  }

  if (gameItems.length === 0 && hasAnySession) {
    return (
      <div dir="rtl" className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-kid border-t-transparent" />
          <p className="text-sm font-bold text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAnySession) {
    return (
      <div dir="rtl" className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <p className="text-lg font-extrabold text-gray-700">No items available for this lesson</p>
      </div>
    );
  }

  const isGameLocked =
    isInitialLocked || isLocked || isNavigatingRef.current || sessionTransitioning;

  const cols = 4;

  return (
    <div
      dir="rtl"
      className={`relative flex h-full w-full select-none flex-col items-center overflow-hidden p-2 sm:p-3 ${
        vanish ? "h5ipp-screen-vanish" : ""
      } ${sessionTransitioning ? "h5ipp-session-fade-out" : "h5ipp-session-fade-in"}`}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="h5ipp-lock-overlay h5ipp-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl z-50 pointer-events-none ${
            celebrationPhase === "pop" ? "h5ipp-celebration-pop" : celebrationPhase === "fade" ? "h5ipp-celebration-fade-out" : ""
          }`}
        >
          <div className="h-[110%] w-[110%]">
            <img src={CelebrationSVG} alt="Celebration" className="h-full w-full object-contain" style={{ pointerEvents: "none" }} />
          </div>
        </div>
      )}

      <div className={`flex flex-col w-full h-full max-w-7xl ${isGameLocked ? "pointer-events-none" : ""}`}>
        {/* ─── TOP: Letter Outline (FIXED SIZE) ─── */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-1 pb-2">
          <div className="h5ipp-pop-in">
            <div
              className="flex items-center justify-center rounded-3xl bg-white/60"
              style={{
                border: `6px solid ${CARD_SHADOW.replace("/ 0.85", "/ 0.9")}`,
                padding: "min(2vh, 16px) min(3.5vh, 32px)",
                width: OUTLINE_BOX_WIDTH,
                height: OUTLINE_BOX_HEIGHT,
                boxSizing: "border-box",
                boxShadow: "0 6px 0 0 rgba(0,0,0,0.06), 0 12px 28px -10px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  lineHeight: 1,
                  width: "100%",
                  height: "100%",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: currentLetterFontSize,
                    color: "oklch(0.55 0.18 40)",
                    textShadow: "0 3px 10px rgba(0,0,0,0.08)",
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                    display: "block",
                    textAlign: "center",
                    position: "relative",
                    top: currentLetterYOffset,
                    transition: "top 0.2s ease, font-size 0.2s ease",
                  }}
                >
                  {currentLetter}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM: 4×2 Cards Grid ─── */}
        <div className="flex-1 min-h-0 w-full pb-3 flex items-center justify-center">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridAutoRows: "1fr",
              columnGap: "min(2.5vh, 26px)",
              rowGap: "min(2.2vh, 22px)",
              width: "min(92%, 960px)",
              maxHeight: "100%",
              padding: "min(1.5vh, 14px) min(1vh, 10px)",
              margin: "0 auto",
              boxSizing: "border-box",
              placeItems: "center",
            }}
          >
            {gameItems.map((item, index) => {
              const isLockedCard = lockedIndices.has(index);
              const isSelected = selectedIndex === index;
              const isCorrect = result === "correct" && isSelected;
              const isWrong = result === "wrong" && isSelected;
              const isPlayingLocked = playingLockedIndex === index;

              let showIcon = false;
              let icon = null;
              let iconBgColor = "";
              let scaleClass = "hover:scale-[1.03]";
              let cardBackground = CARD_GRADIENT;
              let cardShadow = CARD_SHADOW;
              let borderColor = "white";
              let bounceClass = "";

              if (isLockedCard) {
                cardBackground = "linear-gradient(145deg, oklch(0.62 0.2 148), oklch(0.5 0.19 148))";
                cardShadow = "oklch(0.48 0.19 148 / 0.85)";
                borderColor = "#16A34A";
                showIcon = true;
                icon = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-green-600";
                scaleClass = "hover:scale-[1.03] cursor-pointer";
                if (isPlayingLocked) bounceClass = "h5ipp-locked-bounce";
              } else if (isSelected && isCorrect) {
                cardBackground = "linear-gradient(145deg, oklch(0.62 0.2 148), oklch(0.5 0.19 148))";
                cardShadow = "oklch(0.48 0.19 148 / 0.85)";
                borderColor = "#16A34A";
                showIcon = true;
                icon = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-green-600";
                scaleClass = "h5ipp-card-result-pop";
              } else if (isSelected && isWrong) {
                cardBackground = "linear-gradient(145deg, oklch(0.6 0.22 27), oklch(0.5 0.22 27))";
                cardShadow = "oklch(0.45 0.22 27 / 0.85)";
                borderColor = "#DC2626";
                showIcon = true;
                icon = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-red-600";
                scaleClass = "h5ipp-shake h5ipp-card-result-pop";
              } else {
                const isProcessing =
                  isInitialLocked || isLocked || selectedIndex !== null || isNavigatingRef.current;
                if (isProcessing) scaleClass += " opacity-60 cursor-not-allowed";
              }

              const handleClick = () => {
                if (isLockedCard) handleLockedCardTap(index);
                else handleCardSelect(index);
              };

              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={handleClick}
                  disabled={(!isLockedCard && (isInitialLocked || isLocked)) || isNavigatingRef.current}
                  className={`
                    h5ipp-pop-in clay-sm relative flex flex-col items-center justify-center
                    rounded-3xl border-4 transition-all duration-200
                    ${scaleClass} ${bounceClass}
                    ${isSelected && !isLockedCard ? "h5ipp-card-select" : ""}
                    ${isLockedCard ? "cursor-pointer" : ""}
                  `}
                  style={{
                    ["--clay-shadow" as string]: cardShadow,
                    width: "100%",
                    height: "100%",
                    aspectRatio: "1 / 1",
                    maxWidth: "min(21vh, 210px)",
                    maxHeight: "min(21vh, 210px)",
                    padding: "12px",
                    background: cardBackground,
                    borderColor,
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={item.svgUrl}
                      alt={item.name}
                      className="pointer-events-none select-none"
                      draggable={false}
                      style={{
                        width: "80%", height: "80%",
                        objectFit: "contain",
                        maxWidth: "100%", maxHeight: "100%",
                      }}
                    />
                  </div>

                  {showIcon && icon && (
                    <span
                      className={`h5ipp-bounce-in absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-10 sm:w-10 ${iconBgColor} text-white`}
                    >
                      {icon}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HuroofETahajjiItemsPickBase;