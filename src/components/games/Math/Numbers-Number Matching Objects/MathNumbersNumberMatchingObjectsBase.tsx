// src/components/games/Math/Numbers-Number Matching Objects/MathNumbersNumberMatchingObjectsBase.tsx
// ✅ Based on MathNumbersMatchingBase
// 🔢 Target number on LEFT, 3 outlined boxes with CSS BALLS on RIGHT
// 🎯 Child must count balls and match with the target number
// ⚽ CSS-built balls — 2-9 balls all use SAME flex approach for consistent sizing
//    2 balls  → 1 row of 2 (45% each)
//    3 balls  → 2 top + 1 center (45% each)
//    4 balls  → 2×2 (45% each)
//    5 balls  → 3 top + 2 bottom centered (30% each)
//    6 balls  → 3×2 (30% each)
//    7 balls  → 3 top + 3 middle + 1 center bottom (28% each)
//    8 balls  → 3 top + 3 middle + 2 bottom centered (28% each)
//    9 balls  → 3×3 (28% each)
// 🔥 Empty box (0 balls) only appears when target = 0
//    For targets 1-6, empty box never appears as a distractor
// 🎨 Outlined transparent boxes (no fill color)
// 🔤 Font: Andika
// 🎵 Lesson start: Number INTRO audio (from Number Matching Objects folder)
// 🎵 Correct/Wrong: standard correct/wrong sounds
// 🟢 Green theme (Math subject color)
// 🔓 NO INITIAL LOCK — board interactive from frame 1
//
// 📝 Summary: Simple "successfully matched" pattern

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Standard result audios
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
//  🎵 MATH NUMBER MATCHING OBJECTS — INTRO AUDIOS (har number ki apni)
//  Folder: src/assets/Math Assets/Number Matching Objects/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const MATH_NMO_INTRO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Number Matching Objects/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildMathNmoIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(MATH_NMO_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const MATH_NMO_INTRO: Record<string, string> = buildMathNmoIntroMap();

// ═══════════════════════════════════════════════════════════════
//  ⚽ MAX BALLS LIMIT
// ═══════════════════════════════════════════════════════════════

const MAX_BALLS = 9;

// ═══════════════════════════════════════════════════════════════
//  ⚽ DISTRACTOR POOLS
//  🔥 0 ko SMALL_POOL se hata diya hai
//     - Empty box (0) only appears when target = 0? NO — even then target is 0,
//       distractors should be from [1..6] so the child has to pick the empty box
//       as the correct answer.
//     - For target 1-6, distractors from [1..6] (no empty box)
//     - For target 7-9, distractors from [7..9]
// ═══════════════════════════════════════════════════════════════

const SMALL_POOL = [1, 2, 3, 4, 5, 6];
const LARGE_POOL = [7, 8, 9];

function pickDistractors(targetCount: number): [number, number] {
  const useLargePool = targetCount >= 7;
  const pool = useLargePool ? LARGE_POOL : SMALL_POOL;

  const candidates = pool.filter(
    (n) => n !== targetCount && n <= MAX_BALLS,
  );

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked: number[] = [];
  for (const n of shuffled) {
    if (!picked.includes(n)) {
      picked.push(n);
      if (picked.length === 2) break;
    }
  }

  // Fallback safety — agar pool chhota ho gaya
  // Note: 0 bilkul bhi fallback mein nahi aayega (except if target = 0)
  while (picked.length < 2) {
    let fallback = 1;
    // Find any number from 1..9 that isn't the target and not already picked
    for (let candidate = 1; candidate <= MAX_BALLS; candidate++) {
      if (candidate !== targetCount && !picked.includes(candidate)) {
        fallback = candidate;
        break;
      }
    }
    if (fallback !== targetCount && !picked.includes(fallback)) {
      picked.push(fallback);
    } else {
      // Ultimate safety — break to avoid infinite loop
      break;
    }
  }

  return [picked[0] ?? 1, picked[1] ?? 2];
}

// ═══════════════════════════════════════════════════════════════
//  🎨 COLORS
// ═══════════════════════════════════════════════════════════════

function getBoxColors(
  subject: string,
  state: "idle" | "selected" | "correct" | "wrong",
) {
  const themes: Record<string, any> = {
    math: {
      idle: {
        bg: "transparent",
        border: "oklch(0.55 0.2 148)",
        shadow: "transparent",
      },
      selected: {
        bg: "rgba(46, 139, 87, 0.1)",
        border: "oklch(0.55 0.2 148)",
        shadow: "oklch(0.4 0.18 148 / 0.4)",
      },
      correct: {
        bg: "rgba(34, 197, 94, 0.15)",
        border: "#16A34A",
        shadow: "oklch(0.48 0.19 148 / 0.85)",
      },
      wrong: {
        bg: "rgba(239, 68, 68, 0.15)",
        border: "#EF4444",
        shadow: "oklch(0.45 0.22 27 / 0.85)",
      },
    },
  };
  return themes[subject]?.[state] || themes.math.idle;
}

// 🔥 Green gradient for the big target number
const numberGradient =
  "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))";

interface Props {
  number: string;
  numberName?: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Point = { x: number; y: number };

// ═══════════════════════════════════════════════════════════════
//  🎨 CSS
// ═══════════════════════════════════════════════════════════════

const BASE_CSS = `
  @keyframes nmo-pop-in {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    65%  { opacity: 1; transform: scale(1.05) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nmo-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes nmo-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nmo-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.06); }
    70%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @keyframes nmo-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes nmo-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes nmo-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }

  .nmo-pop-in { animation: nmo-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nmo-shake { animation: nmo-shake 0.45s ease-in-out; }
  .nmo-bounce-in { animation: nmo-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .nmo-pop-smooth { animation: nmo-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .nmo-celebration-pop { 
    animation: nmo-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .nmo-celebration-fade-out {
    animation: nmo-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .nmo-pulse {
    animation: nmo-pulse 0.6s ease-in-out infinite alternate;
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  ⚽ CSS BALL — perfect circle with 3D shading                */
  /* ═══════════════════════════════════════════════════════════ */
  .nmo-ball {
    display: block;
    border-radius: 50%;
    position: relative;
    background:
      radial-gradient(
        circle at 32% 28%,
        #FF8A8A 0%,
        #E63946 35%,
        #B71C2E 75%,
        #8B0000 100%
      );
    box-shadow:
      inset -3px -4px 8px rgba(0, 0, 0, 0.35),
      inset 3px 3px 6px rgba(255, 255, 255, 0.25),
      0 3px 6px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
  }

  .nmo-ball::before {
    content: "";
    position: absolute;
    top: 14%;
    left: 18%;
    width: 28%;
    height: 22%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    filter: blur(0.5px);
    pointer-events: none;
  }

  .nmo-ball::after {
    content: "";
    position: absolute;
    bottom: 12%;
    right: 20%;
    width: 18%;
    height: 12%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.35) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
  }
`;

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
//  📝 SUMMARY BUILDER — Simple "successfully matched" pattern
// ═══════════════════════════════════════════════════════════════

interface AttemptRecord {
  attemptNumber: number;
  boxBallCount: number;
  correct: boolean;
}

function buildSummary(
  studentName: string,
  targetNumber: string,
  _targetName: string,
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
      return `${studentName} successfully matched the number '${targetNumber}' to the correct group of objects on the very first attempt.`;
    }
    return `${studentName} successfully matched the number '${targetNumber}' to the correct group of objects on Attempt ${totalAttempts}.`;
  }

  // 🔥 Correct after wrong attempts
  const correctAttemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully matching the number '${targetNumber}' to the correct group of objects on Attempt ${correctAttemptNumber}.`;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MathNumbersNumberMatchingObjectsBase({
  number,
  numberName,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  const targetNumber = number;
  const targetName = numberName;
  const targetCount = parseInt(targetNumber, 10) || 0;

  const boxOptions = useMemo(() => {
    const [d1, d2] = pickDistractors(targetCount);
    const counts = [targetCount, d1, d2];

    for (let i = counts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [counts[i], counts[j]] = [counts[j], counts[i]];
    }
    return counts;
  }, [targetNumber, targetCount]);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const attemptsRef = useRef<AttemptRecord[]>([]);
  const attemptNumRef = useRef<number>(0);
  const sessionCompletedRef = useRef<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

            const done = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
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
    (src: string): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();
        try {
          const audio = new Audio(src);
          audioRefs.current.push(audio);
          setIsAudioPlaying(true);

          const done = () => {
            setIsAudioPlaying(false);
            const idx = audioRefs.current.indexOf(audio);
            if (idx !== -1) audioRefs.current.splice(idx, 1);
            resolve();
          };

          audio.onended = done;
          audio.onerror = done;
          audio.play().catch(done);
        } catch {
          setIsAudioPlaying(false);
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  // ─── 🔥 Play Intro Audio (Number Matching Objects) ──────────
  const playNumberAudio = useCallback((): Promise<void> => {
    const audioUrl = MATH_NMO_INTRO[targetNumber];
    if (!audioUrl) {
      console.warn(
        `[NumberMatchingObjects] No intro audio for number: ${targetNumber}`,
      );
      return Promise.resolve();
    }
    return playAudio(audioUrl);
  }, [playAudio, targetNumber]);

  const playResultAudio = useCallback(
    (isCorrectResult: boolean): Promise<void> => {
      const srcs = isCorrectResult
        ? [correctMP3, correctWAV]
        : [wrongMP3, wrongWAV];
      return playMultipleAudios(srcs);
    },
    [playMultipleAudios],
  );

  useEffect(() => {
    return () => {
      stopAllAudio();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, [stopAllAudio]);

  const preloadAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => resolve();
        audio.load();
        setTimeout(resolve, 3000);
      } catch {
        resolve();
      }
    });
  }, []);

  const preloadAllAudio = useCallback(async () => {
    const urls = [
      MATH_NMO_INTRO[targetNumber],
      correctMP3,
      correctWAV,
      wrongMP3,
      wrongWAV,
    ].filter(Boolean);
    await Promise.all(urls.map(preloadAudio));
  }, [preloadAudio, targetNumber]);

  const loadFont = useCallback(async () => {
    try {
      const font = new FontFace("Andika", `url(${andikaFontUrl})`);
      await font.load();
      document.fonts.add(font);
    } catch (err) {
      console.warn("Andika font load failed:", err);
    }
  }, []);

  // ─── Mount Effect (NO LOCK) ────────────────────────────────
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    attemptNumRef.current = 0;
    sessionCompletedRef.current = false;

    const init = async () => {
      await Promise.all([loadFont(), preloadAllAudio()]);
      // 🔓 No lock — board interactive from frame 1
      setTimeout(() => {
        playNumberAudio();
      }, 300);
    };
    init();

    return () => {
      stopAllAudio();

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;

            const studentName =
              sessionData.student.studentName || "Student";

            const summary = buildSummary(
              studentName,
              targetNumber,
              targetName || "",
              attemptsRef.current,
              sessionCompletedRef.current,
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
                number: targetNumber,
                numberName: targetName,
                attempts: attemptsRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn(
                "[NumberMatchingObjects] Save partial failed:",
                err,
              );
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    navigate({
      to: "/levels",
      search: {
        subject,
        level,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, stopAllAudio]);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<
    "idle" | "pop" | "fade"
  >("idle");

  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [lineEnd, setLineEnd] = useState<Point | null>(null);
  const [isLineLocked, setIsLineLocked] = useState(false);
  const [showLine, setShowLine] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const numberRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const getNumberCenter = useCallback((): Point | null => {
    const board = boardRef.current;
    const el = numberRef.current;
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  const getOptionCenter = useCallback((key: number): Point | null => {
    const board = boardRef.current;
    const el = optionRefs.current[key];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {};
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (selected === null || status !== "idle" || isAudioPlaying) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const isCorrectChoice = selected === targetCount;

    if (isCorrectChoice) {
      attemptNumRef.current += 1;
      attemptsRef.current.push({
        attemptNumber: attemptNumRef.current,
        boxBallCount: selected,
        correct: true,
      });
      sessionCompletedRef.current = true;

      setStatus("correct");
      setShowCelebration(true);
      setCelebrationPhase("pop");

      playResultAudio(true).then(() => {
        setCelebrationPhase("fade");
        celebrationTimerRef.current = setTimeout(() => {
          setShowCelebration(false);

          if (!completedRef.current && !progressSavedRef.current) {
            completedRef.current = true;
            progressSavedRef.current = true;

            const elapsed = Math.floor(
              (Date.now() - sessionStartTimeRef.current) / 1000,
            );

            const sessionData = getSession();
            if (sessionData?.student) {
              const studentName =
                sessionData.student.studentName || "Student";

              const summary = buildSummary(
                studentName,
                targetNumber,
                targetName || "",
                attemptsRef.current,
                true,
              );

              saveProgress({
                studentId: sessionData.student.studentId,
                deviceToken: sessionData.student.token,
                subject,
                level,
                lessonId,
                status: "completed",
                timeSpentSec: elapsed,
                summary,
                gameData: {
                  number: targetNumber,
                  numberName: targetName,
                  attempts: attemptsRef.current,
                  completed: true,
                },
              }).catch((err) => {
                console.warn(
                  "[NumberMatchingObjects] Save completed failed:",
                  err,
                );
              });
            }
          }

          timerRef.current = setTimeout(() => {
            goToLevelPopup();
          }, 400);
        }, 500);
      });
    } else {
      attemptNumRef.current += 1;
      attemptsRef.current.push({
        attemptNumber: attemptNumRef.current,
        boxBallCount: selected,
        correct: false,
      });

      setStatus("wrong");

      playResultAudio(false).then(() => {
        timerRef.current = setTimeout(() => {
          setStatus("idle");
          setSelected(null);
          setLineEnd(null);
          setIsLineLocked(false);
          setHoveredOption(null);
          setShowLine(false);
          setIsDragging(false);
          setDragPoint(null);
          setLineStart(null);
        }, 300);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, targetCount, status, isAudioPlaying]);

  useEffect(() => {
    if (selected !== null) {
      const end = getOptionCenter(selected);
      setLineEnd(end);
      setIsLineLocked(true);
      setShowLine(true);
      setHoveredOption(null);
    }
  }, [selected, getOptionCenter]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isAudioPlaying) return;
    if (status === "correct" || status === "wrong") return;
    if (isLineLocked) return;

    const numEl = numberRef.current;
    if (!numEl) return;

    const r = numEl.getBoundingClientRect();
    const boxPadding = 10;
    const isInBox =
      e.clientX >= r.left + boxPadding &&
      e.clientX <= r.right - boxPadding &&
      e.clientY >= r.top + boxPadding &&
      e.clientY <= r.bottom - boxPadding;

    if (!isInBox) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const distance = Math.hypot(e.clientX - cx, e.clientY - cy);
      const maxDistance = Math.min(r.width, r.height) * 0.35;
      if (distance > maxDistance) return;
    }

    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setShowLine(true);

    const start = getNumberCenter();
    setLineStart(start);

    const board = boardRef.current;
    if (board) {
      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };
      setDragPoint(point);
      setLineEnd(point);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isAudioPlaying) return;
    if (!isDragging || isLineLocked || status !== "idle") return;

    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const point = { x: e.clientX - b.left, y: e.clientY - b.top };
    setDragPoint(point);
    setLineEnd(point);
    setShowLine(true);

    let hit: number | null = null;
    for (const [keyStr, el] of Object.entries(optionRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const padding = 15;
      if (
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding
      ) {
        hit = Number(keyStr);
        break;
      }
    }
    setHoveredOption(hit);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isAudioPlaying) return;
    if (!isDragging) return;
    setIsDragging(false);
    setDragPoint(null);
    setHoveredOption(null);

    if (isLineLocked) return;

    let hit: number | null = null;
    for (const [keyStr, el] of Object.entries(optionRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const padding = 15;
      if (
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding
      ) {
        hit = Number(keyStr);
        break;
      }
    }

    if (hit !== null) {
      setSelected(hit);
      const end = getOptionCenter(hit);
      setLineEnd(end);
      setIsLineLocked(true);
      setShowLine(true);
    } else {
      setSelected(null);
      setLineEnd(null);
      setLineStart(null);
      setIsLineLocked(false);
      setShowLine(false);
    }
  };

  const startPoint = lineStart || getNumberCenter();
  const endPoint = lineEnd;
  const shouldShowLine = showLine && startPoint && endPoint;

  let lineColor = "#000000";
  if (status === "correct") lineColor = "#22C55E";
  else if (status === "wrong") lineColor = "#EF4444";

  const lineLength =
    startPoint && endPoint
      ? Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
      : 0;
  const lineAngle =
    startPoint && endPoint
      ? Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x)
      : 0;

  const celebrationClass =
    celebrationPhase === "pop"
      ? "nmo-celebration-pop"
      : celebrationPhase === "fade"
        ? "nmo-celebration-fade-out"
        : "";

  // 🔓 Only block on correct/wrong (for line-draw freeze during result animation)
  const isGameLocked = status === "correct" || status === "wrong";

  // ═══════════════════════════════════════════════════════════
  //  ⚽ RENDER CSS BALLS
  // ═══════════════════════════════════════════════════════════

  const renderBalls = (count: number) => {
    // 🔥 0 balls → empty box (only happens when target = 0)
    if (count === 0) {
      return <div className="w-full h-full" />;
    }

    const PADDING = 8;

    // ═══ 1 BALL ═══
    if (count === 1) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            className="nmo-ball"
            style={{
              width: "62%",
              aspectRatio: "1 / 1",
              maxHeight: "100%",
            }}
          />
        </div>
      );
    }

    // ═══ 2 BALLS ═══
    if (count === 2) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "2%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="nmo-ball"
              style={{
                width: "45%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          ))}
        </div>
      );
    }

    // ═══ 3 BALLS ═══ 2 top + 1 center
    if (count === 3) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "45%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "50%",
            }}
          >
            <div
              className="nmo-ball"
              style={{
                width: "45%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>
      );
    }

    // ═══ 4 BALLS ═══ 2×2
    if (count === 4) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "50%",
              }}
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="nmo-ball"
                  style={{
                    width: "45%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ═══ 5 BALLS ═══ 3 top + 2 bottom centered
    if (count === 5) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "30%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "30%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ═══ 6 BALLS ═══ 3×2
    if (count === 6) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "50%",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="nmo-ball"
                  style={{
                    width: "30%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ═══ 7 BALLS ═══ 3 top + 3 middle + 1 center bottom (THREE ROWS)
    if (count === 7) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "33%",
            }}
          >
            <div
              className="nmo-ball"
              style={{
                width: "28%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>
      );
    }

    // ═══ 8 BALLS ═══ 3 top + 3 middle + 2 center bottom (THREE ROWS)
    if (count === 8) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="nmo-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ═══ 9 BALLS ═══ 3×3
    if (count === 9) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1, 2].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "33%",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="nmo-ball"
                  style={{
                    width: "28%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Fallback
    return <div className="w-full h-full" />;
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      ref={boardRef}
      className="relative flex h-full w-full select-none flex-col items-center justify-center gap-3 px-3 py-3 sm:gap-5 sm:px-6"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <style>{BASE_CSS}</style>
      <style>{FONT_CSS}</style>

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationClass}`}
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

      <div
        className={`flex h-full w-full items-center justify-center gap-4 sm:gap-8 ${
          isGameLocked ? "pointer-events-none" : ""
        }`}
      >
        {/* ─── LEFT: Target Number (LTR) ───────── */}
        <div
          ref={numberRef}
          className={`flex h-full flex-1 items-center justify-center ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ order: 1 }}
        >
          <div
            className="nmo-pop-in flex h-full w-full items-center justify-center"
            style={{ overflow: "visible" }}
          >
            <span
              style={{
                fontFamily:
                  "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: "min(42vh, 380px)",
                background: numberGradient,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                lineHeight: 1.2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                textAlign: "center",
                paddingBottom: "0.1em",
                overflow: "visible",
              }}
            >
              {targetNumber}
            </span>
          </div>
        </div>

        {/* SPACE */}
        <div className="w-4 sm:w-8 flex-shrink-0" />

        {/* ─── RIGHT: 3 Outlined Boxes with CSS Balls ──────────────── */}
        <div
          className="flex h-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3"
          style={{ order: 2 }}
        >
          {boxOptions.map((ballCount) => {
            const isSelected = selected === ballCount;
            const isCorrect = status === "correct" && isSelected;
            const isWrong = status === "wrong" && isSelected;
            const isDisabled = isGameLocked;
            const isHovered =
              hoveredOption === ballCount &&
              isDragging &&
              !isLineLocked &&
              status === "idle";

            let state: "idle" | "selected" | "correct" | "wrong" = "idle";
            if (isCorrect) state = "correct";
            else if (isWrong) state = "wrong";
            else if (isSelected) state = "selected";

            const colors = getBoxColors(subject, state);

            return (
              <button
                key={ballCount}
                ref={(el) => {
                  optionRefs.current[ballCount] = el;
                }}
                type="button"
                disabled={isDisabled}
                aria-label={`Box with ${ballCount} balls`}
                className={`nmo-pop-in relative flex h-[22vh] max-h-[185px] w-[22vh] max-w-[185px] items-center justify-center rounded-3xl transition-all duration-150 sm:h-[24vh] sm:max-h-[205px] sm:w-[24vh] sm:max-w-[205px] ${
                  isWrong ? "nmo-shake" : ""
                } ${isHovered ? "nmo-pop-smooth" : ""} ${
                  isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  borderWidth: "5px",
                  borderStyle: "solid",
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  boxShadow:
                    state === "idle" ? "none" : `0 6px 0 0 ${colors.shadow}`,
                  padding: "0px",
                  overflow: "hidden",
                  aspectRatio: "1 / 1",
                }}
              >
                <div
                  className="pointer-events-none flex h-full w-full items-center justify-center"
                  style={{ overflow: "hidden" }}
                >
                  {renderBalls(ballCount)}
                </div>

                {isWrong && (
                  <span className="nmo-bounce-in absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-red-600 text-white shadow-lg sm:h-12 sm:w-12">
                    <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />
                  </span>
                )}

                {isCorrect && (
                  <span className="nmo-bounce-in absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-green-600 text-white shadow-lg sm:h-12 sm:w-12">
                    <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── LINE ─────────────────────────────────────────── */}
      {shouldShowLine && startPoint && endPoint && (
        <div
          className="absolute pointer-events-none z-50"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          <div
            style={{
              position: "absolute",
              left: startPoint.x,
              top: startPoint.y,
              width: lineLength,
              height: "6px",
              backgroundColor: lineColor,
              transformOrigin: "left center",
              transform: `rotate(${lineAngle}rad)`,
              borderRadius: "3px",
              boxShadow: `0 0 10px ${lineColor}40, 0 0 20px ${lineColor}20`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: startPoint.x - 10,
              top: startPoint.y - 10,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: lineColor,
              boxShadow: `0 0 12px ${lineColor}60`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: endPoint.x - 10,
              top: endPoint.y - 10,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: lineColor,
              boxShadow: `0 0 12px ${lineColor}60`,
            }}
            className="nmo-pulse"
          />
        </div>
      )}
    </div>
  );
}

export default MathNumbersNumberMatchingObjectsBase;