// src/components/games/English/Alphabet-Letter5Items Pick/AlphabetLetter5ItemsPickBase.tsx
// ✅ Progress tracking ENABLED
// ✅ Summary: Simple format (wrong count only)
// ✅ On complete → navigate to /levels popup
// ✅ Partial save on unmount (before leaving)

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { getItemSvgUrl } from "./svgMap";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

// 🔥 INTRO AUDIO
const IntroAudio = "/assets/Alphabet-Letter5Items Pick Audios/Intro Audio A-Z.wav";

// ─── Import Item Audio Map ──────────────────────────────
import { getItemAudioUrl } from "@/components/games/English/Alphabet-Letter5Items Introduction/audioMap";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = "english") {
  const colors: Record<
    string,
    { letterColor: string; cardBg: string; cardShadow: string }
  > = {
    english: {
      letterColor: "#4D82F6",
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
    },
    math: {
      letterColor: "#2E8B57",
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
    },
    urdu: {
      letterColor: "#CC6B2C",
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
    },
  };
  return colors[subject] || colors.english;
}

// ─── 🔥 ITEMS MAP ──────────────────────────────────────────────
const CORRECT_ITEMS_MAP: Record<string, string[]> = {
  a: ["aeroplane", "alligator", "ant", "apple", "axe"],
  b: ["bag", "ball", "banana", "book", "bus"],
  c: ["cake", "car", "cat", "clock", "cow"],
  d: ["deer", "dog", "door", "drum", "duck"],
  e: ["eagle", "ear", "egg", "elephant", "eye"],
  f: ["fan", "fish", "flower", "fox", "frog"],
  g: ["gift", "giraffe", "goat", "grapes", "grass"],
  h: ["hat", "heart", "hen", "horse", "house"],
  i: ["ice", "icecream", "igloo", "injection", "iron"],
  j: ["jacket", "jar", "jellyfish", "joker", "juice"],
  k: ["kangaroo", "key", "king", "kite", "kiwi"],
  l: ["ladder", "lamp", "leaf", "lemon", "lion"],
  m: ["mango", "monkey", "moon", "mouse", "mouth"],
  n: ["necklace", "newspaper", "night", "nose", "nurse"],
  o: ["octopus", "onion", "orange", "outfit", "owl"],
  p: ["parrot", "peach", "pencil", "penguin", "pineapple"],
  q: ["quail", "queen", "questionmark", "quil", "quiver"],
  r: ["rabbit", "rainbow", "ring", "robot", "rose"],
  s: ["ship", "snake", "star", "stick", "sun"],
  t: ["tiger", "toothbrush", "train", "tree", "turtle"],
  u: ["ufo", "umbrella", "unicorn", "uniform", "up"],
  v: ["van", "vase", "vegetables", "violin", "vulture"],
  w: ["watch", "watermelon", "whale", "window", "wolf"],
  x: ["box", "six", "x-ray", "xerus", "xylophone"],
  y: ["yak", "yarn", "yatch", "yogurt", "yoyo"],
  z: ["zebra", "zero", "zip", "zombie", "zucchini"],
};

// ─── RANDOM ITEMS POOL ──────────────────────────────────────────
const RANDOM_POOL: Record<string, Array<{ id: string; letter: string }>> = {
  a: [
    { id: "rainbow", letter: "R" },
    { id: "yogurt", letter: "Y" },
    { id: "ring", letter: "R" },
    { id: "giraffe", letter: "G" },
    { id: "quiver", letter: "Q" },
  ],
  b: [
    { id: "goat", letter: "G" },
    { id: "frog", letter: "F" },
    { id: "ship", letter: "S" },
    { id: "cat", letter: "C" },
    { id: "house", letter: "H" },
  ],
  c: [
    { id: "jellyfish", letter: "J" },
    { id: "book", letter: "B" },
    { id: "joker", letter: "J" },
    { id: "fan", letter: "F" },
    { id: "wolf", letter: "W" },
  ],
  d: [
    { id: "ear", letter: "E" },
    { id: "goat", letter: "G" },
    { id: "jellyfish", letter: "J" },
    { id: "ant", letter: "A" },
    { id: "penguin", letter: "P" },
  ],
  e: [
    { id: "injection", letter: "I" },
    { id: "bag", letter: "B" },
    { id: "onion", letter: "O" },
    { id: "ring", letter: "R" },
    { id: "window", letter: "W" },
  ],
  f: [
    { id: "questionmark", letter: "Q" },
    { id: "injection", letter: "I" },
    { id: "key", letter: "K" },
    { id: "vulture", letter: "V" },
    { id: "quail", letter: "Q" },
  ],
  g: [
    { id: "monkey", letter: "M" },
    { id: "newspaper", letter: "N" },
    { id: "cow", letter: "C" },
    { id: "jacket", letter: "J" },
    { id: "eagle", letter: "E" },
  ],
  h: [
    { id: "book", letter: "B" },
    { id: "bag", letter: "B" },
    { id: "night", letter: "N" },
    { id: "penguin", letter: "P" },
    { id: "turtle", letter: "T" },
  ],
  i: [
    { id: "ant", letter: "A" },
    { id: "cat", letter: "C" },
    { id: "drum", letter: "D" },
    { id: "grapes", letter: "G" },
    { id: "king", letter: "K" },
  ],
  j: [
    { id: "igloo", letter: "I" },
    { id: "ladder", letter: "L" },
    { id: "door", letter: "D" },
    { id: "grapes", letter: "G" },
    { id: "axe", letter: "A" },
  ],
  k: [
    { id: "outfit", letter: "O" },
    { id: "door", letter: "D" },
    { id: "alligator", letter: "A" },
    { id: "giraffe", letter: "G" },
    { id: "penguin", letter: "P" },
  ],
  l: [
    { id: "apple", letter: "A" },
    { id: "rabbit", letter: "R" },
    { id: "tiger", letter: "T" },
    { id: "fish", letter: "F" },
    { id: "outfit", letter: "O" },
  ],
  m: [
    { id: "yarn", letter: "Y" },
    { id: "fox", letter: "F" },
    { id: "gift", letter: "G" },
    { id: "pencil", letter: "P" },
    { id: "vegetables", letter: "V" },
  ],
  n: [
    { id: "house", letter: "H" },
    { id: "rose", letter: "R" },
    { id: "cake", letter: "C" },
    { id: "zero", letter: "Z" },
    { id: "watch", letter: "W" },
  ],
  o: [
    { id: "deer", letter: "D" },
    { id: "heart", letter: "H" },
    { id: "wolf", letter: "W" },
    { id: "stick", letter: "S" },
    { id: "cake", letter: "C" },
  ],
  p: [
    { id: "violin", letter: "V" },
    { id: "heart", letter: "H" },
    { id: "robot", letter: "R" },
    { id: "banana", letter: "B" },
    { id: "frog", letter: "F" },
  ],
  q: [
    { id: "duck", letter: "D" },
    { id: "onion", letter: "O" },
    { id: "snake", letter: "S" },
    { id: "cat", letter: "C" },
    { id: "rose", letter: "R" },
  ],
  r: [
    { id: "kiwi", letter: "K" },
    { id: "window", letter: "W" },
    { id: "deer", letter: "D" },
    { id: "moon", letter: "M" },
    { id: "joker", letter: "J" },
  ],
  s: [
    { id: "ice", letter: "I" },
    { id: "ladder", letter: "L" },
    { id: "duck", letter: "D" },
    { id: "house", letter: "H" },
    { id: "ring", letter: "R" },
  ],
  t: [
    { id: "car", letter: "C" },
    { id: "bag", letter: "B" },
    { id: "giraffe", letter: "G" },
    { id: "ladder", letter: "L" },
    { id: "zucchini", letter: "Z" },
  ],
  u: [
    { id: "drum", letter: "D" },
    { id: "iron", letter: "I" },
    { id: "wolf", letter: "W" },
    { id: "cat", letter: "C" },
    { id: "turtle", letter: "T" },
  ],
  v: [
    { id: "cake", letter: "C" },
    { id: "juice", letter: "J" },
    { id: "parrot", letter: "P" },
    { id: "gift", letter: "G" },
    { id: "pencil", letter: "P" },
  ],
  w: [
    { id: "orange", letter: "O" },
    { id: "fan", letter: "F" },
    { id: "cat", letter: "C" },
    { id: "yoyo", letter: "Y" },
    { id: "tiger", letter: "T" },
  ],
  x: [
    { id: "bus", letter: "B" },
    { id: "ufo", letter: "U" },
    { id: "apple", letter: "A" },
    { id: "kite", letter: "K" },
    { id: "door", letter: "D" },
  ],
  y: [
    { id: "up", letter: "U" },
    { id: "heart", letter: "H" },
    { id: "kiwi", letter: "K" },
    { id: "axe", letter: "A" },
    { id: "wolf", letter: "W" },
  ],
  z: [
    { id: "cake", letter: "C" },
    { id: "yogurt", letter: "Y" },
    { id: "fox", letter: "F" },
    { id: "apple", letter: "A" },
    { id: "stick", letter: "S" },
  ],
};

// ─── 🔥 PRETTY NAME MAP ─────────────────────────────────────────
const PRETTY_NAME_MAP: Record<string, string> = {
  "x-ray": "X-Ray",
  icecream: "Ice-Cream",
  questionmark: "Question-Mark",
  toothbrush: "Tooth-Brush",
};

function prettyName(id: string): string {
  if (PRETTY_NAME_MAP[id]) return PRETTY_NAME_MAP[id];
  return id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ─── 🔥 FONT CSS ──────────────────────────────────────────────
const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ─── Animations CSS ──────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes l5ip-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes l5ip-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes l5ip-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes l5ip-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes l5ip-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes l5ip-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @keyframes l5ip-card-result-pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes l5ip-screen-vanish {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes l5ip-card-center-zoom {
    0%   { opacity: 0; transform: scale(0.5) translateY(30px); }
    60%  { opacity: 1; transform: scale(1.15) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes l5ip-card-center-exit {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.2); }
  }
  @keyframes l5ip-locked-bounce {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.08); }
    60%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }

  .l5ip-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .l5ip-lock-overlay-enter {
    animation: l5ip-overlay-in 0.15s ease-out both;
  }
  @keyframes l5ip-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .l5ip-pop-in { animation: l5ip-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .l5ip-shake { animation: l5ip-shake 0.45s ease-in-out; }
  .l5ip-bounce-in { animation: l5ip-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .l5ip-celebration-pop { 
    animation: l5ip-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .l5ip-celebration-fade-out {
    animation: l5ip-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .l5ip-card-select {
    animation: l5ip-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both;
  }
  .l5ip-card-result-pop {
    animation: l5ip-card-result-pop 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .l5ip-screen-vanish {
    animation: l5ip-screen-vanish 0.4s ease-out forwards;
  }
  .l5ip-card-center-zoom {
    animation: l5ip-card-center-zoom 0.6s cubic-bezier(.34,1.56,.64,1) both;
  }
  .l5ip-card-center-exit {
    animation: l5ip-card-center-exit 0.4s ease-in forwards;
  }
  .l5ip-locked-bounce {
    animation: l5ip-locked-bounce 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }
`;

// ─── Types ──────────────────────────────────────────────────
interface Item {
  id: string;
  name: string;
  svgUrl: string;
  isCorrect: boolean;
}

interface Props {
  letter: string;
  subject: string;
  level: number;
  lessonId: number;
}

// ─── 🔥 PROGRESS TRACKING TYPES ──────────────────────────────
interface SelectionRecord {
  /** 1-based index of selection */
  index: number;
  /** Item name (e.g. "X-Ray") */
  itemName: string;
  /** Was this a correct selection? */
  isCorrect: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
//  - Partial:   "Student did not complete the lesson."
//  - Perfect:   "Student successfully selected all 5 items of
//                Letter Xx correctly on the very first attempt."
//  - Wrong(s):  "Student made 2 wrong attempts before successfully
//                selecting all 5 items of Letter Xx correctly."
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  letterDisplay: string,
  _allOptions: string[],
  _selections: SelectionRecord[],
  totalCorrect: number,
  wrongCount: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  if (wrongCount === 0) {
    return `${studentName} successfully selected all ${totalCorrect} items of Letter ${letterDisplay} correctly on the very first attempt.`;
  }

  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting all ${totalCorrect} items of Letter ${letterDisplay} correctly.`;
}

// ─── Base Component ──────────────────────────────────────────
export function AlphabetLetter5ItemsPickBase({ letter, subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const capitalLetter = letter.toUpperCase();
  const smallLetter = letter.toLowerCase();
  const subjectColor = getSubjectColor(subject);

  const letterDisplay = `${capitalLetter}${smallLetter}`;

  // ─── Build items from letter ──────────────────────────────────
  const buildItems = useCallback((): Item[] => {
    const correctItems = CORRECT_ITEMS_MAP[letter.toLowerCase()] || [];
    const randomItems = RANDOM_POOL[letter.toLowerCase()] || [];

    const items: Item[] = [
      ...correctItems.map((id) => ({
        id,
        name: prettyName(id),
        svgUrl: getItemSvgUrl(letter.toUpperCase(), id),
        isCorrect: true,
      })),
      ...randomItems.map((item) => ({
        id: item.id,
        name: prettyName(item.id),
        svgUrl: getItemSvgUrl(item.letter, item.id),
        isCorrect: false,
      })),
    ];

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }, [letter]);

  // ─── State ──────────────────────────────────────────────────
  const [gameItems, setGameItems] = useState<Item[]>([]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [foundCorrectCount, setFoundCorrectCount] = useState(0);
  const [playingLockedIndex, setPlayingLockedIndex] = useState<number | null>(null);

  // ─── 🔥 7-SECOND LOCK STATE ──────────────────────────────────
  const [isInitialLocked, setIsInitialLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INITIAL_LOCK_DURATION = 7000;

  // ─── Celebration & Card Animation ──────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");
  const [showCardAnimation, setShowCardAnimation] = useState(false);
  const [cardAnimationPhase, setCardAnimationPhase] = useState<"idle" | "zoom" | "exit">("idle");
  const [animatingCardIndex, setAnimatingCardIndex] = useState<number | null>(null);
  const [vanish, setVanish] = useState(false);

  // ─── 🔥 AUDIO SYSTEM ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);

  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vanishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCorrect = 5;
  const isMountedRef = useRef(true);
  const introPlayedRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // ─── 🔥 PROGRESS TRACKING REFS ──────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const selectionsRef = useRef<SelectionRecord[]>([]);
  const selectionCounterRef = useRef<number>(0);
  const allOptionsRef = useRef<string[]>([]);

  // ─── 🔥 STOP SINGLE AUDIO ─────────────────────────────────────
  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {
      // Silently fail
    }
  }, []);

  // ─── 🔥 STOP ALL AUDIO ──────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      stopAudio(audio);
    });
    audioRefs.current = [];
    setIsAudioPlaying(false);
    setIsIntroPlaying(false);
  }, [stopAudio]);

  // ─── 🔥 PLAY MULTIPLE AUDIOS ──────────────────────────────────
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
            setIsAudioPlaying(true);

            audio.onended = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                audioRefs.current = [];
                resolve();
              }
            };

            audio.onerror = () => {
              console.warn(`⚠️ Audio error: ${src}`);
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                audioRefs.current = [];
                resolve();
              }
            };

            audio.play().catch((err) => {
              console.warn(`⚠️ Audio play failed: ${src}`, err);
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                audioRefs.current = [];
                resolve();
              }
            });
          } catch (err) {
            console.warn(`⚠️ Audio creation failed: ${src}`, err);
            completedCount++;
            if (completedCount >= totalFiles && !isResolved) {
              isResolved = true;
              setIsAudioPlaying(false);
              audioRefs.current = [];
              resolve();
            }
          }
        });
      });
    },
    [stopAllAudio],
  );

  // ─── 🔥 PLAY SINGLE AUDIO ──────────────────────────────────────
  const playAudio = useCallback(
    (src: string, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();

        try {
          const audio = new Audio(src);
          audioRefs.current.push(audio);
          setIsAudioPlaying(true);

          audio.onended = () => {
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.onerror = () => {
            console.warn(`⚠️ Audio error: ${src}`);
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.play().catch((err) => {
            console.warn(`⚠️ Audio play failed: ${src}`, err);
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          });
        } catch (err) {
          console.warn(`⚠️ Audio creation failed: ${src}`, err);
          setIsAudioPlaying(false);
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  // ─── 🔥 PLAY RESULT AUDIO ──────────────────────────────────
  const playResultAudio = useCallback(
    (isCorrectResult: boolean): Promise<void> => {
      const srcs = isCorrectResult ? [correctMP3, correctWAV] : [wrongMP3, wrongWAV];
      return playMultipleAudios(srcs);
    },
    [playMultipleAudios],
  );

  // ─── 🔥 PLAY INTRO AUDIO ──────────────────────────────────────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;

    setIsIntroPlaying(true);

    playAudio(IntroAudio, () => {
      setIsIntroPlaying(false);
      introPlayedRef.current = true;
    });
  }, [playAudio]);

  // ─── 🔥 PLAY ITEM AUDIO ───────────────────────────────────────
  const playItemAudio = useCallback(
    (itemId: string): Promise<void> => {
      return new Promise((resolve) => {
        const url = getItemAudioUrl(letter, itemId);

        if (!url) {
          resolve();
          return;
        }

        playAudio(url, () => {
          resolve();
        });
      });
    },
    [letter, playAudio],
  );

  // ─── 🔥 PLAY LOCKED CARD AUDIO ────────────────────────────────
  const playLockedCardAudio = useCallback(
    (itemId: string): Promise<void> => {
      return new Promise((resolve) => {
        const url = getItemAudioUrl(letter, itemId);

        if (!url) {
          resolve();
          return;
        }

        playAudio(url, () => {
          setPlayingLockedIndex(null);
          resolve();
        });
      });
    },
    [letter, playAudio],
  );

  // ─── ✅ Navigate to Level Popup ─────────────────
  const goToLevelPopup = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);

    navigate({
      to: "/levels",
      search: {
        subject,
        level,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── 🔥 Start initial lock (7 seconds) ─────────────────────
  const startInitialLock = useCallback(() => {
    setIsInitialLocked(true);
    setShowLockOverlay(true);

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsInitialLocked(false);
      setShowLockOverlay(false);
    }, INITIAL_LOCK_DURATION);
  }, []);

  // ─── 🔥 Initialize Game ───────────────────────────────────────
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    selectionsRef.current = [];
    selectionCounterRef.current = 0;

    const items = buildItems();
    setGameItems(items);

    allOptionsRef.current = items.map((it) => it.name).sort();

    startInitialLock();

    setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudio();
      }
    }, 600);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 🔥 Cleanup on unmount + save partial ────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      stopAllAudio();

      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (vanishTimerRef.current) clearTimeout(vanishTimerRef.current);
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );

        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;

            const studentName = session.student.studentName || "Student";

            const wrongCount = selectionsRef.current.filter(
              (s) => !s.isCorrect,
            ).length;

            const summary = buildSummary(
              studentName,
              letterDisplay,
              allOptionsRef.current,
              selectionsRef.current,
              totalCorrect,
              wrongCount,
              false,
            );

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject,
              level,
              lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter: letterDisplay,
                allOptions: allOptionsRef.current,
                selections: selectionsRef.current,
                totalWrongAttempts: wrongCount,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[Letter5ItemsPick] Save partial failed:", err);
            });
          }
        }
      }
    };
  }, [stopAllAudio, letterDisplay, subject, level, lessonId]);

  // ─── 🔥 Handle Card Selection ──────────────────────────────────
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

      selectionCounterRef.current += 1;
      selectionsRef.current.push({
        index: selectionCounterRef.current,
        itemName: item.name,
        isCorrect: item.isCorrect,
      });

      if (item.isCorrect) {
        setResult("correct");

        if (isIntroPlaying) {
          stopAllAudio();
        }

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
        setResult("wrong");

        if (isIntroPlaying) {
          stopAllAudio();
        }

        playResultAudio(false).then(() => {
          setResult(null);
          setSelectedIndex(null);
          setIsLocked(false);

          const nonLockedIndices = gameItems
            .map((_, idx) => idx)
            .filter((idx) => !lockedIndices.has(idx));

          const shuffledNonLocked = [...nonLockedIndices];
          for (let i = shuffledNonLocked.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledNonLocked[i], shuffledNonLocked[j]] = [
              shuffledNonLocked[j],
              shuffledNonLocked[i],
            ];
          }

          const newItems = [...gameItems];
          const nonLockedItems = shuffledNonLocked.map((idx) => gameItems[idx]);

          shuffledNonLocked.forEach((idx, i) => {
            newItems[idx] = nonLockedItems[i];
          });

          setGameItems(newItems);
          setIsLocked(false);
        });
      }
    },
    [
      isInitialLocked,
      gameItems,
      isLocked,
      lockedIndices,
      selectedIndex,
      showCardAnimation,
      isIntroPlaying,
      foundCorrectCount,
      stopAllAudio,
      playResultAudio,
    ],
  );

  // ─── 🔥 Handle Locked Card Tap ──────────────────────────────
  const handleLockedCardTap = useCallback(
    (index: number) => {
      if (showCardAnimation) return;
      if (isNavigatingRef.current) return;

      const item = gameItems[index];
      if (!item) return;
      if (!lockedIndices.has(index)) return;

      setPlayingLockedIndex(index);

      playLockedCardAudio(item.id).then(() => {
        setPlayingLockedIndex(null);
      });
    },
    [gameItems, lockedIndices, showCardAnimation, playLockedCardAudio],
  );

  // ─── Card Animation Function ─────────────────────────────
  const startCardAnimation = useCallback(
    (index: number, newCount: number) => {
      const item = gameItems[index];
      if (!item) return;

      const isLastCorrect = newCount >= totalCorrect;

      setAnimatingCardIndex(index);
      setVanish(true);

      vanishTimerRef.current = setTimeout(() => {
        setShowCardAnimation(true);
        setCardAnimationPhase("zoom");

        playItemAudio(item.id).then(() => {
          setCardAnimationPhase("exit");

          cardTimerRef.current = setTimeout(() => {
            setShowCardAnimation(false);
            setCardAnimationPhase("idle");
            setAnimatingCardIndex(null);
            setVanish(false);

            if (isLastCorrect) {
              if (!completedRef.current && !progressSavedRef.current) {
                completedRef.current = true;
                progressSavedRef.current = true;

                const elapsed = Math.floor(
                  (Date.now() - sessionStartTimeRef.current) / 1000,
                );

                const session = getSession();
                if (session?.student) {
                  const studentName =
                    session.student.studentName || "Student";

                  const wrongCount = selectionsRef.current.filter(
                    (s) => !s.isCorrect,
                  ).length;

                  const summary = buildSummary(
                    studentName,
                    letterDisplay,
                    allOptionsRef.current,
                    selectionsRef.current,
                    totalCorrect,
                    wrongCount,
                    true,
                  );

                  console.log(
                    "[Letter5ItemsPick] Complete summary:",
                    summary,
                  );

                  saveProgress({
                    studentId: session.student.studentId,
                    deviceToken: session.student.token,
                    subject,
                    level,
                    lessonId,
                    status: "completed",
                    timeSpentSec: elapsed,
                    summary,
                    gameData: {
                      letter: letterDisplay,
                      allOptions: allOptionsRef.current,
                      selections: selectionsRef.current,
                      totalWrongAttempts: wrongCount,
                      completed: true,
                    },
                  }).catch((err) => {
                    console.warn(
                      "[Letter5ItemsPick] Save completed failed:",
                      err,
                    );
                  });
                }
              }

              goToLevelPopup();
            } else {
              setIsLocked(false);

              const nonLockedIndices = gameItems
                .map((_, idx) => idx)
                .filter((idx) => idx !== index && !lockedIndices.has(idx));

              if (nonLockedIndices.length > 0) {
                const shuffledNonLocked = [...nonLockedIndices];
                for (let i = shuffledNonLocked.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffledNonLocked[i], shuffledNonLocked[j]] = [
                    shuffledNonLocked[j],
                    shuffledNonLocked[i],
                  ];
                }

                const newItems = [...gameItems];
                const nonLockedItems = shuffledNonLocked.map(
                  (idx) => gameItems[idx],
                );

                shuffledNonLocked.forEach((idx, i) => {
                  newItems[idx] = nonLockedItems[i];
                });

                setGameItems(newItems);
              }
            }
          }, 400);
        });
      }, 400);
    },
    [
      gameItems,
      lockedIndices,
      playItemAudio,
      goToLevelPopup,
      letterDisplay,
      subject,
      level,
      lessonId,
    ],
  );

  // ─── 🔥 CARD ANIMATION RENDER ───────────────────────────────
  if (showCardAnimation && animatingCardIndex !== null) {
    const item = gameItems[animatingCardIndex];

    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>

        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

        <div
          className={`relative z-10 ${cardAnimationPhase === "zoom" ? "l5ip-card-center-zoom" : cardAnimationPhase === "exit" ? "l5ip-card-center-exit" : ""}`}
        >
          <div
            className="clay-sm flex flex-col items-center justify-center rounded-3xl border-4 border-white p-6"
            style={{
              ["--clay-shadow" as string]: subjectColor.cardShadow,
              width: "450px",
              height: "450px",
              maxWidth: "85vw",
              maxHeight: "85vw",
              backgroundColor: subjectColor.cardBg,
            }}
          >
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={item.svgUrl}
                alt={item.name}
                className="w-[400px] h-[400px] object-contain pointer-events-none"
                style={{ maxWidth: "400px", maxHeight: "400px" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────
  if (gameItems.length === 0) {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-kid border-t-transparent" />
          <p className="text-sm font-bold text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  const isGameLocked = isInitialLocked || isLocked || isNavigatingRef.current;

  return (
    <div
      className={`relative flex h-full w-full select-none flex-col items-center p-4 ${vanish ? "l5ip-screen-vanish" : ""}`}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="l5ip-lock-overlay l5ip-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationPhase === "pop" ? "l5ip-celebration-pop" : celebrationPhase === "fade" ? "l5ip-celebration-fade-out" : ""}`}
        >
          <div className="h-[110%] w-[110%]">
            <img
              src={CelebrationSVG}
              alt="Celebration"
              className="h-full w-full object-contain"
              style={{ pointerEvents: "none" }}
            />
          </div>
        </div>
      )}

      {/* ─── Main Layout ────────────────────────────────────── */}
      <div
        className={`flex flex-col w-full h-full max-w-7xl ${isGameLocked ? "pointer-events-none" : ""}`}
      >
        {/* ─── TOP: Letter Display ────────── */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-2 pb-4">
          <div className="l5ip-pop-in">
            <div
              className="flex items-center justify-center gap-4 sm:gap-6 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl bg-white/50"
              style={{
                border: `4px solid ${subjectColor.letterColor}`,
              }}
            >
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "min(20vh, 180px)",
                  color: subjectColor.letterColor,
                  textShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                {capitalLetter}
              </span>
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "min(20vh, 180px)",
                  color: subjectColor.letterColor,
                  textShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                {smallLetter}
              </span>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM: SVG Cards Grid ──────────────────────────── */}
        <div className="flex-1 flex items-start justify-center min-h-0 w-full pb-3">
          <div className="grid grid-cols-5 gap-3 w-full max-w-5xl content-start">
            {gameItems.map((item, index) => {
              const isLockedCard = lockedIndices.has(index);
              const isSelected = selectedIndex === index;
              const isCorrect = result === "correct" && isSelected;
              const isWrong = result === "wrong" && isSelected;
              const isPlayingLocked = playingLockedIndex === index;

              let borderColor = "border-white";
              let showIcon = false;
              let icon = null;
              let iconBgColor = "";
              let iconTextColor = "";
              let isDisabled = false;
              let scaleClass = "hover:scale-[1.02]";
              let shadowColor = subjectColor.cardShadow;
              let bounceClass = "";
              let inlineBgColor = subjectColor.cardBg;

              if (isLockedCard) {
                inlineBgColor = "#22C55E";
                borderColor = "border-green-600";
                showIcon = true;
                icon = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-green-600";
                iconTextColor = "text-white";
                isDisabled = false;
                scaleClass = "hover:scale-[1.02] cursor-pointer";
                shadowColor = "oklch(0.48 0.19 148 / 0.85)";

                if (isPlayingLocked) {
                  bounceClass = "l5ip-locked-bounce";
                }
              } else if (isSelected && isCorrect) {
                inlineBgColor = "#22C55E";
                borderColor = "border-green-600";
                showIcon = true;
                icon = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-green-600";
                iconTextColor = "text-white";
                isDisabled = true;
                scaleClass = "l5ip-card-result-pop";
                shadowColor = "oklch(0.48 0.19 148 / 0.85)";
              } else if (isSelected && isWrong) {
                inlineBgColor = "#EF4444";
                borderColor = "border-red-600";
                showIcon = true;
                icon = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
                iconBgColor = "bg-red-600";
                iconTextColor = "text-white";
                isDisabled = true;
                scaleClass = "l5ip-shake l5ip-card-result-pop";
                shadowColor = "oklch(0.45 0.22 27 / 0.85)";
              } else {
                const isProcessing =
                  isInitialLocked ||
                  isLocked ||
                  selectedIndex !== null ||
                  isNavigatingRef.current;
                isDisabled = isProcessing;
              }

              const handleClick = () => {
                if (isLockedCard) {
                  handleLockedCardTap(index);
                } else {
                  handleCardSelect(index);
                }
              };

              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={handleClick}
                  disabled={isDisabled && !isLockedCard}
                  className={`
                    l5ip-pop-in clay-sm relative flex flex-col items-center justify-center
                    rounded-2xl border-4 transition-all duration-200
                    ${borderColor}
                    ${scaleClass}
                    ${bounceClass}
                    ${isSelected && !isLockedCard ? "l5ip-card-select" : ""}
                    ${isDisabled && !isLockedCard ? "opacity-60 cursor-not-allowed" : ""}
                    ${isLockedCard ? "cursor-pointer" : ""}
                  `}
                  style={{
                    ["--clay-shadow" as string]: shadowColor,
                    aspectRatio: "1/1",
                    width: "100%",
                    maxWidth: "180px",
                    minWidth: "100px",
                    padding: "8px",
                    backgroundColor: inlineBgColor,
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={item.svgUrl}
                      alt={item.name}
                      className="w-[130px] h-[130px] object-contain pointer-events-none"
                      style={{ maxWidth: "130px", maxHeight: "130px" }}
                    />
                  </div>

                  {showIcon && icon && (
                    <span
                      className={`l5ip-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-12 sm:w-12 ${iconBgColor} ${iconTextColor}`}
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

export default AlphabetLetter5ItemsPickBase;