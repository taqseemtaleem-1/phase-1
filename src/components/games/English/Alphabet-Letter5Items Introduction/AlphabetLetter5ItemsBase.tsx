// src/components/games/English/Alphabet-Letter5Items Introduction/AlphabetLetter5ItemsBase.tsx
// ✅ Progress tracking ENABLED
// ✅ Summary: Simple format (no repeat details)
// ✅ On complete → navigate to /levels popup
// ✅ Partial save on unmount (before leaving)
// 🔥 Tablet-fit layout — EXACT Urdu Items game setup
// 🔥 No scrollbar, HUGE letters, Aa together on same line
//
// ✅ UPDATED (v2):
//    - REMOVED letter auto-bounce phase (capital/small one-by-one)
//    - REMOVED Assistant (AssistantTalking) phase
//    - REMOVED old Letter5ItemsIntroAudio
//    - NEW: Intro letters phase — shows "Aa" together (one unit)
//    - NEW: Plays intro audio from
//      src/assets/Alphabet-Letter5Items Introduction Audios/Intro/{Letter}.wav
//    - Items phase unchanged (5 items + per-item audio + repeats)
//
// ✅ UPDATED (v3):
//    - 🔥 REMOVED per-letter intro audios (A.wav … Z.wav) — system deleted
//    - 🔥 NOW: ONE single intro audio plays at start for every letter:
//      src/assets/Alphabet-Letter5Items Introduction Audios/intro.wav
//    - Everything else (phases, animations, item flow, repeats,
//      progress save, navigation) is EXACTLY the same.

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getItemAudioUrl } from "./audioMap";
import { getItemSvgUrl } from "./svgMap";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio — Correct / Wrong
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";

// 🔥 SINGLE INTRO AUDIO — plays for every letter at the start
const introAudio = "/assets/Alphabet-Letter5Items Introduction Audios/intro.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getLetterColor(subject: string = "english"): string {
  const colors: Record<string, string> = {
    english: "#4D82F6",
    math: "#2E8B57",
    urdu: "#CC6B2C",
  };
  return colors[subject] || "#4D82F6";
}

// ─── 🔥 ITEMS MAP ──────────────────────────────────────────────
const ITEMS_MAP: Record<string, string[]> = {
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

interface Item {
  id: string;
  name: string;
  svgUrl: string;
}

interface AlphabetLetter5ItemsBaseProps {
  letter: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
  onNext?: () => void;
}

// ─── 🔥 Andika Font CSS ──────────────────────────────────────────
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
  @keyframes l5i-fade-scale-in {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes l5i-slide-in {
    from { opacity: 0; transform: translateX(80px) scale(0.85); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes l5i-slide-out {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to { opacity: 0; transform: translateX(-80px) scale(0.85); }
  }
  @keyframes l5i-svg-pop {
    0%   { opacity: 0; transform: scale(0.5) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.05) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes l5i-letter-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.12); }
    70%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  @keyframes l5i-items-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes l5i-progress-fill {
    from { width: 0%; }
    to { width: 100%; }
  }
  @keyframes l5i-intro-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes l5i-intro-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }

  .l5i-letter-anim { animation: l5i-fade-scale-in 0.5s ease-out both; }
  .l5i-svg-enter { animation: l5i-slide-in 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .l5i-svg-exit { animation: l5i-slide-out 0.4s ease-in both; }
  .l5i-svg-pop { animation: l5i-svg-pop 0.6s cubic-bezier(.34,1.56,.64,1) both; }
  .l5i-letter-pop { animation: l5i-letter-pop 0.4s ease-out both; }
  .l5i-items-fade-in { animation: l5i-items-fade-in 0.5s ease-out both; }
  .l5i-intro-fade-out { animation: l5i-intro-fade-out 0.4s ease-out both; }
  .l5i-intro-fade-in { animation: l5i-intro-fade-in 0.4s ease-out both; }
  .l5i-progress-bar {
    animation: l5i-progress-fill 4s linear forwards;
  }
  .l5i-sync-visible {
    opacity: 1;
    transition: opacity 0.12s ease-out;
  }
  .l5i-sync-hidden {
    opacity: 0;
    transition: opacity 0.12s ease-out;
    pointer-events: none;
  }

  .l5i-letter-row {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    line-height: 1;
    overflow: visible;
  }
`;

// ─── Item lifecycle state machine ──────────────────────────────
type ItemStage = "entering" | "idle" | "exiting" | "finished";

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
//  - Partial:   "Student did not complete the lesson."
//  - Completed: "Student watched all 5 items of Letter Aa."
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  letterDisplay: string,
  totalItems: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }
  return `${studentName} watched all ${totalItems} items of Letter ${letterDisplay}.`;
}

export function AlphabetLetter5ItemsBase({
  letter,
  subject,
  level,
  lessonId,
  onComplete,
  onNext,
}: AlphabetLetter5ItemsBaseProps) {
  const navigate = useNavigate();
  const capitalLetter = letter.toUpperCase();
  const smallLetter = letter.toLowerCase();
  const letterColor = getLetterColor(subject);

  const letterDisplay = `${capitalLetter}${smallLetter}`;

  // ─── Build items from letter ──────────────────────────────────
  const buildItems = useCallback((): Item[] => {
    const itemIds = ITEMS_MAP[letter.toLowerCase()] || [];
    return itemIds.map((id) => ({
      id,
      name: prettyName(id),
      svgUrl: getItemSvgUrl(letter.toUpperCase(), id),
    }));
  }, [letter]);

  // ─── Phases ──────────────────────────────────────────────────
  type Phase = "loading" | "intro_letters" | "items";
  const [phase, setPhase] = useState<Phase>("loading");

  // ─── Items State ────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemStage, setItemStage] = useState<ItemStage>("entering");
  const [audioEnded, setAudioEnded] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // ─── Intro Letters State ─────────────────────────────────
  const [showIntroLetters, setShowIntroLetters] = useState(false);
  const [introLetterPop, setIntroLetterPop] = useState(false);
  const [introFading, setIntroFading] = useState(false);

  // ─── 🔥 AUDIO SYSTEM ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedIndexRef = useRef<number>(-1);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // ─── 🔥 PROGRESS TRACKING REFS ──────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const repeatCountRef = useRef<Record<string, number>>({});
  const itemNameMapRef = useRef<Record<string, string>>({});
  const itemsSeenRef = useRef<Set<string>>(new Set());

  const totalItems = items.length;
  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === totalItems - 1;

  const goToLevelPopupRef = useRef<() => void>(() => {});
  const advanceToNextRef = useRef<() => void>(() => {});

  // ─── Initialize items on letter change ──────────────────────
  useEffect(() => {
    const built = buildItems();
    setItems(built);
    setCurrentIndex(0);
    setItemStage("entering");
    playedIndexRef.current = -1;

    const nameMap: Record<string, string> = {};
    built.forEach((it) => {
      nameMap[it.id] = it.name;
    });
    itemNameMapRef.current = nameMap;
  }, [buildItems]);

  // ─── STOP SINGLE AUDIO ─────────────────────────────────────
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
    audioRefs.current.forEach((audio) => {
      stopAudio(audio);
    });
    audioRefs.current = [];
    setIsAudioPlaying(false);
    isPlayingRef.current = false;
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
            setIsAudioPlaying(true);
            isPlayingRef.current = true;

            const done = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                isPlayingRef.current = false;
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
              setIsAudioPlaying(false);
              isPlayingRef.current = false;
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
          setIsAudioPlaying(true);
          isPlayingRef.current = true;

          const finish = () => {
            setIsAudioPlaying(false);
            isPlayingRef.current = false;
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        } catch {
          setIsAudioPlaying(false);
          isPlayingRef.current = false;
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  const clearAllTimers = useCallback(() => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    advanceTimeoutRef.current = null;
    introTimerRef.current = null;
    stageTimerRef.current = null;
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 INTRO SEQUENCE
  // ═══════════════════════════════════════════════════════════
  const runIntroSequence = useCallback(async () => {
    if (!isMountedRef.current) return;

    setPhase("intro_letters");
    setShowIntroLetters(true);
    setIntroLetterPop(true);

    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!isMountedRef.current) return;

    if (!introAudio) {
      console.warn(`[Letter5Items] Shared intro audio not found — skipping`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      await playAudio(introAudio);
    }

    if (!isMountedRef.current) return;

    setIntroLetterPop(false);
    setIntroFading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!isMountedRef.current) return;

    setShowIntroLetters(false);
    setIntroFading(false);

    setPhase("items");
    setItemStage("entering");
  }, [playAudio]);

  // ─── Start the Sequence on mount ──────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    repeatCountRef.current = {};
    itemsSeenRef.current = new Set();

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        runIntroSequence();
      }
    }, 300);

    introTimerRef.current = timer;

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      stopAllAudio();
      isPlayingRef.current = false;

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );

        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;

            const studentName = session.student.studentName || "Student";

            const summary = buildSummary(
              studentName,
              letterDisplay,
              totalItems || 5,
              false,
            );

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject: subject || "english",
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter: letterDisplay,
                totalItems: totalItems || 5,
                itemsSeen: Array.from(itemsSeenRef.current),
                repeatCounts: { ...repeatCountRef.current },
                completed: false,
              },
            }).catch((err) => {
              console.warn("[Letter5Items] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Item Audio Playback ────────────────────────────────────
  const playCurrentItemAudio = useCallback(() => {
    if (!currentItem) return;

    if (audioRefs.current.length > 0) {
      stopAllAudio();
    }

    setAudioEnded(false);
    clearAllTimers();

    const url = getItemAudioUrl(letter, currentItem.id);
    if (!url) {
      startWaitWindow();
      return;
    }

    playAudio(url, () => {
      startWaitWindow();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem, letter, clearAllTimers, playAudio, stopAllAudio]);

  // ─── Start Wait Window ──────────────────────────────────────
  const startWaitWindow = useCallback(() => {
    setAudioEnded(true);
    setProgressKey((k) => k + 1);

    if (currentItem) {
      itemsSeenRef.current.add(currentItem.id);
    }

    clearAllTimers();
    advanceTimeoutRef.current = setTimeout(() => {
      advanceToNextRef.current();
    }, 4000);
  }, [clearAllTimers, currentItem]);

  // ─── Advance to next item OR finish the lesson ─────────────
  const advanceToNext = useCallback(() => {
    if (isNavigatingRef.current) return;
    clearAllTimers();

    if (isLastItem) {
      isNavigatingRef.current = true;
      setItemStage("finished");
      onComplete?.();

      if (!completedRef.current && !progressSavedRef.current) {
        completedRef.current = true;
        progressSavedRef.current = true;

        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );

        const session = getSession();
        if (session?.student) {
          const studentName = session.student.studentName || "Student";

          const summary = buildSummary(
            studentName,
            letterDisplay,
            totalItems || 5,
            true,
          );

          console.log("[Letter5Items] Complete summary:", summary);

          saveProgress({
            studentId: session.student.studentId,
            deviceToken: session.student.token,
            subject: subject || "english",
            level: level || 1,
            lessonId: lessonId || 1,
            status: "completed",
            timeSpentSec: elapsed,
            summary,
            gameData: {
              letter: letterDisplay,
              totalItems: totalItems || 5,
              itemsSeen: Array.from(itemsSeenRef.current),
              repeatCounts: { ...repeatCountRef.current },
              completed: true,
            },
          }).catch((err) => {
            console.warn("[Letter5Items] Save completed failed:", err);
          });
        }
      }

      stageTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        goToLevelPopupRef.current();
      }, 200);
    } else {
      setItemStage("exiting");

      stageTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setAudioEnded(false);
        setCurrentIndex((prev) => prev + 1);
        setItemStage("entering");
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastItem, onComplete, clearAllTimers, totalItems, letterDisplay, subject, level, lessonId]);

  useEffect(() => {
    advanceToNextRef.current = advanceToNext;
  }, [advanceToNext]);

  // ─── When a new item becomes current, play its audio ───────
  useEffect(() => {
    if (phase === "items" && currentItem && playedIndexRef.current !== currentIndex) {
      playedIndexRef.current = currentIndex;
      const t = setTimeout(() => {
        if (isMountedRef.current) {
          setItemStage("idle");
          playCurrentItemAudio();
        }
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentItem, currentIndex]);

  // ─── Handle Card Tap (repeat current item's audio) ─────────
  const handleCardTap = useCallback(() => {
    if (!audioEnded) return;
    if (!currentItem) return;

    const id = currentItem.id;
    repeatCountRef.current[id] = (repeatCountRef.current[id] || 0) + 1;

    console.log(
      `[Letter5Items] Repeat: ${itemNameMapRef.current[id]} → ${repeatCountRef.current[id]} times`,
    );

    clearAllTimers();
    setAudioEnded(false);

    const url = getItemAudioUrl(letter, currentItem.id);
    if (url) {
      playAudio(url, () => {
        startWaitWindow();
      });
    } else {
      startWaitWindow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audioEnded,
    currentItem,
    clearAllTimers,
    playAudio,
    startWaitWindow,
    letter,
  ]);

  // ─── Restart ──────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    isNavigatingRef.current = false;
    clearAllTimers();
    stopAllAudio();

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    repeatCountRef.current = {};
    itemsSeenRef.current = new Set();

    setPhase("loading");
    setAudioEnded(false);
    setCurrentIndex(0);
    playedIndexRef.current = -1;
    setItemStage("entering");
    setShowIntroLetters(false);
    setIntroLetterPop(false);
    setIntroFading(false);

    setTimeout(() => {
      if (isMountedRef.current) {
        runIntroSequence();
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAllTimers, stopAllAudio, runIntroSequence]);

  // ─── ✅ Navigate to Level Popup ─────────────────
  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (onNext) {
      onNext();
      return;
    }
    if (subject !== undefined && level !== undefined) {
      navigate({
        to: "/levels",
        search: {
          subject,
          level,
          openPopup: "true",
        },
      });
    }
  }, [navigate, subject, level, onNext, stopAllAudio]);

  useEffect(() => {
    goToLevelPopupRef.current = goToLevelPopup;
  }, [goToLevelPopup]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  const introLetterSize = "min(50vh, 420px)";
  const itemsPhaseLetterSize = "min(42vh, 360px)";

  // ═══════════════════════════════════════════════════════════
  //  PHASE: loading / intro_letters
  // ═══════════════════════════════════════════════════════════
  if (phase === "loading" || phase === "intro_letters") {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden p-2">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>

        {showIntroLetters && (
          <div
            className={`
              flex items-center justify-center h-full w-full
              ${introFading ? "l5i-intro-fade-out" : "l5i-intro-fade-in"}
            `}
          >
            <div className={`${introLetterPop ? "l5i-letter-pop" : ""}`}>
              <div className="l5i-letter-row">
                <span
                  style={{
                    fontFamily:
                      "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: introLetterSize,
                    color: letterColor,
                    textShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    lineHeight: 1,
                    display: "block",
                    letterSpacing: "0.02em",
                    overflow: "visible",
                  }}
                >
                  {capitalLetter}
                </span>
                <span
                  style={{
                    fontFamily:
                      "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: introLetterSize,
                    color: letterColor,
                    textShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    lineHeight: 1,
                    display: "block",
                    letterSpacing: "0.02em",
                    marginLeft: "0.05em",
                    overflow: "visible",
                  }}
                >
                  {smallLetter}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE: items
  // ═══════════════════════════════════════════════════════════
  const isFinished = itemStage === "finished";
  const isExiting = itemStage === "exiting";

  return (
    <div
      className="relative h-full w-full bg-transparent p-2 sm:p-3 overflow-hidden l5i-items-fade-in"
      onClick={handleCardTap}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {audioEnded && !isFinished && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 h-1.5 w-20 sm:w-28 rounded-full bg-black/10 overflow-hidden z-20">
          <div
            key={progressKey}
            className="h-full bg-[#4A9BD9] rounded-full l5i-progress-bar"
          />
        </div>
      )}

      <div className="h-full w-full flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6">

        {/* ─── LEFT: Letter (Aa) ────────────────────────────── */}
        <div
          className="flex-1 flex items-center justify-center h-full"
          style={{ overflow: "visible" }}
        >
          <div
            className={`relative ${
              isFinished ? "l5i-sync-hidden" : "l5i-sync-visible l5i-letter-anim"
            }`}
            style={{ overflow: "visible" }}
          >
            <div className="l5i-letter-row">
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: itemsPhaseLetterSize,
                  color: letterColor,
                  textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  lineHeight: 1,
                  display: "block",
                  letterSpacing: "0.02em",
                  overflow: "visible",
                }}
              >
                {capitalLetter}
              </span>
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: itemsPhaseLetterSize,
                  color: letterColor,
                  textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  lineHeight: 1,
                  display: "block",
                  letterSpacing: "0.02em",
                  marginLeft: "0.05em",
                  overflow: "visible",
                }}
              >
                {smallLetter}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Item SVG ─────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="flex items-center justify-center w-full h-full">
            {currentItem && currentItem.svgUrl && (
              <div
                key={`${currentItem.id}-${currentIndex}`}
                className={`
                  ${isFinished ? "l5i-sync-hidden" : "l5i-sync-visible"}
                  ${!isFinished && isExiting ? "l5i-svg-exit" : ""}
                  ${!isFinished && !isExiting ? "l5i-svg-enter l5i-svg-pop" : ""}
                `}
                style={{
                  width: "min(72vh, 560px)",
                  height: "min(72vh, 560px)",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={currentItem.svgUrl}
                  alt={currentItem.name}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                  onError={() => {
                    console.warn(
                      `[Letter5Items] Failed to load SVG: ${currentItem.id} (letter ${letter})`,
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlphabetLetter5ItemsBase;