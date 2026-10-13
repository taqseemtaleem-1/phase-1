// src/components/games/Math/Numbers-Drag Correct Number/MathNumbersDragCorrectNumberBase.tsx
// ✅ Math version of HuroofETahajjiDragCorrectLetterBase
// 🔢 SINGLE session — ek number drag karna hai box mein
// 🔥 1 correct number + 3 FIXED distractors (numbers)
// 🎨 Green theme (Math subject color)
// 🎵 Lesson start: Number INTRO audio (from Drag Correct Number folder)
// 🎵 Correct/Wrong: standard sounds
// 📝 Summary: Simple "Ahmed successfully dragged..." pattern
// 🔥 Box empty when idle, number shows inside after drop
// 🔓 NO INITIAL LOCK — board interactive from frame 1

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio — Correct / Wrong
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Andika Font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎵 MATH DRAG CORRECT NUMBER — INTRO AUDIOS (har number ki apni)
//  Folder: src/assets/Math Assets/Drag Correct Number/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const MATH_DRAG_INTRO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Drag Correct Number/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildMathDragIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(MATH_DRAG_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const MATH_DRAG_INTRO: Record<string, string> = buildMathDragIntroMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 MATH DISTRACTORS MAP
//  Har number ke liye 3 visually-similar distractor numbers
// ═══════════════════════════════════════════════════════════════

const MATH_DISTRACTORS_MAP: Record<string, string[]> = {
  "0": ["8", "6", "9"],
  "1": ["7", "4", "2"],
  "2": ["7", "3", "5"],
  "3": ["8", "5", "2"],
  "4": ["1", "9", "7"],
  "5": ["6", "3", "8"],
  "6": ["5", "8", "9"],
  "7": ["1", "2", "4"],
  "8": ["0", "6", "3"],
  "9": ["4", "7", "0"],
};

const ALL_NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// 🔥 Green gradient for option cards (Math theme)
const GRADIENT_BG = "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))";

// ═══════════════════════════════════════════════════════════════
//  🎨 SUBJECT COLORS
// ═══════════════════════════════════════════════════════════════

const SUBJECT_COLORS: Record<string, { idleBg: string; shadow: string; textColor: string }> = {
  english: {
    idleBg: "#4D82F6",
    shadow: "oklch(0.35 0.18 260 / 0.85)",
    textColor: "#4D82F6",
  },
  math: {
    idleBg: GRADIENT_BG,
    shadow: "oklch(0.4 0.18 148 / 0.85)",
    textColor: "#2E8B57",
  },
  urdu: {
    idleBg: "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))",
    shadow: "oklch(0.4 0.18 40 / 0.85)",
    textColor: "#CC6B2C",
  },
};

function getSubjectColor(subject: string = "math") {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.math;
}

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT CSS
// ═══════════════════════════════════════════════════════════════

const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  🎬 GAME CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes mdn-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mdn-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes mdn-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mdn-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes mdn-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes mdn-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mdn-wrong-flash {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95); }
    40%  { transform: scale(1.05); }
    60%  { transform: scale(0.98); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes mdn-drop-success {
    0%   { transform: scale(0.5); }
    60%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes mdn-target-pulse {
    0%, 100% { 
      border-color: #2E8B57; 
      box-shadow: 0 0 0 0 rgba(46, 139, 87, 0);
      transform: scale(1);
    }
    50% { 
      border-color: #267a4b; 
      box-shadow: 0 0 20px 4px rgba(46, 139, 87, 0.15);
      transform: scale(1.02);
    }
  }

  .mdn-pop-in { animation: mdn-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .mdn-shake { animation: mdn-shake 0.45s ease-in-out; }
  .mdn-bounce-in { animation: mdn-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .mdn-celebration-pop { 
    animation: mdn-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .mdn-celebration-fade-out {
    animation: mdn-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .mdn-reset-bounce {
    animation: mdn-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mdn-wrong-flash {
    animation: mdn-wrong-flash 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mdn-drop-success {
    animation: mdn-drop-success 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mdn-target-pulse {
    animation: mdn-target-pulse 1.8s ease-in-out infinite;
  }

  .mdn-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .mdn-lock-overlay-enter {
    animation: mdn-overlay-in 0.15s ease-out both;
  }
  @keyframes mdn-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  number: string;
  numberName?: string;
  subject: string;
  level: number;
  lessonId: number;
}

interface BoxState {
  base: string;
  matched: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  matchedNumber: string | null;
  isTarget: boolean;
}

type Point = { x: number; y: number };

interface AttemptRecord {
  attemptNumber: number;
  number: string;
  correct: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 OPTION GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateOptions(
  targetNumber: string,
): { picks: string[]; wrongPicks: string[] } {
  const fixedDistractors = MATH_DISTRACTORS_MAP[targetNumber] || ["1", "2", "3"];
  const wrongPicks = [...fixedDistractors].slice(0, 3);

  const picks = [targetNumber, ...wrongPicks];
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }

  return {
    picks,
    wrongPicks: [...wrongPicks].sort(),
  };
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — Simple "successfully" pattern
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  target: string,
  _options: string[],
  attempts: AttemptRecord[],
  completed: boolean,
): string {
  // 🔥 Uncompleted — simple
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const wrongCount = attempts.filter((a) => !a.correct).length;
  const totalAttempts = attempts.length;

  // 🔥 First try correct
  if (wrongCount === 0) {
    if (totalAttempts === 1) {
      return `${studentName} successfully dragged the number '${target}' into the box on the very first attempt.`;
    }
    return `${studentName} successfully dragged the number '${target}' into the box on Attempt ${totalAttempts}.`;
  }

  // 🔥 Correct after wrong attempts
  const correctAttemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully dragging the number '${target}' into the box on Attempt ${correctAttemptNumber}.`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MathNumbersDragCorrectNumberBase({
  number,
  numberName,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const colors = getSubjectColor(subject);

  const targetNumber = number;

  // ─── State ──────────────────────────────────────────────────
  const [box, setBox] = useState<BoxState>({
    base: targetNumber,
    matched: false,
    isCorrect: false,
    isWrong: false,
    matchedNumber: null,
    isTarget: true,
  });

  const [smallNumbers, setSmallNumbers] = useState<string[]>([]);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    number: string | null;
    position: Point | null;
  }>({
    isDragging: false,
    number: null,
    position: null,
  });

  const [hoveredBox, setHoveredBox] = useState(false);
  const [isWrongLocked, setIsWrongLocked] = useState(false);

  // ─── Audio ──────────────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const introPlayedRef = useRef<boolean>(false);

  // ─── Celebration ──────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  const wrongLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ─── 🔥 PROGRESS TRACKING REFS ──────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const attemptsRef = useRef<AttemptRecord[]>([]);
  const attemptNumRef = useRef<number>(0);
  const completedCheckRef = useRef<boolean>(false);
  const optionsRef = useRef<string[]>([]);

  // ─── 🔥 STOP SINGLE AUDIO ─────────────────────────────────────
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
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                audioRefs.current = [];
                resolve();
              }
            };

            audio.play().catch(() => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                audioRefs.current = [];
                resolve();
              }
            });
          } catch {
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

  const playAudio = useCallback(
    (src: string, onComplete?: () => void, isIntro: boolean = false): Promise<void> => {
      return new Promise((resolve) => {
        if (!isIntro) {
          stopAllAudio();
        }

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
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.play().catch(() => {
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          });
        } catch {
          setIsAudioPlaying(false);
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  // ─── 🔥 Play Intro Audio (Drag Correct Number) ──────────────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;

    const path = MATH_DRAG_INTRO[targetNumber];
    if (!path) {
      console.warn(`[NumberDrag] No intro audio for number: ${targetNumber}`);
      return;
    }

    introPlayedRef.current = true;
    playAudio(path, undefined, true);
  }, [targetNumber, playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  useEffect(() => {
    playIntroAudioRef.current = playIntroAudio;
  }, [playIntroAudio]);

  const playCorrectAudio = useCallback((): Promise<void> => {
    return playMultipleAudios([correctMP3, correctWAV]);
  }, [playMultipleAudios]);

  const playWrongAudio = useCallback((): Promise<void> => {
    return playMultipleAudios([wrongMP3, wrongWAV]);
  }, [playMultipleAudios]);

  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── Build Small Numbers (Fixed distractors, shuffle positions) ────
  const buildSmallNumbers = useCallback((targetNum: string) => {
    const distractors = MATH_DISTRACTORS_MAP[targetNum] || ["1", "2", "3"];
    const picks = [targetNum, distractors[0], distractors[1], distractors[2]];

    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, []);

  // ─── Initialize ────────────────────────────────────────────
  const initializeGame = useCallback(() => {
    setBox({
      base: targetNumber,
      matched: false,
      isCorrect: false,
      isWrong: false,
      matchedNumber: null,
      isTarget: true,
    });

    const initialSmallNumbers = buildSmallNumbers(targetNumber);
    setSmallNumbers(initialSmallNumbers);
    optionsRef.current = [...initialSmallNumbers].sort();

    setIsGameComplete(false);
    setShowCelebration(false);
    setCelebrationPhase("idle");
    setResetKey((prev) => prev + 1);
    setHoveredBox(false);
    setIsWrongLocked(false);
    setDragState({ isDragging: false, number: null, position: null });
    stopAllAudio();
  }, [targetNumber, buildSmallNumbers, stopAllAudio]);

  // ─── Mount Effect ──────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    attemptNumRef.current = 0;
    completedCheckRef.current = false;

    initializeGame();

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      if (wrongLockTimerRef.current) clearTimeout(wrongLockTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      stopAllAudio();

      // 🔥 Save partial progress on unmount
      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000
        );

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;

            const studentName = sessionData.student.studentName || "Student";

            const summary = buildSummary(
              studentName,
              targetNumber,
              optionsRef.current,
              attemptsRef.current,
              false,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject,
              level,
              lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                targetNumber,
                numberName: numberName || "",
                attempts: attemptsRef.current,
                options: optionsRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[NumberDrag] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPointerPosition = useCallback((e: React.PointerEvent | PointerEvent): Point => {
    return { x: e.clientX - 50, y: e.clientY - 50 };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, num: string) => {
      if (isAudioPlaying) return;
      if (isWrongLocked || isGameComplete) return;
      if (dragState.isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        number: num,
        position: getPointerPosition(e),
      });
    },
    [
      isAudioPlaying,
      isWrongLocked,
      isGameComplete,
      dragState.isDragging,
      getPointerPosition,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.number) return;

      e.preventDefault();

      setDragState((prev) => ({
        ...prev,
        position: getPointerPosition(e),
      }));

      const boxEl = document.querySelector(`[data-box]`);
      if (boxEl) {
        const rect = boxEl.getBoundingClientRect();
        const padding = 20;
        const isOver =
          e.clientX >= rect.left - padding &&
          e.clientX <= rect.right + padding &&
          e.clientY >= rect.top - padding &&
          e.clientY <= rect.bottom + padding;
        setHoveredBox(isOver && !box.matched);
      }
    },
    [dragState.isDragging, dragState.number, box.matched, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.number) {
        setDragState({ isDragging: false, number: null, position: null });
        setHoveredBox(false);
        return;
      }

      const droppedNumber = dragState.number;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({ isDragging: false, number: null, position: null });
      setHoveredBox(false);

      let dropped = false;
      const boxEl = document.querySelector(`[data-box]`);
      if (boxEl) {
        const rect = boxEl.getBoundingClientRect();
        const padding = 20;
        if (
          clientX >= rect.left - padding &&
          clientX <= rect.right + padding &&
          clientY >= rect.top - padding &&
          clientY <= rect.bottom + padding
        ) {
          dropped = true;
        }
      }

      if (dropped && droppedNumber) {
        const isCorrect = droppedNumber === targetNumber;

        attemptNumRef.current += 1;
        attemptsRef.current.push({
          attemptNumber: attemptNumRef.current,
          number: droppedNumber,
          correct: isCorrect,
        });

        if (isCorrect) {
          completedCheckRef.current = true;

          setBox((prev) => ({
            ...prev,
            isCorrect: true,
            matched: true,
            matchedNumber: droppedNumber,
            isTarget: false,
          }));

          setSmallNumbers((prev) => prev.filter((n) => n !== droppedNumber));

          setShowCelebration(true);
          setCelebrationPhase("pop");

          playCorrectAudio().then(() => {
            setCelebrationPhase("fade");
            celebrationTimerRef.current = setTimeout(async () => {
              setShowCelebration(false);
              setCelebrationPhase("idle");
              setIsGameComplete(true);

              // 🔥 Save completed progress
              if (!completedRef.current && !progressSavedRef.current) {
                completedRef.current = true;
                progressSavedRef.current = true;

                const elapsed = Math.floor(
                  (Date.now() - sessionStartTimeRef.current) / 1000
                );

                const sessionData = getSession();
                if (sessionData?.student) {
                  const studentName =
                    sessionData.student.studentName || "Student";

                  const summary = buildSummary(
                    studentName,
                    targetNumber,
                    optionsRef.current,
                    attemptsRef.current,
                    true,
                  );

                  try {
                    await saveProgress({
                      studentId: sessionData.student.studentId,
                      deviceToken: sessionData.student.token,
                      subject,
                      level,
                      lessonId,
                      status: "completed",
                      timeSpentSec: elapsed,
                      summary,
                      gameData: {
                        targetNumber,
                        numberName: numberName || "",
                        attempts: attemptsRef.current,
                        options: optionsRef.current,
                        completed: true,
                      },
                    });
                    console.log("✅ [NumberDrag] Progress saved (completed)");
                  } catch (err) {
                    console.warn("[NumberDrag] Save completed failed:", err);
                  }
                }
              }

              navigateTimerRef.current = setTimeout(() => {
                goToLevelPopup();
              }, 500);
            }, 500);
          });
        } else {
          setIsWrongLocked(true);

          setSmallNumbers((prev) => prev.filter((n) => n !== droppedNumber));

          setBox((prev) => ({
            ...prev,
            isWrong: true,
            matchedNumber: droppedNumber,
          }));

          playWrongAudio().then(() => {
            setIsWrongLocked(false);
            setBox((prev) => ({
              ...prev,
              isWrong: false,
              matchedNumber: null,
            }));
            setSmallNumbers((prev) => [...prev, droppedNumber]);
          });
        }
      }
    },
    [
      dragState,
      box.matched,
      targetNumber,
      numberName,
      playCorrectAudio,
      playWrongAudio,
      goToLevelPopup,
      subject,
      level,
      lessonId,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  //  🔤 FONT SIZE
  // ═══════════════════════════════════════════════════════════

  const getFontSize = (): string => {
    return "min(22vh, 175px)";
  };

  // ─── Render Box (empty when idle, shows number on drop) ────────
  const renderBox = () => {
    const isMatched = box.matched;
    const isCorrect = box.isCorrect;
    const isWrong = box.isWrong;
    const isTarget = box.isTarget && !box.matched;

    let bgColor = "bg-transparent";
    let borderColor = "border-[#2E8B57]";
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let iconBgColor = "";
    let iconTextColor = "";
    let shadowColor = "rgba(46, 139, 87, 0.3)";
    let scaleClass = "";

    const showNumber = (isMatched || isWrong) && box.matchedNumber;
    const displayNumber = showNumber ? box.matchedNumber! : "";
    const fontSize = displayNumber ? getFontSize() : "6rem";

    if (isMatched && isCorrect) {
      bgColor = "bg-green-500";
      borderColor = "border-green-600";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
      iconBgColor = "bg-green-600";
      iconTextColor = "text-white";
      shadowColor = "oklch(0.48 0.19 148 / 0.85)";
      scaleClass = "mdn-drop-success";
    } else if (isWrong) {
      bgColor = "bg-red-500";
      borderColor = "border-red-600";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
      iconBgColor = "bg-red-600";
      iconTextColor = "text-white";
      shadowColor = "oklch(0.45 0.22 27 / 0.85)";
      scaleClass = "mdn-shake mdn-wrong-flash";
    } else if (isTarget) {
      borderColor = "border-[#2E8B57]";
      shadowColor = "rgba(46, 139, 87, 0.3)";
      scaleClass = "mdn-target-pulse";
    }

    return (
      <div
        data-box
        className={`mdn-pop-in clay-sm relative flex flex-col items-center justify-center rounded-2xl border-4 transition-all duration-200 ${bgColor} ${borderColor} ${scaleClass}`}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "100%",
          maxWidth: "220px",
          minWidth: "120px",
          aspectRatio: "1/1",
          padding: "4px",
          borderStyle: "solid",
          borderWidth: "4px",
          overflow: "visible",
        }}
      >
        {showNumber && displayNumber && (
          <div
            className="pointer-events-none flex items-center justify-center"
            style={{
              width: "85%",
              height: "85%",
              overflow: "visible",
            }}
          >
            <span
              style={{
                fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: fontSize,
                color: textColor,
                textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                transition: "color 0.2s ease, font-size 0.2s ease",
                overflow: "visible",
              }}
            >
              {displayNumber}
            </span>
          </div>
        )}

        {showIcon && IconComponent && (
          <span
            className={`mdn-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-12 sm:w-12 ${iconBgColor} ${iconTextColor}`}
          >
            {IconComponent}
          </span>
        )}
      </div>
    );
  };

  // ─── Render Small Number (draggable options) ──────────────
  const renderSmallNumber = (num: string, index: number) => {
    const isDraggingThis = dragState.number === num && dragState.isDragging;
    const isUsed = !smallNumbers.includes(num);
    const isDisabled =
      isUsed || isWrongLocked || isAudioPlaying || isGameComplete;
    const fontSize = getFontSize();

    return (
      <div
        key={`small-${num}-${index}`}
        className={`
          mdn-pop-in clay-sm flex items-center justify-center
          rounded-2xl border-4 border-white transition-all duration-150
          ${isUsed ? "bg-gray-200 opacity-50 cursor-not-allowed" : "cursor-grab"}
          ${isDisabled && !isUsed ? "opacity-60 cursor-not-allowed" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: isUsed ? "none" : colors.shadow,
          width: "100%",
          maxWidth: "180px",
          minWidth: "80px",
          aspectRatio: "1/1",
          padding: "4px",
          touchAction: "none",
          background: isUsed ? undefined : colors.idleBg,
          overflow: "visible",
        }}
        onPointerDown={(e) =>
          !isDisabled && !isDraggingThis && handlePointerDown(e, num)
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && !isUsed && (
          <div
            className="pointer-events-none flex items-center justify-center"
            style={{
              width: "85%",
              height: "85%",
              overflow: "visible",
            }}
          >
            <span
              style={{
                fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: fontSize,
                color: "#FFFFFF",
                textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                overflow: "visible",
              }}
            >
              {num}
            </span>
          </div>
        )}
      </div>
    );
  };

  const gridCols = "grid-cols-4";

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      ref={boardRef}
      className="relative flex h-full w-full select-none flex-col items-center justify-between p-6"
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {isWrongLocked && (
        <div className="mdn-lock-overlay mdn-lock-overlay-enter" />
      )}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl z-50 pointer-events-none
            ${celebrationPhase === "pop" ? "mdn-celebration-pop" : ""}
            ${celebrationPhase === "fade" ? "mdn-celebration-fade-out" : ""}
          `}
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

      <div className="flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}>
          {renderBox()}
        </div>
      </div>

      <div className="flex w-full max-w-4xl items-center justify-center pb-4">
        <div
          className={`grid ${gridCols} gap-3 sm:gap-4 w-full max-w-3xl place-items-center`}
        >
          {smallNumbers.map((num, index) => renderSmallNumber(num, index))}
        </div>
      </div>

      {dragState.isDragging && dragState.number && dragState.position && (
        <span
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: getFontSize(),
            color: "#FFFFFF",
            lineHeight: 1,
            letterSpacing: "0.02em",
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            textShadow: "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {dragState.number}
        </span>
      )}
    </div>
  );
}

export default MathNumbersDragCorrectNumberBase;