// src/components/games/Math/Numbers-Matching/MathNumbersMatchingBase.tsx
// ✅ Math version of HuroofETahajjiMatchingBase
// 🔢 SINGLE number per lesson — no pair, no sessions
// 🎨 LTR layout: Number on LEFT, options on RIGHT
// 🔤 Font: Andika
// 🎵 Lesson start: Number INTRO audio (from Math Numbers Matching folder)
// 🎵 Correct/Wrong: standard correct/wrong sounds
// 🟢 Green theme (Math subject color)
// 🔓 NO LOCK — board interactive from frame 1
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
//  🎵 MATH NUMBER AUDIOS — glob-import all Number (N).wav files
// ═══════════════════════════════════════════════════════════════

const NUMBER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (*).wav",
  { eager: true, query: "?url", import: "default" },
);

function buildNumberAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(NUMBER_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^Number \((\d+)\)\.wav$/);
    if (match) {
      const num = match[1];
      map[num] = url;
    }
  }
  return map;
}

const NUMBER_AUDIO: Record<string, string> = buildNumberAudioMap();

// ═══════════════════════════════════════════════════════════════
//  🎵 MATH NUMBERS MATCHING — INTRO AUDIOS (har number ki apni)
//  Folder: src/assets/Math Assets/Math Numbers Matching/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const MATH_MATCHING_INTRO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Math Numbers Matching/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildMathMatchingIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(MATH_MATCHING_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      const num = match[1];
      map[num] = url;
    }
  }
  return map;
}

const MATH_MATCHING_INTRO: Record<string, string> = buildMathMatchingIntroMap();

// ═══════════════════════════════════════════════════════════════
//  🔢 MATH DISTRACTORS MAP
// ═══════════════════════════════════════════════════════════════

const MATH_DISTRACTORS_MAP: Record<string, string[]> = {
  "0": ["8", "6"],
  "1": ["7", "4"],
  "2": ["7", "3"],
  "3": ["8", "5"],
  "4": ["1", "9"],
  "5": ["6", "3"],
  "6": ["5", "8"],
  "7": ["1", "2"],
  "8": ["0", "6"],
  "9": ["4", "7"],
};

// ═══════════════════════════════════════════════════════════════
//  🎨 COLORS (gradient option cards) — Math Green
// ═══════════════════════════════════════════════════════════════

function getCardColors(subject: string, state: "idle" | "selected" | "correct" | "wrong") {
  const themes: Record<string, any> = {
    math: {
      idle: {
        bg: "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))",
        shadow: "oklch(0.4 0.18 148 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "linear-gradient(145deg, oklch(0.7 0.18 148), oklch(0.55 0.21 148))",
        shadow: "oklch(0.35 0.18 148 / 0.85)",
        text: "#FFFFFF",
      },
      correct: {
        bg: "linear-gradient(145deg, oklch(0.62 0.2 148), oklch(0.5 0.19 148))",
        shadow: "oklch(0.48 0.19 148 / 0.85)",
        text: "#FFFFFF",
      },
      wrong: {
        bg: "linear-gradient(145deg, oklch(0.6 0.22 27), oklch(0.5 0.22 27))",
        shadow: "oklch(0.45 0.22 27 / 0.85)",
        text: "#FFFFFF",
      },
    },
  };
  return themes[subject]?.[state] || themes.math.idle;
}

// 🔥 Green gradient used for the big target number
const numberGradient = "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))";

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
  @keyframes am-pop-in {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    65%  { opacity: 1; transform: scale(1.05) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes am-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes am-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes am-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes am-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes am-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes am-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }

  .am-pop-in { animation: am-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .am-shake { animation: am-shake 0.45s ease-in-out; }
  .am-bounce-in { animation: am-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .am-pop-smooth { animation: am-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .am-celebration-pop { 
    animation: am-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .am-celebration-fade-out {
    animation: am-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .am-pulse {
    animation: am-pulse 0.6s ease-in-out infinite alternate;
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
  number: string;
  correct: boolean;
}

function buildSummary(
  studentName: string,
  targetNumber: string,
  _targetName: string,
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
      return `${studentName} successfully matched the number '${targetNumber}' on the very first attempt.`;
    }
    return `${studentName} successfully matched the number '${targetNumber}' on Attempt ${totalAttempts}.`;
  }

  // 🔥 Correct after wrong attempts
  const correctAttemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully matching the number '${targetNumber}' on Attempt ${correctAttemptNumber}.`;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MathNumbersMatchingBase({
  number,
  numberName,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  const targetNumber = number;
  const targetName = numberName;

  const options = useMemo(() => {
    const distractors = MATH_DISTRACTORS_MAP[targetNumber] || ["1", "2"];
    const picks = [targetNumber, distractors[0], distractors[1]];

    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, [targetNumber]);

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

  // ═══════════════════════════════════════════════════════════
  //  🔥 INTRO AUDIO — har number ki apni (Math Numbers Matching)
  //  Fire-and-forget: board is interactive while audio plays
  // ═══════════════════════════════════════════════════════════
  const playNumberAudio = useCallback((): Promise<void> => {
    const audioUrl = MATH_MATCHING_INTRO[targetNumber];
    if (!audioUrl) {
      console.warn(
        `[MathMatching] No intro audio found for number: ${targetNumber}`,
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
      MATH_MATCHING_INTRO[targetNumber],
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

  // ═══════════════════════════════════════════════════════════
  //  MOUNT — preload + play intro audio (NO LOCK)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    attemptNumRef.current = 0;
    sessionCompletedRef.current = false;

    const init = async () => {
      await Promise.all([loadFont(), preloadAllAudio()]);
      // 🔓 No lock — board is interactive from frame 1
      // 🔥 Intro audio plays after short delay so layout settles
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

            const studentName = sessionData.student.studentName || "Student";

            const summary = buildSummary(
              studentName,
              targetNumber,
              targetName || "",
              options,
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
              console.warn("[MathMatching] Save partial failed:", err);
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
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [lineEnd, setLineEnd] = useState<Point | null>(null);
  const [isLineLocked, setIsLineLocked] = useState(false);
  const [showLine, setShowLine] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const numberRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getNumberCenter = useCallback((): Point | null => {
    const board = boardRef.current;
    const el = numberRef.current;
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }, []);

  const getOptionCenter = useCallback((key: string): Point | null => {
    const board = boardRef.current;
    const el = optionRefs.current[key];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
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
    if (!selected || status !== "idle" || isAudioPlaying) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (selected === targetNumber) {
      attemptNumRef.current += 1;
      attemptsRef.current.push({
        attemptNumber: attemptNumRef.current,
        number: selected,
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
              const studentName = sessionData.student.studentName || "Student";

              const summary = buildSummary(
                studentName,
                targetNumber,
                targetName || "",
                MATH_DISTRACTORS_MAP[targetNumber] || [],
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
                console.warn("[MathMatching] Save completed failed:", err);
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
        number: selected,
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
  }, [selected, targetNumber, status, isAudioPlaying]);

  useEffect(() => {
    if (selected) {
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

    let hit: string | null = null;
    for (const [key, el] of Object.entries(optionRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const padding = 15;
      if (
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding
      ) {
        hit = key;
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

    let hit: string | null = null;
    for (const [key, el] of Object.entries(optionRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const padding = 15;
      if (
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding
      ) {
        hit = key;
        break;
      }
    }

    if (hit) {
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
      ? "am-celebration-pop"
      : celebrationPhase === "fade"
        ? "am-celebration-fade-out"
        : "";

  // 🔓 Only block on correct/wrong (for line-draw freeze during result animation)
  const isGameLocked = status === "correct" || status === "wrong";

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
            className="am-pop-in flex h-full w-full items-center justify-center"
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

        {/* ─── RIGHT: Number options (LTR) ──────────────── */}
        <div
          className="flex h-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3"
          style={{ order: 2 }}
        >
          {options.map((opt) => {
            const isSelected = selected === opt;
            const isCorrect = status === "correct" && isSelected;
            const isWrong = status === "wrong" && isSelected;
            const isDisabled = isGameLocked;
            const isHovered =
              hoveredOption === opt && isDragging && !isLineLocked && status === "idle";

            let state: "idle" | "selected" | "correct" | "wrong" = "idle";
            if (isCorrect) state = "correct";
            else if (isWrong) state = "wrong";
            else if (isSelected) state = "selected";

            const colors = getCardColors(subject, state);
            const letterColor = colors.text;
            const shadowColor = colors.shadow;
            const bgClass = colors.bg;

            const optionFontSize = "min(14vh, 115px)";

            return (
              <button
                key={opt}
                ref={(el) => {
                  optionRefs.current[opt] = el;
                }}
                type="button"
                disabled={isDisabled}
                aria-label={`Number ${opt}`}
                className={`am-pop-in clay relative flex h-[22vh] max-h-[185px] w-[22vh] max-w-[185px] items-center justify-center rounded-3xl border-[5px] border-white transition-all duration-150 sm:h-[24vh] sm:max-h-[205px] sm:w-[24vh] sm:max-w-[205px] ${
                  isWrong ? "am-shake" : ""
                } ${isHovered ? "am-pop-smooth" : ""} ${
                  isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  ["--clay-shadow" as string]: shadowColor,
                  borderWidth: "5px",
                  padding: "4px",
                  background: bgClass,
                  overflow: "visible",
                }}
              >
                <div
                  className="pointer-events-none flex h-full w-full items-center justify-center"
                  style={{ overflow: "visible" }}
                >
                  <span
                    style={{
                      fontFamily:
                        "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                      fontWeight: 400,
                      fontSize: optionFontSize,
                      color: letterColor,
                      textShadow: "0 2px 6px rgba(0,0,0,0.06)",
                      lineHeight: 1.4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      letterSpacing: "0.02em",
                      transition: "color 0.15s ease",
                      overflow: "visible",
                    }}
                  >
                    {opt}
                  </span>
                </div>

                {isWrong && (
                  <span className="am-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-red-600 text-white shadow-lg sm:h-12 sm:w-12">
                    <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />
                  </span>
                )}

                {isCorrect && (
                  <span className="am-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-green-600 text-white shadow-lg sm:h-12 sm:w-12">
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
            className="am-pulse"
          />
        </div>
      )}
    </div>
  );
}

export default MathNumbersMatchingBase;