// src/components/games/Urdu/Huroof-e-Tahajji-Items Introduction/HuroofETahajjiItemsIntroductionBase.tsx
// ✅ Urdu version of AlphabetLetter5ItemsBase
// 🔥 Flow per session: letter + intro.wav → ALL items (svg + wav) → next session
// 📝 Urdu font: Noto Nastaliq Urdu
// ❌ NO assistant — just letter + intro audio
// 🔥 Auto-skip empty letter folders
// 🔥 NO scrollbar — full tablet-fit layout
// 🔥 Intro letter is HUGE (min 72vh)
// 🔥 LETTER_Y_OFFSETS now uses transform: translateY() — % works reliably
// 🔥 INTRO_ONLY_LETTERS: 16, 18, 34, 37, 38, 40 → only intro.wav plays, no items loop
// 🔥 Intro-only letters now SKIP items phase entirely — no letter flash
// 🔥 Extra guards: phase-check before items JSX + setPhase("loading") on transition
// 🔥 Idle letter color: orange gradient (matches Urdu theme)
// 🔥 FIXED: extra padding + bigger line-height so gradient text never clips
//           nukte / ascenders / descenders

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getItemAudioUrl, getIntroAudioUrl } from "./audioMap";
import { getItemSvgUrl, getItemsForLetter } from "./svgMap";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Urdu Font
const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎯 LETTER → NUMBER MAPPING (Urdu alphabet order, 1-40)
// ═══════════════════════════════════════════════════════════════

const LETTER_TO_NUMBER: Record<string, number> = {
  "ا": 1,  "آ": 2,
  "ب": 3,  "پ": 4,
  "ت": 5,  "ٹ": 6,
  "ث": 7,  "ج": 8,
  "چ": 9,  "ح": 10,
  "خ": 11, "د": 12,
  "ڈ": 13, "ذ": 14,
  "ر": 15, "ڑ": 16,
  "ز": 17, "ژ": 18,
  "س": 19, "ش": 20,
  "ص": 21, "ض": 22,
  "ط": 23, "ظ": 24,
  "ع": 25, "غ": 26,
  "ف": 27, "ق": 28,
  "ک": 29, "گ": 30,
  "ل": 31, "م": 32,
  "ن": 33, "ں": 34,
  "و": 35, "ہ": 36,
  "ھ": 37, "ء": 38,
  "ی": 39, "ے": 40,
};

// ═══════════════════════════════════════════════════════════════
//  🔥 INTRO-ONLY LETTERS
// ═══════════════════════════════════════════════════════════════
const INTRO_ONLY_LETTERS = new Set<number>([
  16, // ڑ  Rray
  18, // ژ  Zhay
  34, // ں  Noon Ghunna
  37, // ھ  Do Chashmi Hay
  38, // ء  Hamza
  40, // ے  Bari Ye
]);

// ─── 🔥 LETTER COLOR — IDLE GRADIENT + PLAYING GREEN ──────────
const LETTER_IDLE_GRADIENT =
  "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))";
const LETTER_PLAYING_COLOR = "oklch(0.55 0.2 148)";

// ═══════════════════════════════════════════════════════════════
//  🔥 LETTER SIZING RULES
// ═══════════════════════════════════════════════════════════════

const SHORT_LETTERS = ["د", "ڈ", "ذ", "ر", "ڑ", "ز", "ژ", "و", "ہ", "ھ"];
const LAAM_LETTER = "ل";
const TOE_ZOE_LETTERS = ["ط", "ظ"];
const ALIF_MADDA = "آ";

// ═══════════════════════════════════════════════════════════════
//  🔥 PER-LETTER VERTICAL OFFSET (Nastaliq visual centering)
// ═══════════════════════════════════════════════════════════════
const LETTER_Y_OFFSETS: Record<number, string> = {
  1: "0%",    2: "0%",
  3: "-22%",  4: "-22%",  5: "-15%",  6: "-15%",
  7: "-15%",  8: "-22%",  9: "-22%",  10: "-22%",
  11: "-15%",
  12: "-6%",  13: "-6%",  14: "-6%",  15: "-6%",
  16: "-6%",  17: "-6%",  18: "-6%",
  19: "-13%", 20: "-13%", 21: "-13%", 22: "-13%",
  23: "-10%", 24: "-10%", 25: "-10%", 26: "-10%",
  27: "0%",   28: "-10%", 29: "0%",   30: "0%",
  31: "0%",   32: "-27%",
  33: "-15%", 34: "-15%", 35: "-15%",
  36: "-15%", 37: "-15%", 38: "-15%",
  39: "-22%", 40: "-6%",
};

function getLetterOffset(letterNum: number): string {
  return LETTER_Y_OFFSETS[letterNum] ?? "0%";
}

interface Item {
  id: string;
  name: string;
  svgUrl: string;
}

interface HuroofETahajjiItemsIntroductionBaseProps {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
  onNext?: () => void;
}

// ─── 🔥 Urdu Font CSS ──────────────────────────────────────────
const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ─── Animations CSS ──────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes h5i-fade-scale-in {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes h5i-slide-in {
    from { opacity: 0; transform: translateX(80px) scale(0.85); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes h5i-slide-out {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to { opacity: 0; transform: translateX(-80px) scale(0.85); }
  }
  @keyframes h5i-svg-pop {
    0%   { opacity: 0; transform: scale(0.5) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.05) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes h5i-letter-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.12); }
    70%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  @keyframes h5i-items-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes h5i-progress-fill {
    from { width: 0%; }
    to { width: 100%; }
  }
  @keyframes h5i-session-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.96); }
  }
  @keyframes h5i-session-fade-in {
    0%   { opacity: 0; transform: scale(0.96); }
    100% { opacity: 1; transform: scale(1); }
  }

  .h5i-letter-anim { animation: h5i-fade-scale-in 0.5s ease-out both; }
  .h5i-svg-enter { animation: h5i-slide-in 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .h5i-svg-exit { animation: h5i-slide-out 0.4s ease-in both; }
  .h5i-svg-pop { animation: h5i-svg-pop 0.6s cubic-bezier(.34,1.56,.64,1) both; }
  .h5i-letter-pop { animation: h5i-letter-pop 0.4s ease-out both; }
  .h5i-items-fade-in { animation: h5i-items-fade-in 0.5s ease-out both; }
  .h5i-progress-bar {
    animation: h5i-progress-fill 4s linear forwards;
  }
  .h5i-session-fade-out {
    animation: h5i-session-fade-out 0.4s ease-out forwards;
  }
  .h5i-session-fade-in {
    animation: h5i-session-fade-in 0.4s ease-in forwards;
  }

  .h5i-sync-visible {
    opacity: 1;
    transition: opacity 0.12s ease-out;
  }
  .h5i-sync-hidden {
    opacity: 0;
    transition: opacity 0.12s ease-out;
    pointer-events: none;
  }

  .h5i-letter-shift {
    display: inline-block;
    transform: translateY(var(--letter-y, 0%));
    transition: color 0.15s ease, transform 0.3s ease;
    overflow: visible;
    padding: 0.15em 0.15em 0.25em 0.15em;
    line-height: 1.8;
  }
`;

// ─── Item lifecycle state machine ──────────────────────────────
type ItemStage = "entering" | "idle" | "exiting" | "finished";
type Session = 1 | 2;

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — SIMPLE (English Letter5Items pattern)
// ═══════════════════════════════════════════════════════════════

function buildSessionSummary(
  studentName: string,
  letter: string,
  letterName: string,
  totalItems: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const letterLabel = letterName ? `'${letter}' (${letterName})` : `'${letter}'`;
  return `${studentName} watched all ${totalItems} items of Letter ${letterLabel}.`;
}

function buildFullSummary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  letter2: string,
  letter2Name: string,
  s1Total: number,
  s2Total: number,
  s1Completed: boolean,
  s2Completed: boolean,
  s2WasAttempted: boolean,
): string {
  const firstLine = buildSessionSummary(
    studentName,
    letter1,
    letter1Name,
    s1Total,
    s1Completed,
  );

  const secondLine = s2WasAttempted
    ? buildSessionSummary(
        studentName,
        letter2,
        letter2Name,
        s2Total,
        s2Completed,
      )
    : `Not attempted.`;

  return `First Letter:\n${firstLine}\n\nSecond Letter:\n${secondLine}`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiItemsIntroductionBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject = "urdu",
  level,
  lessonId,
  onComplete,
  onNext,
}: HuroofETahajjiItemsIntroductionBaseProps) {
  const navigate = useNavigate();

  const [session, setSession] = useState<Session>(1);
  const [sessionTransitioning, setSessionTransitioning] = useState(false);

  const currentLetter = session === 1 ? letter1 : letter2;
  const currentLetterName = session === 1 ? (letter1Name || "") : (letter2Name || "");
  const currentLetterNumber = LETTER_TO_NUMBER[currentLetter] || 0;
  const currentLetterOffset = getLetterOffset(currentLetterNumber);

  // ─── Build items for a given letter ──────────────────────────
  const buildItems = useCallback((letterNum: number): Item[] => {
    if (INTRO_ONLY_LETTERS.has(letterNum)) {
      return [];
    }

    const itemIds = getItemsForLetter(letterNum);
    return itemIds.map((id) => {
      const prettyName = id
        .replace(/[-_]/g, " ")
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return {
        id,
        name: prettyName,
        svgUrl: getItemSvgUrl(letterNum, id),
      };
    });
  }, []);

  // ─── Phases ──────────────────────────────────────────────────
  type Phase = "loading" | "letter_intro" | "items" | "done";
  const [phase, setPhase] = useState<Phase>("loading");

  // ─── Items State ────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemStage, setItemStage] = useState<ItemStage>("entering");
  const [audioEnded, setAudioEnded] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // ─── Letter Intro States ─────────────────────────────────
  const [showLetter, setShowLetter] = useState(false);
  const [letterPlaying, setLetterPlaying] = useState(false);
  const [letterPop, setLetterPop] = useState(false);

  // ─── 🔥 AUDIO SYSTEM ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedIndexRef = useRef<number>(-1);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // ─── 🔥 PROGRESS TRACKING REFS (SIMPLIFIED) ────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  // Session 1 refs
  const s1TotalItemsRef = useRef<number>(0);
  const s1CompletedRef = useRef<boolean>(false);
  const s1WasAttemptedRef = useRef<boolean>(false);

  // Session 2 refs
  const s2TotalItemsRef = useRef<number>(0);
  const s2CompletedRef = useRef<boolean>(false);
  const s2WasAttemptedRef = useRef<boolean>(false);

  const totalItems = items.length;
  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === totalItems - 1;

  const goToLevelPopupRef = useRef<() => void>(() => {});
  const advanceToNextRef = useRef<() => void>(() => {});

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
    audioRefs.current.forEach((audio) => stopAudio(audio));
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
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    advanceTimeoutRef.current = null;
    stageTimerRef.current = null;
    sessionTimerRef.current = null;
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🎯 SESSION RUNNER
  // ═══════════════════════════════════════════════════════════

  const runSession = useCallback(async (sessionNum: Session) => {
    if (!isMountedRef.current) return;

    const letterForSession = sessionNum === 1 ? letter1 : letter2;
    const letterNum = LETTER_TO_NUMBER[letterForSession] || 0;

    const builtItems = buildItems(letterNum);
    console.log(
      `[HuroofItems] Session ${sessionNum} (${letterForSession}, #${letterNum}):`,
      `${builtItems.length} items`,
      builtItems.map((it) => it.id),
    );

    setItems(builtItems);
    setCurrentIndex(0);
    setItemStage("entering");
    playedIndexRef.current = -1;
    setAudioEnded(false);

    if (sessionNum === 1) {
      s1WasAttemptedRef.current = true;
      s1TotalItemsRef.current = builtItems.length;
    } else {
      s2WasAttemptedRef.current = true;
      s2TotalItemsRef.current = builtItems.length;
    }

    setPhase("letter_intro");
    setShowLetter(true);
    setLetterPop(true);
    setLetterPlaying(true);

    const introUrl = getIntroAudioUrl(letterNum);

    await new Promise<void>((resolve) => {
      const finishIntro = () => {
        if (!isMountedRef.current) {
          resolve();
          return;
        }
        setLetterPlaying(false);
        setLetterPop(false);
        setShowLetter(false);
        resolve();
      };

      if (introUrl) {
        playAudio(introUrl, finishIntro);
      } else {
        console.warn(`[HuroofItems] No intro.wav for letter #${letterNum} — short pause`);
        setTimeout(finishIntro, 800);
      }
    });

    if (!isMountedRef.current) return;

    // ═════════════════════════════════════════════════════════
    //  🔥 If letter has no items (intro-only OR empty folder)
    //  → SKIP items phase entirely
    // ═════════════════════════════════════════════════════════
    if (builtItems.length === 0) {
      if (INTRO_ONLY_LETTERS.has(letterNum)) {
        console.log(
          `[HuroofItems] Letter #${letterNum} is intro-only — skipping items phase`,
        );
      } else {
        console.warn(`[HuroofItems] Letter #${letterNum} has no items — skipping items phase`);
      }

      if (sessionNum === 1) {
        s1CompletedRef.current = true;
        setSessionTransitioning(true);

        sessionTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setSession(2);
          setSessionTransitioning(false);
          setTimeout(() => {
            if (isMountedRef.current) runSession(2);
          }, 300);
        }, 400);
      } else {
        s2CompletedRef.current = true;
        finishAllSessions();
      }

      return;
    }

    setPhase("items");
    setItemStage("entering");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter1, letter2, buildItems, playAudio]);

  // ─── Item Audio Playback ────────────────────────────────────
  const playCurrentItemAudio = useCallback(() => {
    if (!currentItem) return;
    if (audioRefs.current.length > 0) {
      stopAllAudio();
    }
    setAudioEnded(false);
    clearAllTimers();

    const url = getItemAudioUrl(currentLetterNumber, currentItem.id);
    if (!url) {
      startWaitWindow();
      return;
    }
    playAudio(url, () => {
      startWaitWindow();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem, currentLetterNumber, clearAllTimers, playAudio, stopAllAudio]);

  const startWaitWindow = useCallback(() => {
    setAudioEnded(true);
    setProgressKey((k) => k + 1);
    clearAllTimers();
    advanceTimeoutRef.current = setTimeout(() => {
      advanceToNextRef.current();
    }, 4000);
  }, [clearAllTimers]);

  // ─── Finish all sessions ────────────────────────────────────
  const finishAllSessions = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setPhase("loading");
    setItemStage("finished");

    onComplete?.();

    if (!completedRef.current && !progressSavedRef.current) {
      completedRef.current = true;
      progressSavedRef.current = true;

      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const sessionData = getSession();
      if (sessionData?.student) {
        const studentName = sessionData.student.studentName || "Student";

        const summary = buildFullSummary(
          studentName,
          letter1, letter1Name || "",
          letter2, letter2Name || "",
          s1TotalItemsRef.current, s2TotalItemsRef.current,
          s1CompletedRef.current, s2CompletedRef.current,
          s2WasAttemptedRef.current,
        );

        console.log("[HuroofItems] Complete summary:", summary);

        saveProgress({
          studentId: sessionData.student.studentId,
          deviceToken: sessionData.student.token,
          subject: subject || "urdu",
          level: level || 1,
          lessonId: lessonId || 1,
          status: "completed",
          timeSpentSec: elapsed,
          summary,
          gameData: {
            letter1, letter1Name, letter2, letter2Name,
            session1: {
              totalItems: s1TotalItemsRef.current,
              completed: s1CompletedRef.current,
            },
            session2: {
              totalItems: s2TotalItemsRef.current,
              completed: s2CompletedRef.current,
            },
            completed: true,
          },
        }).catch((err) => {
          console.warn("[HuroofItems] Save completed failed:", err);
        });
      }
    }

    stageTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      goToLevelPopupRef.current();
    }, 300);
  }, [onComplete, letter1, letter1Name, letter2, letter2Name, subject, level, lessonId]);

  // ─── Advance to next item / next session / finish ────────────
  const advanceToNext = useCallback(() => {
    if (isNavigatingRef.current) return;
    clearAllTimers();

    if (isLastItem) {
      if (session === 1) {
        s1CompletedRef.current = true;
        setItemStage("finished");
        setSessionTransitioning(true);
        setPhase("loading");

        sessionTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setSession(2);
          setSessionTransitioning(false);
          setTimeout(() => {
            if (isMountedRef.current) runSession(2);
          }, 300);
        }, 500);
      } else {
        s2CompletedRef.current = true;
        setItemStage("finished");
        setPhase("loading");
        finishAllSessions();
      }
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
  }, [isLastItem, session, clearAllTimers, finishAllSessions, runSession]);

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

    clearAllTimers();
    setAudioEnded(false);

    const url = getItemAudioUrl(currentLetterNumber, currentItem.id);
    if (url) {
      playAudio(url, () => {
        startWaitWindow();
      });
    } else {
      startWaitWindow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnded, currentItem, clearAllTimers, playAudio, startWaitWindow, currentLetterNumber]);

  // ─── Mount: kick off session 1 ──────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    s1TotalItemsRef.current = 0;
    s1CompletedRef.current = false;
    s1WasAttemptedRef.current = false;

    s2TotalItemsRef.current = 0;
    s2CompletedRef.current = false;
    s2WasAttemptedRef.current = false;

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        runSession(1);
      }
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      clearAllTimers();
      stopAllAudio();
      isPlayingRef.current = false;

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || "Student";

            const summary = buildFullSummary(
              studentName,
              letter1, letter1Name || "",
              letter2, letter2Name || "",
              s1TotalItemsRef.current, s2TotalItemsRef.current,
              s1CompletedRef.current, s2CompletedRef.current,
              s2WasAttemptedRef.current,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject: subject || "urdu",
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter1, letter1Name, letter2, letter2Name,
                session1: {
                  totalItems: s1TotalItemsRef.current,
                  completed: s1CompletedRef.current,
                },
                session2: {
                  totalItems: s2TotalItemsRef.current,
                  completed: s2CompletedRef.current,
                },
                completed: false,
              },
            }).catch((err) => {
              console.warn("[HuroofItems] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        search: { subject, level, openPopup: "true" },
      });
    }
  }, [navigate, subject, level, onNext, stopAllAudio]);

  useEffect(() => {
    goToLevelPopupRef.current = goToLevelPopup;
  }, [goToLevelPopup]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  const isShortLetter = SHORT_LETTERS.includes(currentLetter);
  const isLaam = currentLetter === LAAM_LETTER;
  const isToeZoe = TOE_ZOE_LETTERS.includes(currentLetter);
  const isAlifMadda = currentLetter === ALIF_MADDA;

  const introLetterSize = isShortLetter
    ? "min(72vh, 620px)"
    : isLaam
      ? "min(45vh, 380px)"
      : isToeZoe
        ? "min(68vh, 580px)"
        : isAlifMadda
          ? "min(65vh, 560px)"
          : "min(55vh, 480px)";

  const itemsLetterSize = isShortLetter
    ? "min(55vh, 480px)"
    : isLaam
      ? "min(32vh, 260px)"
      : isToeZoe
        ? "min(52vh, 440px)"
        : isAlifMadda
          ? "min(50vh, 420px)"
          : "min(40vh, 340px)";

  // ═══════════════════════════════════════════════════════════
  //  PHASE: loading / letter_intro
  // ═══════════════════════════════════════════════════════════
  if (phase === "loading" || phase === "letter_intro") {
    return (
      <div
        dir="rtl"
        className={`relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden p-2 ${
          sessionTransitioning ? "h5i-session-fade-out" : ""
        }`}
      >
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>

        {showLetter && (
          <div className="flex items-center justify-center h5i-letter-anim">
            <div className={`${letterPop ? "h5i-letter-pop" : ""}`}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "visible",
                  padding: "2vh 2vw",
                }}
              >
                <span
                  className="h5i-letter-shift"
                  style={{
                    fontFamily:
                      "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: introLetterSize,
                    ...(letterPlaying
                      ? { color: LETTER_PLAYING_COLOR }
                      : {
                          background: LETTER_IDLE_GRADIENT,
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          color: "transparent",
                        }),
                    textShadow: "0 6px 20px rgba(0,0,0,0.1)",
                    letterSpacing: "0.02em",
                    overflow: "visible",
                    ["--letter-y" as string]: currentLetterOffset,
                  }}
                >
                  {currentLetter}
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

  if (phase !== "items") {
    return null;
  }

  const isFinished = itemStage === "finished";
  const isExiting = itemStage === "exiting";

  return (
    <div
      dir="rtl"
      className={`relative h-full w-full bg-transparent p-2 sm:p-3 overflow-hidden h5i-items-fade-in ${
        sessionTransitioning ? "h5i-session-fade-out" : ""
      }`}
      onClick={handleCardTap}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {audioEnded && !isFinished && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 h-1.5 w-20 sm:w-28 rounded-full bg-black/10 overflow-hidden z-20">
          <div
            key={progressKey}
            className="h-full bg-[#4A9BD9] rounded-full h5i-progress-bar"
          />
        </div>
      )}

      <div className="h-full w-full flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6">
        {/* ─── LEFT (RTL: visual RIGHT): Urdu Letter ────── */}
        <div className="flex-1 flex items-center justify-center h-full" style={{ overflow: "visible" }}>
          <div
            className={`relative ${
              isFinished ? "h5i-sync-hidden" : "h5i-sync-visible h5i-letter-anim"
            }`}
            style={{ overflow: "visible" }}
          >
            <div className="text-center" style={{ overflow: "visible" }}>
              <span
                className="h5i-letter-shift"
                style={{
                  fontFamily:
                    "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: itemsLetterSize,
                  background: LETTER_IDLE_GRADIENT,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  letterSpacing: "0.02em",
                  overflow: "visible",
                  ["--letter-y" as string]: currentLetterOffset,
                }}
              >
                {currentLetter}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT (RTL: visual LEFT): Item SVG ──────── */}
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="flex items-center justify-center w-full h-full">
            {currentItem && currentItem.svgUrl && (
              <div
                key={`${session}-${currentItem.id}-${currentIndex}`}
                className={`
                  ${isFinished ? "h5i-sync-hidden" : "h5i-sync-visible"}
                  ${!isFinished && isExiting ? "h5i-svg-exit" : ""}
                  ${!isFinished && !isExiting ? "h5i-svg-enter h5i-svg-pop" : ""}
                `}
                style={{
                  width: "min(80vh, 620px)",
                  height: "min(80vh, 620px)",
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
                      `[HuroofItems] Failed to load SVG: ${currentItem.id} (letter #${currentLetterNumber})`,
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

export default HuroofETahajjiItemsIntroductionBase;