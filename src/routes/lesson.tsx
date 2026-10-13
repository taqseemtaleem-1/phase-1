// src/routes/lesson.tsx
// ✅ FIXED: Clay card now uses plain white background
// ✅ UPDATED: Math subject — 23 levels total
//             • Levels 1-20  → 5 lessons each (10 numbers × 2 parts × 5 games)
//             • Levels 21-23 → 10 lessons each
//                              - Lesson 1     = NumbersMatchingBulk
//                              - Lesson 2     = CountBallsDrag
//                              - Lesson 3     = NumbersMatchingObjectsBulk
//                              - Lesson 4     = NumbersDragCorrectNumberBulkBase
//                              - Lesson 5     = NumbersFindNumberBulkBase
//                              - Lesson 6     = NumbersFindMissingNumberBulkBase
//                              - Lesson 7     = NumbersPickCorrectItemsBulkBase
//                              - Lesson 8     = NumbersWriteLetterBulkBase
//                              - Lessons 9-10 = placeholder (Coming Soon)
//
// ✅ UPDATED (English Bulk Levels 8, 16, 23, 30):
//    - Lesson 8 = AlphabetWriteLetterBulkBase (NEW — interleaved A→a→B→b...)
//    - Lessons 9-10 still "Coming Soon"

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";

// ─── ENGLISH GAME IMPORTS ─────────────────────────────────────
import AlphabetIntroductionBase from "@/components/games/English/Alphabet-Introduction";
import { AlphabetMatchingBase } from "@/components/games/English/Alphabet-Matching Capital2Small";
import { AlphabetCapitalSmallPickBase } from "@/components/games/English/Alphabet-CapitalSmallPick";
import { AlphabetFindLetterBase } from "@/components/games/English/Alphabet-FindLetter";
import { AlphabetMakeLetterPairBase } from "@/components/games/English/Alphabet-MakeLetterPair";
import { AlphabetLetter5ItemsBase } from "@/components/games/English/Alphabet-Letter5Items Introduction";
import { AlphabetLetter5ItemsPickBase } from "@/components/games/English/Alphabet-Letter5Items Pick";
import { AlphabetFaintTraceBase } from "@/components/games/English/Alphabet-FaintTrace";
import { AlphabetFaintVanishTraceBase } from "@/components/games/English/Alphabet-FaintVanishTrace";
import { AlphabetWriteLetterBase } from "@/components/games/English/Alphabet-WriteLetter";

// 🔥 Assessment Games
import {
  AlphabetMatchingBulkBase,
  AlphabetChooseCorrectPair,
  AlphabetDragDropMatch,
  AlphabetMakeCorrectPairs,
  AlphabetFindMissingLetter,
  LetterItemMatching,
  PickCorrectItems,
  AlphabetWriteLetterBulkBase,
} from "@/components/games/English/Alphabet-Assessment";

// ─── 🔥 URDU GAME IMPORTS ─────────────────────────────────────
import { HuroofETahajjiIntroductionBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Introduction";
import { HuroofETahajjiMatchingBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Matching";
import { HuroofETahajjiChooseCorrectLetterBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Choose Correct Letter";
import { HuroofETahajjiFindLetterBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Find Letter";
import { HuroofETahajjiDragCorrectLetterBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Drag Correct Letter";
import { HuroofETahajjiItemsIntroductionBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Items Introduction";
import { HuroofETahajjiItemsPickBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Items Pick";
import { HuroofETahajjiFaintTraceBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Faint-Trace";
import { HuroofETahajjiFaintVanishTraceBase } from "@/components/games/Urdu/Huroof-e-Tahajji-Faint-VanishTrace";
import { HuroofETahajjiWriteLetterBase } from "@/components/games/Urdu/Huroof-e-Tahajji-WriteLetter";

// 🔥 Bulk Assessment Games
import {
  HuroofETahajjiMatchingBulkBase,
  HuroofETahajjiFindLetterBulkBase,
  HuroofETahajjiDragCorrectLetterBulkBase,
  HuroofETahajjiFindMissingLetterBulkBase,
  HuroofETahajjiItemMatchingBulkBase,
  HuroofETahajjiPickCorrectItemsBulkBase,
  HuroofETahajjiWriteLetterBulkBase,
} from "@/components/games/Urdu/Huroof-e-Tahajji-Assessment";

// ─── 🔥 MATH GAME IMPORTS ─────────────────────────────────────
import { MathNumbersIntroductionBase } from "@/components/games/Math/Numbers-Introduction";
import { MathNumbersMatchingBase } from "@/components/games/Math/Numbers-Matching";
import { MathNumbersFindNumberBase } from "@/components/games/Math/Numbers-FindNumber";
import { MathNumbersDragCorrectNumberBase } from "@/components/games/Math/Numbers-Drag Correct Number";
import { MathNumbersNumberMatchingObjectsBase } from "@/components/games/Math/Numbers-Number Matching Objects";
import { MathNumbersItemsIntroductionBase } from "@/components/games/Math/Numbers-Numbers Items Introduction";
import { MathNumbersItemsDragBasketBase } from "@/components/games/Math/Numbers-Items Drag Basket";
import { MathNumbersFaintTraceBase } from "@/components/games/Math/Numbers-FaintTrace";
import { MathNumbersFaintVanishTraceBase } from "@/components/games/Math/Numbers-Faint-VanishTrace";
import { MathNumbersWriteLetterBase } from "@/components/games/Math/Numbers-WriteLetter";

// 🔥 Math Assessment Games
import {
  NumbersMatchingBulk,
  CountBallsDrag,
  NumbersMatchingObjectsBulk,
  NumbersDragCorrectNumberBulkBase,
  NumbersFindNumberBulkBase,
  NumbersFindMissingNumberBulkBase,
  NumbersPickCorrectItemsBulkBase,
  NumbersWriteLetterBulkBase,
} from "@/components/games/Math/Numbers-Assessment";

export const Route = createFileRoute("/lesson")({
  validateSearch: (search: Record<string, unknown>) => ({
    subject: (search.subject as string) ?? "english",
    level: Number(search.level ?? 1),
    lessonId: Number(search.lessonId ?? 1),
  }),
  head: () => ({
    meta: [{ title: "Lesson — Taqseem Foundation" }],
  }),
  component: LessonInterfacePage,
});

// ══════════════════════════════════════════════════════════════
//  🔥 ENGLISH: LEVEL → LETTER MAPPING
// ══════════════════════════════════════════════════════════════

const ENGLISH_LETTER_LEVEL_MAP: Record<number, string> = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
  5: "E",
  6: "F",
  7: "G",
  9: "H",
  10: "I",
  11: "J",
  12: "K",
  13: "L",
  14: "M",
  15: "N",
  17: "O",
  18: "P",
  19: "Q",
  20: "R",
  21: "S",
  22: "T",
  24: "U",
  25: "V",
  26: "W",
  27: "X",
  28: "Y",
  29: "Z",
};

const BULK_MATCHING_LETTERS: Record<number, string[]> = {
  8: ["A", "B", "C", "D", "E", "F", "G"],
  16: ["H", "I", "J", "K", "L", "M", "N"],
  23: ["O", "P", "Q", "R", "S", "T"],
  30: ["U", "V", "W", "X", "Y", "Z"],
};

// ══════════════════════════════════════════════════════════════
//  🔥 MATH: LEVEL → NUMBER + PART MAPPING
// ══════════════════════════════════════════════════════════════

interface MathLevelConfig {
  number: string;
  part: 1 | 2;
}

const MATH_LEVEL_MAP: Record<number, MathLevelConfig> = {
  1:  { number: "1", part: 1 },
  2:  { number: "1", part: 2 },
  3:  { number: "2", part: 1 },
  4:  { number: "2", part: 2 },
  5:  { number: "3", part: 1 },
  6:  { number: "3", part: 2 },
  7:  { number: "4", part: 1 },
  8:  { number: "4", part: 2 },
  9:  { number: "5", part: 1 },
  10: { number: "5", part: 2 },
  11: { number: "6", part: 1 },
  12: { number: "6", part: 2 },
  13: { number: "7", part: 1 },
  14: { number: "7", part: 2 },
  15: { number: "8", part: 1 },
  16: { number: "8", part: 2 },
  17: { number: "9", part: 1 },
  18: { number: "9", part: 2 },
  19: { number: "0", part: 1 },
  20: { number: "0", part: 2 },
};

// 🔥 Bulk matching numbers for Levels 21, 22, 23
const MATH_BULK_MATCHING_LETTERS: Record<number, string[]> = {
  21: ["1", "2", "3", "4"],
  22: ["5", "6", "7", "8"],
  23: ["9", "0"],
};

// ══════════════════════════════════════════════════════════════
//  🔥 URDU: LEVEL → 2 LETTERS MAPPING
// ══════════════════════════════════════════════════════════════

interface UrduLetterPair {
  letter1: string;
  letter1Name: string;
  letter2: string;
  letter2Name: string;
}

const URDU_LETTER_PAIR_MAP: Record<number, UrduLetterPair> = {
  1:  { letter1: "ا", letter1Name: "الف",             letter2: "آ", letter2Name: "الف مدہ" },
  2:  { letter1: "ب", letter1Name: "بے",              letter2: "پ", letter2Name: "پے" },
  3:  { letter1: "ت", letter1Name: "تے",              letter2: "ٹ", letter2Name: "ٹے" },
  4:  { letter1: "ث", letter1Name: "ثے",              letter2: "ج", letter2Name: "جیم" },
  6:  { letter1: "چ", letter1Name: "چے",              letter2: "ح", letter2Name: "بڑی ح" },
  7:  { letter1: "خ", letter1Name: "خے",              letter2: "د", letter2Name: "دال" },
  8:  { letter1: "ڈ", letter1Name: "ڈال",             letter2: "ذ", letter2Name: "ذال" },
  9:  { letter1: "ر", letter1Name: "رے",              letter2: "ڑ", letter2Name: "ڑے" },
  11: { letter1: "ز", letter1Name: "زے",              letter2: "ژ", letter2Name: "ژے" },
  12: { letter1: "س", letter1Name: "سین",             letter2: "ش", letter2Name: "شین" },
  13: { letter1: "ص", letter1Name: "صواد",            letter2: "ض", letter2Name: "ضواد" },
  14: { letter1: "ط", letter1Name: "توئیں",           letter2: "ظ", letter2Name: "ظوئیں" },
  16: { letter1: "ع", letter1Name: "عین",             letter2: "غ", letter2Name: "غین" },
  17: { letter1: "ف", letter1Name: "فے",              letter2: "ق", letter2Name: "قاف" },
  18: { letter1: "ک", letter1Name: "کاف",             letter2: "گ", letter2Name: "گاف" },
  19: { letter1: "ل", letter1Name: "لام",             letter2: "م", letter2Name: "میم" },
  21: { letter1: "ن", letter1Name: "نون",             letter2: "ں", letter2Name: "نون غنہ" },
  22: { letter1: "و", letter1Name: "واؤ",             letter2: "ہ", letter2Name: "گول ہے" },
  23: { letter1: "ھ", letter1Name: "دو چشمی ہے",      letter2: "ء", letter2Name: "ہمزہ" },
  24: { letter1: "ی", letter1Name: "چھوتی یے",        letter2: "ے", letter2Name: "بڑی یے" },
};

// ══════════════════════════════════════════════════════════════
//  🔥 URDU BULK LEVELS
// ══════════════════════════════════════════════════════════════

const URDU_BULK_LEVELS: Record<number, number[]> = {
  5:  [1, 2, 3, 4, 5, 6, 7, 8],
  10: [9, 10, 11, 12, 13, 14, 15, 16],
  15: [17, 18, 19, 20, 21, 22, 23, 24],
  20: [25, 26, 27, 28, 29, 30, 31, 32],
  25: [33, 34, 35, 36, 37, 38, 39, 40],
};

const URDU_LETTER_BY_NUMBER: Record<number, string> = {
  1: "ا",  2: "آ",  3: "ب",  4: "پ",
  5: "ت",  6: "ٹ",  7: "ث",  8: "ج",
  9: "چ",  10: "ح", 11: "خ", 12: "د",
  13: "ڈ", 14: "ذ", 15: "ر", 16: "ڑ",
  17: "ز", 18: "ژ", 19: "س", 20: "ش",
  21: "ص", 22: "ض", 23: "ط", 24: "ظ",
  25: "ع", 26: "غ", 27: "ف", 28: "ق",
  29: "ک", 30: "گ", 31: "ل", 32: "م",
  33: "ن", 34: "ں", 35: "و", 36: "ہ",
  37: "ھ", 38: "ء", 39: "ی", 40: "ے",
};

const SKIPPED_LEVELS = new Set<number>([]);

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function LessonInterfacePage() {
  const { subject, level, lessonId } = Route.useSearch();
  const navigate = useNavigate();

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  // ─── GLOBAL AUDIO CLEANUP ──────────────────────────────────
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const isCleaningRef = useRef(false);

  const stopAudio = useCallback((audio: HTMLAudioElement) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      audio.load();
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onloadstart = null;
      audio.onloadeddata = null;
      audio.oncanplay = null;
      audio.oncanplaythrough = null;
      audio.ontimeupdate = null;
      audio.onvolumechange = null;
      audio.onratechange = null;
      audio.ondurationchange = null;
    } catch {
      // Silently ignore
    }
  }, []);

  const registerAudio = useCallback((audio: HTMLAudioElement): (() => void) => {
    if (!audio || audio.src === "") return () => {};
    audioElementsRef.current.push(audio);
    if (typeof window !== "undefined") {
      if (!window._audioElements) window._audioElements = [];
      window._audioElements.push(audio);
      if (window.__lessonAudioCleanup) {
        window.__lessonAudioCleanup.registerAudio(audio);
      }
    }
    return () => {
      const index = audioElementsRef.current.indexOf(audio);
      if (index !== -1) audioElementsRef.current.splice(index, 1);
      if (typeof window !== "undefined" && window._audioElements) {
        const winIndex = window._audioElements.indexOf(audio);
        if (winIndex !== -1) window._audioElements.splice(winIndex, 1);
      }
      stopAudio(audio);
    };
  }, [stopAudio]);

  const registerAudios = useCallback(
    (audios: HTMLAudioElement[]): (() => void) => {
      const cleanups = audios.map((audio) => registerAudio(audio));
      return () => cleanups.forEach((cleanup) => cleanup());
    },
    [registerAudio]
  );

  const cleanupAllAudio = useCallback(() => {
    if (isCleaningRef.current) return;
    isCleaningRef.current = true;
    try {
      audioElementsRef.current.forEach(stopAudio);
      audioElementsRef.current = [];
      if (typeof window !== "undefined" && window._audioElements) {
        window._audioElements.forEach(stopAudio);
        window._audioElements = [];
      }
      if (typeof window !== "undefined" && window.__lessonAudioCleanup) {
        window.__lessonAudioCleanup.cleanupAllAudio();
      }
    } finally {
      isCleaningRef.current = false;
    }
  }, [stopAudio]);

  useEffect(() => {
    return () => cleanupAllAudio();
  }, [cleanupAllAudio]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__lessonAudioCleanup = {
        registerAudio,
        registerAudios,
        cleanupAllAudio,
      };
    }
  }, [registerAudio, registerAudios, cleanupAllAudio]);

  const cleanupAndNavigate = useCallback(
    (to: string, search?: Record<string, unknown>) => {
      cleanupAllAudio();
      if (typeof window !== "undefined" && window._audioElements) {
        window._audioElements.forEach(stopAudio);
        window._audioElements = [];
      }
      setTimeout(() => navigate({ to, search }), 100);
    },
    [navigate, cleanupAllAudio, stopAudio]
  );

  const handleBackClick = () => {
    cleanupAllAudio();
    setShowConfirmPopup(true);
  };

  const handleConfirmBack = () => {
    setShowConfirmPopup(false);
    cleanupAndNavigate("/levels", { subject, level });
  };

  const handleCancelBack = () => setShowConfirmPopup(false);

  const goToNextLesson = useCallback(() => {
    cleanupAndNavigate("/levels", { subject, level, openPopup: "true" });
  }, [cleanupAndNavigate, subject, level]);

  const goDashboard = () => cleanupAndNavigate("/dashboard");

  const POPUP_CSS = `
    @keyframes popup-in {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes popup-out {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.9) translateY(20px); }
    }
    @keyframes overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .popup-enter { animation: popup-in 0.25s ease-out both; }
    .popup-exit { animation: popup-out 0.2s ease-in both; }
    .overlay-enter { animation: overlay-in 0.25s ease-out both; }
  `;

  // ══════════════════════════════════════════════════════════════
  //  🔥 URDU CONTENT RENDERER
  // ══════════════════════════════════════════════════════════════

  const renderUrduContent = () => {
    if (URDU_BULK_LEVELS[level]) {
      const letterNumbers = URDU_BULK_LEVELS[level];
      const lettersForBulk = letterNumbers.map(
        (n) => URDU_LETTER_BY_NUMBER[n]
      );

      if (lessonId === 1) {
        return <HuroofETahajjiMatchingBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 2) {
        return <HuroofETahajjiFindLetterBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 3) {
        return <HuroofETahajjiDragCorrectLetterBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 4) {
        return <HuroofETahajjiFindMissingLetterBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 5) {
        return <HuroofETahajjiItemMatchingBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 6) {
        return <HuroofETahajjiPickCorrectItemsBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 7) {
        return <HuroofETahajjiWriteLetterBulkBase letters={lettersForBulk} subject={subject} level={level} lessonId={lessonId} />;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} · Lesson {lessonId} — Coming Soon!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Subject: <span className="font-bold capitalize">{subject}</span>
            </p>
            <p className="mt-4 text-sm text-gray-500">
              This lesson is under development. Please continue to the next lesson.
            </p>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    const pair = URDU_LETTER_PAIR_MAP[level];

    if (!pair) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} — Coming Soon!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Subject: <span className="font-bold capitalize">{subject}</span>
            </p>
            <p className="mt-4 text-sm text-gray-500">
              This level is under development. Please continue to the next level.
            </p>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    if (lessonId === 1) {
      return <HuroofETahajjiIntroductionBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 2) {
      return <HuroofETahajjiMatchingBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 3) {
      return <HuroofETahajjiChooseCorrectLetterBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 4) {
      return <HuroofETahajjiFindLetterBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 5) {
      return <HuroofETahajjiDragCorrectLetterBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 6) {
      return <HuroofETahajjiItemsIntroductionBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 7) {
      return <HuroofETahajjiItemsPickBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 8) {
      return <HuroofETahajjiFaintTraceBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 9) {
      return <HuroofETahajjiFaintVanishTraceBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 10) {
      return <HuroofETahajjiWriteLetterBase letter1={pair.letter1} letter1Name={pair.letter1Name} letter2={pair.letter2} letter2Name={pair.letter2Name} subject={subject} level={level} lessonId={lessonId} />;
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
          <div className="mb-4 text-6xl">🚀</div>
          <h2 className="text-2xl font-extrabold text-gray-800">
            Level {level} — Coming Soon!
          </h2>
          <button
            onClick={goToNextLesson}
            className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
            style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
          >
            Next Lesson →
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  🔥 MATH CONTENT RENDERER
  // ══════════════════════════════════════════════════════════════

  const renderMathContent = () => {
    // ─── Levels 21-23: Bulk lessons ──────────────────────────
    if (MATH_BULK_MATCHING_LETTERS[level]) {
      const bulkLetters = MATH_BULK_MATCHING_LETTERS[level];

      if (lessonId === 1) {
        return (
          <NumbersMatchingBulk
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 2) {
        return (
          <CountBallsDrag
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 3) {
        return (
          <NumbersMatchingObjectsBulk
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 4) {
        return (
          <NumbersDragCorrectNumberBulkBase
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 5) {
        return (
          <NumbersFindNumberBulkBase
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 6) {
        return (
          <NumbersFindMissingNumberBulkBase
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 7) {
        return (
          <NumbersPickCorrectItemsBulkBase
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      if (lessonId === 8) {
        return (
          <NumbersWriteLetterBulkBase
            letters={bulkLetters}
            subject={subject}
            level={level}
            lessonId={lessonId}
          />
        );
      }

      // Lessons 9-10 → placeholder
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} · Lesson {lessonId} — Coming Soon!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Subject: <span className="font-bold capitalize">{subject}</span>
            </p>
            <p className="mt-4 text-sm text-gray-500">
              This lesson is under development. Please continue to the next lesson.
            </p>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    // ─── Levels 1-20: Part-based games ───────────────────────
    const config = MATH_LEVEL_MAP[level];

    if (!config) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} — Coming Soon!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Subject: <span className="font-bold capitalize">{subject}</span>
            </p>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    const { number: numberChar, part } = config;

    // ─── PART 1: Games 1-5 ───────────────────────────────────
    if (part === 1) {
      if (lessonId === 1) {
        return <MathNumbersIntroductionBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 2) {
        return <MathNumbersMatchingBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 3) {
        return <MathNumbersFindNumberBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 4) {
        return <MathNumbersDragCorrectNumberBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
      }
      if (lessonId === 5) {
        return <MathNumbersNumberMatchingObjectsBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} · Lesson {lessonId} — Coming Soon!
            </h2>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    // ─── PART 2: Games 6-10 ──────────────────────────────────
    if (lessonId === 1) {
      return <MathNumbersItemsIntroductionBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 2) {
      return <MathNumbersItemsDragBasketBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 3) {
      return <MathNumbersFaintTraceBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 4) {
      return <MathNumbersFaintVanishTraceBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 5) {
      return <MathNumbersWriteLetterBase number={numberChar} subject={subject} level={level} lessonId={lessonId} />;
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
          <div className="mb-4 text-6xl">🚀</div>
          <h2 className="text-2xl font-extrabold text-gray-800">
            Level {level} · Lesson {lessonId} — Coming Soon!
          </h2>
          <button
            onClick={goToNextLesson}
            className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
            style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
          >
            Next Lesson →
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  🔥 ENGLISH CONTENT RENDERER
  // ══════════════════════════════════════════════════════════════

  const renderEnglishContent = () => {
    const letter = ENGLISH_LETTER_LEVEL_MAP[level];

    // ─── BULK LEVEL 8 ────────────────────────────────────────
    if (level === 8) {
      const letters = BULK_MATCHING_LETTERS[8] || ["A", "B", "C", "D", "E", "F", "G"];
      if (lessonId === 1) return <AlphabetMatchingBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 2) return <AlphabetChooseCorrectPair letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 3) return <AlphabetDragDropMatch letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 4) return <AlphabetMakeCorrectPairs letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 5) return <AlphabetFindMissingLetter letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 6) return <LetterItemMatching letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 7) return <PickCorrectItems letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 8) return <AlphabetWriteLetterBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
    }

    // ─── BULK LEVEL 16 ───────────────────────────────────────
    if (level === 16) {
      const letters = BULK_MATCHING_LETTERS[16] || ["H", "I", "J", "K", "L", "M", "N"];
      if (lessonId === 1) return <AlphabetMatchingBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 2) return <AlphabetChooseCorrectPair letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 3) return <AlphabetDragDropMatch letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 4) return <AlphabetMakeCorrectPairs letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 5) return <AlphabetFindMissingLetter letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 6) return <LetterItemMatching letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 7) return <PickCorrectItems letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 8) return <AlphabetWriteLetterBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
    }

    // ─── BULK LEVEL 23 ───────────────────────────────────────
    if (level === 23) {
      const letters = BULK_MATCHING_LETTERS[23] || ["O", "P", "Q", "R", "S", "T"];
      if (lessonId === 1) return <AlphabetMatchingBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 2) return <AlphabetChooseCorrectPair letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 3) return <AlphabetDragDropMatch letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 4) return <AlphabetMakeCorrectPairs letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 5) return <AlphabetFindMissingLetter letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 6) return <LetterItemMatching letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 7) return <PickCorrectItems letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 8) return <AlphabetWriteLetterBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
    }

    // ─── BULK LEVEL 30 ───────────────────────────────────────
    if (level === 30) {
      const letters = BULK_MATCHING_LETTERS[30] || ["U", "V", "W", "X", "Y", "Z"];
      if (lessonId === 1) return <AlphabetMatchingBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 2) return <AlphabetChooseCorrectPair letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 3) return <AlphabetDragDropMatch letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 4) return <AlphabetMakeCorrectPairs letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 5) return <AlphabetFindMissingLetter letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 6) return <LetterItemMatching letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 7) return <PickCorrectItems letters={letters} subject={subject} level={level} lessonId={lessonId} />;
      if (lessonId === 8) return <AlphabetWriteLetterBulkBase letters={letters} subject={subject} level={level} lessonId={lessonId} />;
    }

    if (SKIPPED_LEVELS.has(level)) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">🚀</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Level {level} — Coming Soon!
            </h2>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    if (!letter) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
          <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
            <div className="mb-4 text-6xl">📝</div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Lesson {lessonId}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Level: <span className="font-bold">{level}</span>
            </p>
            <button
              onClick={goToNextLesson}
              className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
              style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
            >
              Next Lesson →
            </button>
          </div>
        </div>
      );
    }

    if (lessonId === 1) {
      return <AlphabetIntroductionBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 2) {
      return <AlphabetMatchingBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 3) {
      return <AlphabetCapitalSmallPickBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 4) {
      return <AlphabetFindLetterBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 5) {
      return <AlphabetMakeLetterPairBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 6) {
      return <AlphabetLetter5ItemsBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 7) {
      return <AlphabetLetter5ItemsPickBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 8) {
      return <AlphabetFaintTraceBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 9) {
      return <AlphabetFaintVanishTraceBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }
    if (lessonId === 10) {
      return <AlphabetWriteLetterBase letter={letter} subject={subject} level={level} lessonId={lessonId} />;
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="clay max-w-md border-4 border-white bg-white/95 p-8">
          <div className="mb-4 text-6xl">📝</div>
          <h2 className="text-2xl font-extrabold text-gray-800">
            Lesson {lessonId}
          </h2>
          <button
            onClick={goToNextLesson}
            className="clay-sm mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-4 border-white bg-green-kid px-6 py-3 text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
            style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
          >
            Next Lesson →
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <main className="sky-bg relative h-[100dvh] w-screen overflow-hidden p-3 md:p-4">
      <style>{POPUP_CSS}</style>

      <div className="relative mx-auto flex h-full w-full max-w-[1400px] gap-3">
        {/* Left side - Navigation */}
        <div className="flex w-20 shrink-0 flex-col gap-2.5 sm:w-24">
          <div
            className="clay-sm shrink-0 rounded-2xl border-4 border-white bg-yellow-kid px-2 py-2.5 text-center text-orange-kid-deep"
            style={{ ["--clay-shadow" as string]: "oklch(0.55 0.19 75 / 0.85)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">Level</div>
            <div className="text-2xl font-extrabold leading-none">{level}</div>
          </div>

          <div
            className="clay-sm shrink-0 rounded-2xl border-4 border-white bg-blue-kid px-2 py-2.5 text-center text-white"
            style={{ ["--clay-shadow" as string]: "oklch(0.35 0.18 260 / 0.85)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">Lesson</div>
            <div className="text-2xl font-extrabold leading-none">{lessonId}</div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2" />

          <button
            onClick={handleBackClick}
            className="clay-sm flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border-4 border-white bg-blue-kid px-2 py-2.5 text-center text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
            style={{ ["--clay-shadow" as string]: "oklch(0.35 0.18 260 / 0.85)" }}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={goDashboard}
            className="clay-sm shrink-0 rounded-2xl border-4 border-white bg-green-kid px-2 py-2.5 text-center text-sm font-extrabold uppercase text-white transition-transform hover:scale-105 active:scale-95"
            style={{ ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)" }}
          >
            Done
          </button>
        </div>

        {/* Main content — Clay Card with PLAIN WHITE background */}
        <div className="clay relative min-h-0 flex-1 overflow-hidden border-4 border-white bg-white">
          <div className="relative z-10 h-full min-h-0">
            {subject === "urdu"
              ? renderUrduContent()
              : subject === "math"
                ? renderMathContent()
                : renderEnglishContent()}
          </div>
        </div>
      </div>

      {/* ─── CONFIRM POPUP ───────────────────────────────────── */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 overlay-enter">
          <div className="popup-enter clay relative w-[90%] max-w-sm border-4 border-white bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-7 w-7 text-amber-600" strokeWidth={2} />
            </div>

            <h2 className="text-lg font-extrabold text-gray-800">Go Back?</h2>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCancelBack}
                className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-extrabold uppercase text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBack}
                className="flex-1 rounded-xl border-2 border-red-500 bg-red-500 px-4 py-2.5 text-sm font-extrabold uppercase text-white transition-all hover:bg-red-600 active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}