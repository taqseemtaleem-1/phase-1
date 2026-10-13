// src/components/games/English/Alphabet-Matching Capital2Small/AlphabetMatchingBase.tsx
// ✅ Progress tracking: gameData + summary save
// 🔥 Summary: Simple attempt-wise format
//    - "Ahmed successfully matched uppercase 'A' to lowercase 'a' on the very first attempt."
//    - "Ahmed made 2 wrong attempts before successfully matching uppercase 'A' to lowercase 'a' on Attempt 3."
//    - "Ahmed did not complete the lesson."

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio Imports
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

const ALL_LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");

const DESCENDERS = new Set(["g", "j", "p", "q", "y"]);

// ─── 🔥 FIXED DISTRACTORS MAP ──────────────────────────────────
const DISTRACTORS_MAP: Record<string, string[]> = {
  a: ["e", "c"],
  b: ["d", "p"],
  c: ["e", "o"],
  d: ["c", "e"],
  e: ["o", "u"],
  f: ["p", "t"],
  g: ["b", "d"],
  h: ["n", "t"],
  i: ["l", "j"],
  j: ["i", "l"],
  k: ["j", "l"],
  l: ["i", "t"],
  m: ["l", "n"],
  n: ["m", "h"],
  o: ["u", "e"],
  p: ["b", "q"],
  q: ["p", "d"],
  r: ["f", "j"],
  s: ["r", "t"],
  t: ["f", "k"],
  u: ["y", "v"],
  v: ["u", "y"],
  w: ["v", "x"],
  x: ["s", "e"],
  y: ["v", "u"],
  z: ["w", "c"],
};

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
  @keyframes am-icon-hover {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-6px) scale(1.05); }
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
  .am-icon-hover {
    animation: am-icon-hover 2s ease-in-out infinite;
  }
  .am-pulse {
    animation: am-pulse 0.6s ease-in-out infinite alternate;
  }

  .am-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .am-lock-overlay-enter {
    animation: am-overlay-in 0.15s ease-out both;
  }
  @keyframes am-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// 🔥 FONT CSS - Andika font
const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ─── 🔥 COLORS FOR IDLE CARDS ────────────────────────────────
function getCardColors(subject: string, state: "idle" | "selected" | "correct" | "wrong") {
  const themes: Record<string, any> = {
    english: {
      idle: {
        bg: "bg-[#4D82F6] hover:bg-[#3a6fd4]",
        shadow: "oklch(0.35 0.18 260 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "bg-[oklch(0.45_0.18_260)]",
        shadow: "oklch(0.25 0.18 260 / 0.85)",
        text: "#FFFFFF",
      },
      correct: {
        bg: "bg-green-500",
        shadow: "oklch(0.48 0.19 148 / 0.85)",
        text: "#FFFFFF",
      },
      wrong: {
        bg: "bg-red-500",
        shadow: "oklch(0.45 0.22 27 / 0.85)",
        text: "#FFFFFF",
      },
    },
    math: {
      idle: {
        bg: "bg-[#2E8B57] hover:bg-[#267a4b]",
        shadow: "oklch(0.32 0.18 148 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "bg-[oklch(0.45_0.18_148)]",
        shadow: "oklch(0.22 0.18 148 / 0.85)",
        text: "#FFFFFF",
      },
      correct: {
        bg: "bg-green-500",
        shadow: "oklch(0.48 0.19 148 / 0.85)",
        text: "#FFFFFF",
      },
      wrong: {
        bg: "bg-red-500",
        shadow: "oklch(0.45 0.22 27 / 0.85)",
        text: "#FFFFFF",
      },
    },
    urdu: {
      idle: {
        bg: "bg-[#CC6B2C] hover:bg-[#b85e27]",
        shadow: "oklch(0.4 0.18 40 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "bg-[oklch(0.5_0.18_40)]",
        shadow: "oklch(0.3 0.18 40 / 0.85)",
        text: "#FFFFFF",
      },
      correct: {
        bg: "bg-green-500",
        shadow: "oklch(0.48 0.19 148 / 0.85)",
        text: "#FFFFFF",
      },
      wrong: {
        bg: "bg-red-500",
        shadow: "oklch(0.45 0.22 27 / 0.85)",
        text: "#FFFFFF",
      },
    },
  };
  return themes[subject]?.[state] || themes.english.idle;
}

// ─── 🔥 CAPITAL LETTER COLOR BASED ON SUBJECT ──────────────
function getCapitalColor(subject: string): string {
  const colors: Record<string, string> = {
    english: "#4D82F6",
    math: "#2E8B57",
    urdu: "#CC6B2C",
  };
  return colors[subject] || "#4D82F6";
}

interface Props {
  letter: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Point = { x: number; y: number };

// 🔥 Audio Modules - All A-Z .wav files
const AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Alphabet-Matching Capital2Small Audios/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^([A-Z])\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const LETTER_AUDIO = buildAudioMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER — Simple attempt-wise format
//  - First try: "Ahmed successfully matched uppercase 'A' to
//                lowercase 'a' on the very first attempt."
//  - Wrong(s):  "Ahmed made 2 wrong attempts before successfully
//                matching uppercase 'A' to lowercase 'a' on Attempt 3."
//  - Partial:   "Ahmed did not complete the lesson."
// ═══════════════════════════════════════════════════════════════

interface AttemptRecord {
  attemptNumber: number;
  letter: string;
  correct: boolean;
}

function buildSummary(
  studentName: string,
  capital: string,
  small: string,
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
      return `${studentName} successfully matched uppercase '${capital}' to lowercase '${small}' on the very first attempt.`;
    }
    return `${studentName} successfully matched uppercase '${capital}' to lowercase '${small}' on Attempt ${totalAttempts}.`;
  }

  // 🔥 Correct after wrong attempts
  const correctAttemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully matching uppercase '${capital}' to lowercase '${small}' on Attempt ${correctAttemptNumber}.`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function AlphabetMatchingBase({ letter, subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const capital = letter.toUpperCase();
  const correct = letter.toLowerCase();

  // ─── 🔥 FIXED OPTIONS ──────────────────────────────────────────
  // Same letters every time (from DISTRACTORS_MAP), only positions shuffle
  const options = useMemo(() => {
    const distractors = DISTRACTORS_MAP[correct] || ["x", "y"];
    const picks = [correct, distractors[0], distractors[1]];

    // Shuffle positions (Fisher-Yates)
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, [correct]);

  // ─── 🔥 AUDIO REFS ────────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // ─── 🔥 4-SECOND LOCK STATE ──────────────────────────────────
  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── 🔥 PROGRESS TRACKING REFS ────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const attemptsRef = useRef<AttemptRecord[]>([]);
  const currentAttemptNumberRef = useRef<number>(0);

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

  // ─── 🔥 STOP ALL AUDIO - SIRF LOCAL ──────────────────────────
  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      stopAudio(audio);
    });
    audioRefs.current = [];
    setIsAudioPlaying(false);
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
    (src: string): Promise<void> => {
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
            resolve();
          };

          audio.onerror = () => {
            console.warn(`⚠️ Audio error: ${src}`);
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            resolve();
          };

          audio.play().catch((err) => {
            console.warn(`⚠️ Audio play failed: ${src}`, err);
            setIsAudioPlaying(false);
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            resolve();
          });
        } catch (err) {
          console.warn(`⚠️ Audio creation failed: ${src}`, err);
          setIsAudioPlaying(false);
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  // ─── Play Result Audio ────────────────────────────────────────
  const playResultAudio = useCallback(
    (isCorrectResult: boolean): Promise<void> => {
      const srcs = isCorrectResult ? [correctMP3, correctWAV] : [wrongMP3, wrongWAV];
      return playMultipleAudios(srcs);
    },
    [playMultipleAudios],
  );

  // ─── Play Letter Audio (Intro) ────────────────────────────────
  const playLetterAudio = useCallback((): Promise<void> => {
    const src = LETTER_AUDIO[capital];
    if (!src) return Promise.resolve();
    return playAudio(src);
  }, [capital, playAudio]);

  // ─── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [stopAllAudio]);

  // ─── Preload Audio ────────────────────────────────────────────
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

  // ─── Preload ALL Audio ──────────────────────────────────────
  const preloadAllAudio = useCallback(async () => {
    const letterAudioUrls = LETTER_AUDIO[capital] ? [LETTER_AUDIO[capital]] : [];
    const resultAudioUrls = [correctMP3, correctWAV, wrongMP3, wrongWAV];
    const allAudio = [...letterAudioUrls, ...resultAudioUrls];

    const promises = allAudio.map(async (url) => {
      try {
        await preloadAudio(url);
      } catch {
        // Silently fail
      }
    });

    await Promise.all(promises);
  }, [capital, preloadAudio]);

  // ─── Load Font ────────────────────────────────────────────────
  const loadFont = useCallback(async () => {
    try {
      const font = new FontFace("Andika", `url(${andikaFontUrl})`);
      await font.load();
      document.fonts.add(font);
    } catch (err) {
      console.warn("Andika font load failed:", err);
    }
  }, []);

  // ─── 🔥 Initialize + Save partial on unmount ────────────────
  useEffect(() => {
    // Reset progress refs
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    currentAttemptNumberRef.current = 0;

    const init = async () => {
      await Promise.all([loadFont(), preloadAllAudio()]);

      setIsLocked(true);
      setShowLockOverlay(true);

      lockTimerRef.current = setTimeout(() => {
        setIsLocked(false);
        setShowLockOverlay(false);
      }, 4000);

      setTimeout(() => {
        playLetterAudio();
      }, 300);
    };
    init();

    return () => {
      stopAllAudio();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

      // 🔥 Save partial progress on unmount
      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000
        );

        // Only save if kid spent time (>= 1 second)
        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;

            const studentName = session.student.studentName || "Student";
            const attempts = attemptsRef.current;

            const summary = buildSummary(
              studentName,
              capital,
              correct,
              options,
              attempts,
              false,
            );

            const wrongLetters = attempts
              .filter((a) => !a.correct)
              .map((a) => a.letter);

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
                capitalLetter: capital,
                smallLetter: correct,
                options,
                totalAttempts: attempts.length,
                wrongAttempts: wrongLetters.length,
                wrongLetters,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[AlphabetMatching] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cleanup timers ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      stopAllAudio();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [stopAllAudio]);

  // ─── ✅ Navigate to Level Popup ─────────────────────────────
  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    navigate({
      to: "/levels",
      search: {
        subject,
        level,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── Celebration State ────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  // ─── Game State ───────────────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // ─── Drag state ───────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [lineEnd, setLineEnd] = useState<Point | null>(null);
  const [isLineLocked, setIsLineLocked] = useState(false);
  const [showLine, setShowLine] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const capitalRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Get Centers ──────────────────────────────────────────────
  const getCapitalCenter = useCallback((): Point | null => {
    const board = boardRef.current;
    const el = capitalRef.current;
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

  // ─── Board Size ──────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBoardSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ─── 🔥 Check - Correct/Wrong handling with progress save ────
  useEffect(() => {
    if (!selected || status !== "idle" || isAudioPlaying) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (selected === correct) {
      // 🔥 Correct — record attempt
      currentAttemptNumberRef.current += 1;
      const attemptNumber = currentAttemptNumberRef.current;

      attemptsRef.current.push({
        attemptNumber,
        letter: selected,
        correct: true,
      });

      setStatus("correct");
      setShowCelebration(true);
      setCelebrationPhase("pop");

      playResultAudio(true).then(async () => {
        setCelebrationPhase("fade");
        setTimeout(async () => {
          setShowCelebration(false);

          // 🔥 Save completed progress
          if (!completedRef.current && !progressSavedRef.current) {
            completedRef.current = true;
            progressSavedRef.current = true;

            const elapsed = Math.floor(
              (Date.now() - sessionStartTimeRef.current) / 1000
            );

            const session = getSession();
            if (session?.student) {
              const studentName = session.student.studentName || "Student";
              const attempts = attemptsRef.current;

              const summary = buildSummary(
                studentName,
                capital,
                correct,
                options,
                attempts,
                true,
              );

              const wrongLetters = attempts
                .filter((a) => !a.correct)
                .map((a) => a.letter);

              try {
                await saveProgress({
                  studentId: session.student.studentId,
                  deviceToken: session.student.token,
                  subject,
                  level,
                  lessonId,
                  status: "completed",
                  timeSpentSec: elapsed,
                  summary,
                  gameData: {
                    capitalLetter: capital,
                    smallLetter: correct,
                    options,
                    totalAttempts: attempts.length,
                    wrongAttempts: wrongLetters.length,
                    wrongLetters,
                    completed: true,
                  },
                });
                console.log("✅ [AlphabetMatching] Progress saved (completed)");
              } catch (err) {
                console.warn("[AlphabetMatching] Save completed failed:", err);
              }
            }
          }

          // Navigate
          goToLevelPopup();
        }, 500);
      });
    } else {
      // 🔥 Wrong — record attempt
      currentAttemptNumberRef.current += 1;
      const attemptNumber = currentAttemptNumberRef.current;

      attemptsRef.current.push({
        attemptNumber,
        letter: selected,
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
  }, [selected, correct, status, isAudioPlaying, playResultAudio, goToLevelPopup, capital, subject, level, lessonId, options]);

  // ─── Update line end when selected changes ──────────────────
  useEffect(() => {
    if (selected) {
      const end = getOptionCenter(selected);
      setLineEnd(end);
      setIsLineLocked(true);
      setShowLine(true);
      setHoveredOption(null);
    }
  }, [selected, getOptionCenter]);

  // ─── Pointer Handlers ────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked || isAudioPlaying) return;
    if (status === "correct" || status === "wrong") return;
    if (isLineLocked) return;

    const capEl = capitalRef.current;
    if (!capEl) return;

    const r = capEl.getBoundingClientRect();
    const boxPadding = 10;
    const isInBox =
      e.clientX >= r.left + boxPadding &&
      e.clientX <= r.right - boxPadding &&
      e.clientY >= r.top + boxPadding &&
      e.clientY <= r.bottom - boxPadding;

    if (!isInBox) {
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxDistance = Math.min(r.width, r.height) * 0.35;

      if (distance > maxDistance) {
        return;
      }
    }

    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setShowLine(true);

    const start = getCapitalCenter();
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
    if (isLocked || isAudioPlaying) return;
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
    if (isLocked || isAudioPlaying) return;
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

  // ─── Line render ─────────────────────────────────────────────
  const startPoint = lineStart || getCapitalCenter();
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

  const isGameLocked = isLocked || isAudioPlaying || status === "correct" || status === "wrong";

  const capitalColor = getCapitalColor(subject);

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

      {showLockOverlay && <div className="am-lock-overlay am-lock-overlay-enter" />}

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
        className={`flex h-full w-full items-center justify-center gap-4 sm:gap-8 ${isGameLocked ? "pointer-events-none" : ""}`}
      >
        {/* LEFT: Capital Letter */}
        <div
          ref={capitalRef}
          className={`flex h-full flex-1 items-center justify-center ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <div className="am-pop-in flex h-[90%] w-full max-h-[92%] items-center justify-center">
            <span
              style={{
                fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: "min(50vh, 450px)",
                color: capitalColor,
                textShadow: "0 4px 12px rgba(0,0,0,0.08)",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                textAlign: "center",
              }}
            >
              {capital}
            </span>
          </div>
        </div>

        {/* SPACE */}
        <div className="w-4 sm:w-8 flex-shrink-0" />

        {/* RIGHT: Small Letters Tower */}
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3">
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

            const isDescender = DESCENDERS.has(opt);
            const letterShift = isDescender
              ? { transform: "translateY(-15%)" }
              : { transform: "translateY(-8%)" };

            return (
              <button
                key={opt}
                ref={(el) => {
                  optionRefs.current[opt] = el;
                }}
                type="button"
                disabled={isDisabled}
                aria-label={`Small letter ${opt}`}
                className={`am-pop-in clay relative flex h-[22vh] max-h-[185px] w-[22vh] max-w-[185px] items-center justify-center rounded-3xl border-[5px] border-white transition-all duration-150 sm:h-[24vh] sm:max-h-[205px] sm:w-[24vh] sm:max-w-[205px] ${bgClass} ${isWrong ? "am-shake" : ""} ${isHovered ? "am-pop-smooth" : ""} ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                style={{
                  ["--clay-shadow" as string]: shadowColor,
                  borderWidth: "5px",
                  padding: "2px",
                }}
              >
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-1.5 sm:p-2">
                  <span
                    style={{
                      fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                      fontWeight: 400,
                      fontSize: "min(22vh, 180px)",
                      color: letterColor,
                      textShadow: "0 2px 6px rgba(0,0,0,0.06)",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      letterSpacing: "0.02em",
                      transition: "color 0.15s ease, transform 0.15s ease",
                      ...letterShift,
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

      {/* LINE */}
      {shouldShowLine && startPoint && endPoint && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
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

export default AlphabetMatchingBase;