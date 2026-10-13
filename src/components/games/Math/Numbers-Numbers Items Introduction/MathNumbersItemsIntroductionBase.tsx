// src/components/games/Math/Numbers-Numbers Items Introduction/MathNumbersItemsIntroductionBase.tsx
// ✅ Math version — Numbers 1-9 + 0
// 🎯 GROUP FLOW: Pencil → Bag → Car
//
// ✅ UPDATED (v8): NUMBER INTRO INSTEAD OF ASSISTANT
//    - Intro phase now shows the NUMBER in center (instead of AssistantTalking)
//    - Number stays visible while intro.wav plays
//    - Fades out when audio finishes (or after min 2.5s if audio fails)
//    - All other fixes preserved (no double audio, proper cleanup)
//
//    - Flow per group (1× only):
//        🔊 Numbers/N.wav  →  🔊 {Group}/N.wav
//      then 4-sec timer (tap enabled → replay same cycle)
//
// 📝 Summary: Simple "watched" pattern

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  ITEM_COMPONENTS,
  ITEM_PLURALS,
  type ItemType,
} from "./itemSvgs";
import { ItemsPacker } from "./ItemsPacker";

// 🔥 Intro audio from Math Assets
const IntroAudio = "/assets/Math Assets/Numbers Items Introduction/intro.wav";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

console.log("[MathItemsIntro] Intro audio URL:", IntroAudio);

// ═══════════════════════════════════════════════════════════════
//  🎵 AUDIO SYSTEM
// ═══════════════════════════════════════════════════════════════

const NUMBER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Numbers Items Introduction/Numbers/*.wav",
  { eager: true, query: "?url", import: "default" },
);

const PENCIL_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Numbers Items Introduction/Pencil/*.wav",
  { eager: true, query: "?url", import: "default" },
);

const BAG_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Numbers Items Introduction/Bag/*.wav",
  { eager: true, query: "?url", import: "default" },
);

const CAR_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Numbers Items Introduction/Car/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildAudioMap(
  modules: Record<string, string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const NUMBER_AUDIO: Record<string, string> = buildAudioMap(NUMBER_AUDIO_MODULES);
const PENCIL_AUDIO: Record<string, string> = buildAudioMap(PENCIL_AUDIO_MODULES);
const BAG_AUDIO: Record<string, string> = buildAudioMap(BAG_AUDIO_MODULES);
const CAR_AUDIO: Record<string, string> = buildAudioMap(CAR_AUDIO_MODULES);

const ITEM_AUDIO_MAP: Record<ItemType, Record<string, string>> = {
  pencil: PENCIL_AUDIO,
  bag: BAG_AUDIO,
  car: CAR_AUDIO,
};

console.log(
  "[MathItemsIntro] Audio loaded —",
  "Numbers:", Object.keys(NUMBER_AUDIO).sort().join(","),
  "| Pencil:", Object.keys(PENCIL_AUDIO).sort().join(","),
  "| Bag:", Object.keys(BAG_AUDIO).sort().join(","),
  "| Car:", Object.keys(CAR_AUDIO).sort().join(","),
);

function getNumberAudioUrl(n: string): string | null {
  const url = NUMBER_AUDIO[n];
  if (!url) {
    console.warn(`[MathItemsIntro] Missing number audio: ${n}.wav`);
    return null;
  }
  return url;
}

function getItemAudioUrl(type: ItemType, n: string): string | null {
  const url = ITEM_AUDIO_MAP[type]?.[n];
  if (!url) {
    console.warn(`[MathItemsIntro] Missing item audio: ${type}/${n}.wav`);
    return null;
  }
  return url;
}

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getNumberColor(subject: string = "math"): string {
  const colors: Record<string, string> = {
    math: "#2E8B57",
    english: "#4D82F6",
    urdu: "#CC6B2C",
  };
  return colors[subject] || "#2E8B57";
}

// ═══════════════════════════════════════════════════════════════
//  🎯 GROUP SEQUENCE
// ═══════════════════════════════════════════════════════════════
const GROUP_ORDER: ItemType[] = ["pencil", "bag", "car"];

// ─── Font CSS ───────────────────────────────────────────────
const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ─── Animations CSS ─────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes mi-fade-scale-in {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes mi-number-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.15); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes mi-intro-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.9); }
  }
  @keyframes mi-intro-fade-in {
    0%   { opacity: 0; transform: scale(0.7); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mi-items-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mi-item-enter {
    0%   { opacity: 0; transform: scale(0.4) translateY(15px); }
    60%  { opacity: 1; transform: scale(1.06) translateY(-3px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mi-group-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.9); }
  }
  @keyframes mi-group-fade-in {
    0%   { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mi-progress-fill {
    from { width: 0%; }
    to { width: 100%; }
  }
  @keyframes mi-item-bounce {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }

  .mi-number-anim { animation: mi-fade-scale-in 0.5s ease-out both; }
  .mi-item-enter { animation: mi-item-enter 0.45s cubic-bezier(.34,1.4,.64,1) both; }
  .mi-number-pop { animation: mi-number-pop 0.4s ease-out both; }
  .mi-intro-fade-out { animation: mi-intro-fade-out 0.5s ease-out both; }
  .mi-intro-fade-in { animation: mi-intro-fade-in 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .mi-items-fade-in { animation: mi-items-fade-in 0.5s ease-out both; }
  .mi-group-fade-out { animation: mi-group-fade-out 0.35s ease-in both; }
  .mi-group-fade-in { animation: mi-group-fade-in 0.4s ease-out both; }
  .mi-progress-bar {
    animation: mi-progress-fill 4s linear forwards;
  }
  .mi-item-bounce {
    animation: mi-item-bounce 0.6s cubic-bezier(.34,1.4,.64,1);
  }
`;

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER — Simple "watched" pattern
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  numberChar: string,
  _qty: number,
  completed: boolean,
  _repeatCount: number,
): string {
  // 🔥 Uncompleted — simple
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  // 🔥 Completed
  return `${studentName} watched the number '${numberChar}' introduction completely.`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Props {
  number: string;
  numberName?: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
  onNext?: () => void;
}

export function MathNumbersItemsIntroductionBase({
  number,
  numberName,
  subject = "math",
  level,
  lessonId,
  onComplete,
  onNext,
}: Props) {
  const navigate = useNavigate();

  const numberChar = number;
  const numberColor = getNumberColor(subject);
  const qty = parseInt(numberChar, 10) || 0;
  const isZero = numberChar === "0" || qty === 0;

  // ─── Phases ─────────────────────────────────────────────
  type Phase = "intro" | "items" | "finished";
  const [phase, setPhase] = useState<Phase>("intro");

  // ─── Intro (number display) ─────────────────────────────
  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);

  // ─── Group State ────────────────────────────────────────
  const [groupIndex, setGroupIndex] = useState(0);
  const [groupStage, setGroupStage] = useState<"entering" | "idle" | "exiting">("entering");
  const [audioEnded, setAudioEnded] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // 🔥 Number playing → number red
  const [numberPlaying, setNumberPlaying] = useState(false);

  // 🔥 Item playing → items bounce
  const [itemBouncing, setItemBouncing] = useState(false);

  // ─── Audio System (SINGLE GLOBAL AUDIO ELEMENT) ─────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // ─── Timer Refs ─────────────────────────────────────────
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedGroupRef = useRef<number>(-1);
  const isMountedRef = useRef(true);
  const isNavigatingRef = useRef(false);
  const isSequenceRunningRef = useRef<boolean>(false);

  // 🔥 Cancel tokens
  const cancelTokenRef = useRef<number>(0);

  // ─── Progress Refs ──────────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const repeatCountRef = useRef<number>(0);

  const currentGroupType = GROUP_ORDER[groupIndex] || "pencil";
  const totalGroups = GROUP_ORDER.length;
  const isLastGroup = groupIndex === totalGroups - 1;

  const goToLevelPopupRef = useRef<() => void>(() => {});
  const advanceToNextGroupRef = useRef<() => void>(() => {});

  // ═══════════════════════════════════════════════════════
  //  AUDIO HELPERS — SINGLE ELEMENT
  // ═══════════════════════════════════════════════════════

  const killAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.onended = null;
      a.onerror = null;
      a.oncanplaythrough = null;
      a.src = "";
      a.load();
    } catch {}
    audioRef.current = null;
    isPlayingRef.current = false;
  }, []);

  const playAudio = useCallback(
    (src: string, token: number, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        killAudio();

        if (token !== cancelTokenRef.current) {
          resolve();
          return;
        }

        try {
          const audio = new Audio(src);
          audio.preload = "auto";
          audioRef.current = audio;
          isPlayingRef.current = true;

          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            if (audioRef.current === audio) {
              audioRef.current = null;
              isPlayingRef.current = false;
            }
            if (onComplete) onComplete();
            resolve();
          };

          audio.onended = finish;
          audio.onerror = () => {
            console.warn("[MathItemsIntro] Audio error:", src);
            finish();
          };

          const tryPlay = () => {
            if (finished) return;
            if (token !== cancelTokenRef.current) {
              finish();
              return;
            }
            audio.play().catch((err) => {
              console.warn("[MathItemsIntro] play() rejected:", err);
              finish();
            });
          };

          if (audio.readyState >= 3) {
            tryPlay();
          } else {
            audio.oncanplaythrough = tryPlay;
            setTimeout(() => {
              if (!finished && audio.paused) tryPlay();
            }, 2000);
          }
        } catch (err) {
          console.warn("[MathItemsIntro] Audio setup failed:", err);
          isPlayingRef.current = false;
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [killAudio],
  );

  const clearAllTimers = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    if (introTimeoutRef.current) {
      clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }
  }, []);

  // ─── Intro audio ────────────────────────────────────────
  const playIntroAudio = useCallback(
    (token: number): Promise<void> => {
      return new Promise((resolve) => {
        playAudio(IntroAudio, token, () => resolve());
      });
    },
    [playAudio],
  );

  // ─── Number audio ───────────────────────────────────────
  const playNumberAudio = useCallback(
    (token: number): Promise<void> => {
      return new Promise((resolve) => {
        const url = getNumberAudioUrl(numberChar);
        if (!url) {
          resolve();
          return;
        }
        setNumberPlaying(true);
        playAudio(url, token, () => {
          setNumberPlaying(false);
          resolve();
        });
      });
    },
    [numberChar, playAudio],
  );

  // ─── Item audio ─────────────────────────────────────────
  const playItemAudio = useCallback(
    (type: ItemType, token: number): Promise<void> => {
      return new Promise((resolve) => {
        const url = getItemAudioUrl(type, numberChar);
        if (!url) {
          resolve();
          return;
        }
        setItemBouncing(true);
        playAudio(url, token, () => {
          setItemBouncing(false);
          resolve();
        });
      });
    },
    [numberChar, playAudio],
  );

  // ═══════════════════════════════════════════════════════
  //  🔥 GROUP AUDIO SEQUENCE
  // ═══════════════════════════════════════════════════════
  const playGroupAudio = useCallback(
    async (type: ItemType, token: number): Promise<void> => {
      if (isSequenceRunningRef.current) return;
      isSequenceRunningRef.current = true;

      try {
        await playNumberAudio(token);
        if (!isMountedRef.current) return;
        if (token !== cancelTokenRef.current) return;

        await playItemAudio(type, token);
        if (!isMountedRef.current) return;
        if (token !== cancelTokenRef.current) return;
      } finally {
        isSequenceRunningRef.current = false;
      }
    },
    [playNumberAudio, playItemAudio],
  );

  // ─── Mount + Unmount save ────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    repeatCountRef.current = 0;
    isSequenceRunningRef.current = false;
    isNavigatingRef.current = false;
    cancelTokenRef.current = 0;

    setPhase("intro");
    setShowIntro(true);

    return () => {
      // 🔥 FULL CLEANUP
      isMountedRef.current = false;
      cancelTokenRef.current += 1;
      clearAllTimers();
      killAudio();
      isPlayingRef.current = false;
      isSequenceRunningRef.current = false;
      playedGroupRef.current = -1;

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;
            const studentName = session.student.studentName || "Student";
            const summary = buildSummary(studentName, numberChar, qty, false, repeatCountRef.current);

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject,
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                number: numberChar,
                numberName: numberName || "",
                qty,
                groups: ["pencil", "bag", "car"],
                completed: false,
              },
            }).catch((err) => console.warn("[MathItems] Save partial failed:", err));
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Intro Flow — NUMBER shown, audio plays, then fade ──
  useEffect(() => {
    if (phase !== "intro" || !showIntro) return;

    const token = ++cancelTokenRef.current;
    let cancelled = false;

    const startIntro = async () => {
      await new Promise<void>((r) => {
        introTimeoutRef.current = setTimeout(r, 300);
      });
      if (!isMountedRef.current || cancelled || token !== cancelTokenRef.current) return;

      // 🔥 Race: audio vs minimum display (2.5s)
      const MIN_INTRO_MS = 2500;
      const minDisplay = new Promise<void>((r) => {
        introTimeoutRef.current = setTimeout(r, MIN_INTRO_MS);
      });

      await Promise.all([playIntroAudio(token), minDisplay]);
      if (!isMountedRef.current || cancelled || token !== cancelTokenRef.current) return;

      setIntroFading(true);
      await new Promise<void>((r) => {
        introTimeoutRef.current = setTimeout(r, 500);
      });
      if (!isMountedRef.current || cancelled || token !== cancelTokenRef.current) return;

      setShowIntro(false);
      setIntroFading(false);

      if (isZero) {
        setPhase("items");
        setTimeout(() => {
          if (isMountedRef.current && !cancelled) finishAllGroups();
        }, 300);
        return;
      }

      setPhase("items");
      setGroupIndex(0);
      setGroupStage("entering");
    };

    startIntro();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, showIntro]);

  // ─── Start wait window (4 sec) ─────────────────────────
  const startWaitWindow = useCallback(() => {
    setAudioEnded(true);
    setProgressKey((k) => k + 1);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      advanceToNextGroupRef.current();
    }, 4000);
  }, []);

  // ─── Group Logic ────────────────────────────────────────
  const playCurrentGroupAudio = useCallback(() => {
    if (isZero) return;
    setAudioEnded(false);
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    const token = ++cancelTokenRef.current;
    playGroupAudio(currentGroupType, token).then(() => {
      if (!isMountedRef.current) return;
      if (token !== cancelTokenRef.current) return;
      startWaitWindow();
    });
  }, [isZero, currentGroupType, playGroupAudio, startWaitWindow]);

  const advanceToNextGroup = useCallback(() => {
    if (isNavigatingRef.current) return;
    clearAllTimers();

    if (isLastGroup) {
      finishAllGroups();
      return;
    }

    setGroupStage("exiting");
    stageTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setAudioEnded(false);
      setGroupIndex((prev) => prev + 1);
      setGroupStage("entering");
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastGroup, clearAllTimers]);

  useEffect(() => {
    advanceToNextGroupRef.current = advanceToNextGroup;
  }, [advanceToNextGroup]);

  const finishAllGroups = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setPhase("finished");
    onComplete?.();

    if (!completedRef.current && !progressSavedRef.current) {
      completedRef.current = true;
      progressSavedRef.current = true;

      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      const session = getSession();
      if (session?.student) {
        const studentName = session.student.studentName || "Student";
        const summary = buildSummary(studentName, numberChar, qty, true, repeatCountRef.current);

        saveProgress({
          studentId: session.student.studentId,
          deviceToken: session.student.token,
          subject,
          level: level || 1,
          lessonId: lessonId || 1,
          status: "completed",
          timeSpentSec: elapsed,
          summary,
          gameData: {
            number: numberChar,
            numberName: numberName || "",
            qty,
            groups: ["pencil", "bag", "car"],
            repeatCount: repeatCountRef.current,
            completed: true,
          },
        }).catch((err) => console.warn("[MathItems] Save completed failed:", err));
      }
    }

    stageTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      goToLevelPopupRef.current();
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numberChar, numberName, qty, subject, level, lessonId, onComplete]);

  useEffect(() => {
    if (phase === "items" && !isZero && playedGroupRef.current !== groupIndex) {
      playedGroupRef.current = groupIndex;
      const t = setTimeout(() => {
        if (isMountedRef.current) {
          setGroupStage("idle");
          playCurrentGroupAudio();
        }
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, groupIndex, isZero]);

  // 🔥 Tap handler
  const handleCardTap = useCallback(() => {
    if (!audioEnded || isZero) return;
    if (isSequenceRunningRef.current) return;

    repeatCountRef.current = repeatCountRef.current + 1;
    clearAllTimers();
    setAudioEnded(false);

    const token = ++cancelTokenRef.current;
    playGroupAudio(currentGroupType, token).then(() => {
      if (!isMountedRef.current) return;
      if (token !== cancelTokenRef.current) return;
      startWaitWindow();
    });
  }, [
    audioEnded,
    isZero,
    currentGroupType,
    clearAllTimers,
    playGroupAudio,
    startWaitWindow,
  ]);

  const goToLevelPopup = useCallback(() => {
    killAudio();
    if (onNext) { onNext(); return; }
    if (subject !== undefined && level !== undefined) {
      navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
    }
  }, [navigate, subject, level, onNext, killAudio]);

  useEffect(() => {
    goToLevelPopupRef.current = goToLevelPopup;
  }, [goToLevelPopup]);

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  const itemsNumberSize = "min(42vh, 360px)";

  // ─── PHASE: intro — SHOW NUMBER IN CENTER ────────────────
  if (phase === "intro") {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden p-2">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <div
          className={introFading ? "mi-intro-fade-out" : "mi-intro-fade-in"}
          style={{ overflow: "visible" }}
        >
          <span
            style={{
              fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "min(60vh, 520px)",
              color: numberColor,
              textShadow: "0 6px 18px rgba(0,0,0,0.12)",
              lineHeight: 1,
              display: "block",
              letterSpacing: "0.02em",
              overflow: "visible",
            }}
          >
            {numberChar}
          </span>
        </div>
      </div>
    );
  }

  // ─── PHASE: items ────────────────────────────────────────
  const isExiting = groupStage === "exiting";
  const isEntering = groupStage === "entering";
  const isFinished = phase === "finished";

  const ItemComponent = ITEM_COMPONENTS[currentGroupType];

  return (
    <div
      className="relative h-full w-full bg-transparent p-2 sm:p-3 overflow-hidden mi-items-fade-in"
      onClick={handleCardTap}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* Progress bar */}
      {audioEnded && !isFinished && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 h-1.5 w-20 sm:w-28 rounded-full bg-black/10 overflow-hidden z-20">
          <div key={progressKey} className="h-full bg-[#2E8B57] rounded-full mi-progress-bar" />
        </div>
      )}

      <div className="h-full w-full flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6">
        {/* ─── LEFT: Number ──────────────────────────────── */}
        <div
          className="flex-1 flex items-center justify-center h-full"
          style={{ overflow: "visible" }}
        >
          <div
            className={`relative ${isFinished ? "opacity-40" : "mi-number-anim"}`}
            style={{ overflow: "visible", transition: "opacity 0.3s ease" }}
          >
            <span
              style={{
                fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: itemsNumberSize,
                color: numberPlaying ? "#E30613" : numberColor,
                textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                lineHeight: 1,
                display: "block",
                letterSpacing: "0.02em",
                overflow: "visible",
                transition: "color 0.15s ease",
              }}
            >
              {numberChar}
            </span>
          </div>
        </div>

        {/* ─── RIGHT: Items ──────────────────────────────── */}
        <div
          className="flex-1 flex items-center justify-center h-full"
          style={{ overflow: "visible" }}
        >
          <div
            className={`
              flex items-center justify-center
              ${isEntering ? "mi-group-fade-in" : ""}
              ${isExiting ? "mi-group-fade-out" : ""}
            `}
            style={{ overflow: "visible" }}
          >
            <div
              className={itemBouncing ? "mi-item-bounce" : ""}
              style={{ transformOrigin: "center", willChange: "transform" }}
            >
              <ItemsPacker
                qty={qty}
                ItemComponent={ItemComponent}
                groupKey={`${currentGroupType}-${groupIndex}`}
                enterDelayMs={80}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MathNumbersItemsIntroductionBase;