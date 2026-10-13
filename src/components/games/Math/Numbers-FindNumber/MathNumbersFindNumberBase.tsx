// src/components/games/Math/Numbers-FindNumber/MathNumbersFindNumberBase.tsx
// ✅ Math version of AlphabetFindLetterBase
// 🔢 SINGLE session — ek number find karna hai
// 🔥 1 correct number + 3 FIXED distractors
// 🎨 Green theme (Math subject color)
// 🎵 Lesson start: Number INTRO audio (from Math Find Numbers folder)
// 🎵 Correct/Wrong: standard sounds
// 📝 Summary: Simple "Ahmed successfully found..." pattern
// 🔓 NO LOCK — board interactive from frame 1

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio
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
//  🎵 MATH FIND NUMBERS — INTRO AUDIOS (har number ki apni)
//  Folder: src/assets/Math Assets/Math Find Numbers/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const MATH_FIND_INTRO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Math Find Numbers/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildMathFindIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(MATH_FIND_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const MATH_FIND_INTRO: Record<string, string> = buildMathFindIntroMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 MATH DISTRACTORS MAP
//  Har number ke liye 3 visually-similar distractors
//  Numbers hamesha same rahenge, sirf position shuffle hogi
// ═══════════════════════════════════════════════════════════════

const MATH_DISTRACTORS: Record<string, string[]> = {
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

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED OPTION GENERATOR
//  Correct + 3 FIXED distractors → only shuffle positions
// ═══════════════════════════════════════════════════════════════

function generateOptions(
  target: string,
): { picks: string[]; wrongPicks: string[] } {
  const fixedDistractors = MATH_DISTRACTORS[target] || [];

  // Fallback if distractors missing
  if (fixedDistractors.length < 3) {
    console.warn(`[FindNumber] Missing distractors for: ${target}`);
    const others = ALL_NUMBERS.filter((n) => n !== target);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const wrongPicks = shuffled.slice(0, 3);
    const picks = [target, ...wrongPicks].sort(() => Math.random() - 0.5);
    return { picks, wrongPicks: [...wrongPicks].sort() };
  }

  const wrongPicks = [...fixedDistractors].slice(0, 3);

  // ✅ Only positions shuffle (Fisher-Yates)
  const picks = [target, ...wrongPicks];
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
//  🔥 SUMMARY BUILDER — Simple "successfully" pattern
// ═══════════════════════════════════════════════════════════════

interface AttemptEntry {
  attemptNumber: number;
  number: string;
}

function buildSummary(
  studentName: string,
  target: string,
  attempts: AttemptEntry[],
  _options: string[],
  completed: boolean,
): string {
  // 🔥 Uncompleted — simple
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const wrongCount = attempts.length;
  const totalAttempts = attempts.length + 1;

  // 🔥 First try correct
  if (wrongCount === 0) {
    return `${studentName} successfully found the number '${target}' on the very first attempt.`;
  }

  // 🔥 Correct after wrong attempts
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully finding the number '${target}' on Attempt ${totalAttempts}.`;
}

// ═══════════════════════════════════════════════════════════════
//  🎨 CSS
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

const GAME_CSS = `
  @keyframes mfn-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mfn-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes mfn-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mfn-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes mfn-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes mfn-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mfn-wrong-flash {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95); }
    40%  { transform: scale(1.05); }
    60%  { transform: scale(0.98); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  .mfn-pop-in { animation: mfn-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .mfn-shake { animation: mfn-shake 0.45s ease-in-out; }
  .mfn-bounce-in { animation: mfn-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .mfn-celebration-pop { 
    animation: mfn-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .mfn-celebration-fade-out {
    animation: mfn-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .mfn-reset-bounce {
    animation: mfn-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mfn-wrong-flash {
    animation: mfn-wrong-flash 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }

  .mfn-solid-wrong {
    background-image: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    mix-blend-mode: normal !important;
  }
  .mfn-solid-wrong::before,
  .mfn-solid-wrong::after {
    opacity: 0 !important;
    background: none !important;
    display: none !important;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 PROPS
// ═══════════════════════════════════════════════════════════════

interface Props {
  number: string;
  numberName?: string;
  subject: string;
  level: number;
  lessonId: number;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MathNumbersFindNumberBase({
  number,
  numberName,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const targetNumber = number;

  // ─── Simple States ──────────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");
  const [resetKey, setResetKey] = useState(0);

  // ─── 🔥 AUDIO SYSTEM ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const introPlayedRef = useRef<boolean>(false);

  // ─── 🔥 PROGRESS TRACKING REFS ────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const wrongAttemptsRef = useRef<AttemptEntry[]>([]);
  const attemptCounterRef = useRef<number>(0);
  const completedCheckRef = useRef<boolean>(false);

  // 🔥 Options tracking — SINGLE source of truth
  const optionsRef = useRef<string[]>([]);

  // 🔥 Options — SYNCHRONOUS via initializer
  const [options, setOptions] = useState<string[]>(() => {
    const { picks, wrongPicks } = generateOptions(targetNumber);
    optionsRef.current = wrongPicks;
    console.log("[FindNumber] INIT picks:", picks);
    console.log("[FindNumber] INIT wrong options saved:", wrongPicks);
    return picks;
  });

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

  // ─── 🔥 Play Intro Audio (Math Find Numbers) ──────────────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;

    const path = MATH_FIND_INTRO[targetNumber];
    if (!path) {
      console.warn(`[FindNumber] No intro audio for number: ${targetNumber}`);
      return;
    }

    introPlayedRef.current = true;
    playAudio(path);
  }, [targetNumber, playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  useEffect(() => {
    playIntroAudioRef.current = playIntroAudio;
  }, [playIntroAudio]);

  const playCorrectAudio = useCallback(
    (onComplete: () => void) => {
      stopAllAudio();
      playMultipleAudios([correctMP3, correctWAV]).then(() => {
        setTimeout(() => onComplete(), 300);
      });
    },
    [playMultipleAudios, stopAllAudio],
  );

  const playWrongAudio = useCallback(
    (onComplete: () => void) => {
      stopAllAudio();
      playMultipleAudios([wrongMP3, wrongWAV]).then(() => onComplete());
    },
    [playMultipleAudios, stopAllAudio],
  );

  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (correctAudioTimerRef.current) {
      clearTimeout(correctAudioTimerRef.current);
    }
    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ═══════════════════════════════════════════════════════════
  //  Handle Card Click
  // ═══════════════════════════════════════════════════════════

  const handleCardClick = useCallback(
    (choice: string) => {
      if (isGameComplete || isCorrect || isWrong) return;
      if (selected === choice) return;

      setSelected(choice);

      if (choice === targetNumber) {
        completedCheckRef.current = true;

        setIsCorrect(true);
        setShowCelebration(true);
        setCelebrationPhase("pop");

        playCorrectAudio(() => {
          setCelebrationPhase("fade");
          celebrationTimerRef.current = setTimeout(() => {
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
                const studentName = sessionData.student.studentName || "Student";

                const summary = buildSummary(
                  studentName,
                  targetNumber,
                  wrongAttemptsRef.current,
                  optionsRef.current,
                  true,
                );

                console.log("[FindNumber] Final summary:", summary);

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
                    targetNumber,
                    numberName: numberName || "",
                    wrongNumbers: wrongAttemptsRef.current,
                    options: optionsRef.current,
                    completed: true,
                  },
                }).catch((err) => {
                  console.warn("[FindNumber] Save failed:", err);
                });
              }
            }

            correctAudioTimerRef.current = setTimeout(() => {
              goToLevelPopup();
            }, 500);
          }, 500);
        });
      } else {
        attemptCounterRef.current += 1;
        wrongAttemptsRef.current.push({
          attemptNumber: attemptCounterRef.current,
          number: choice,
        });

        setIsWrong(true);

        playWrongAudio(() => {
          setIsWrong(false);
          setSelected(null);
        });
      }
    },
    [
      isGameComplete,
      isCorrect,
      isWrong,
      selected,
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

  // ─── Mount Effect ──────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    wrongAttemptsRef.current = [];
    attemptCounterRef.current = 0;
    completedCheckRef.current = false;

    // 🔓 No lock — board interactive from frame 1
    const introTimer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopAllAudio();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (correctAudioTimerRef.current) clearTimeout(correctAudioTimerRef.current);

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
              wrongAttemptsRef.current,
              optionsRef.current,
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
                wrongNumbers: wrongAttemptsRef.current,
                options: optionsRef.current,
                completed: false,
              },
            }).catch(() => {});
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render Card ───────────────────────────────────────────
  const renderCard = (opt: string, index: number) => {
    const isSelected = selected === opt;
    const isWrongState = isWrong && isSelected;
    const isCorrectState = isCorrect && isSelected;

    // 🔥 Math green theme colors
    const idleBg = "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))";
    const selectedBg = "linear-gradient(145deg, oklch(0.7 0.18 148), oklch(0.55 0.21 148))";
    const shadowColor = "oklch(0.4 0.18 148 / 0.85)";

    let bgStyle: React.CSSProperties = { background: idleBg };
    let extraSolidClass = "";
    let currentShadowColor = shadowColor;
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;

    if (isWrongState) {
      bgStyle = { background: "#FF0000" };
      extraSolidClass = "mfn-solid-wrong";
      currentShadowColor = "oklch(0.45 0.22 27 / 0.85)";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isCorrectState) {
      bgStyle = { background: "#16A34A" };
      currentShadowColor = "oklch(0.48 0.19 148 / 0.85)";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isSelected) {
      bgStyle = { background: selectedBg };
    }

    const bounceClass = resetKey > 0 ? "mfn-reset-bounce" : "mfn-pop-in";
    const shakeClass = isWrongState ? "mfn-shake mfn-wrong-flash" : "";

    const isDisabled = isGameComplete || isCorrect || isWrong;

    return (
      <button
        key={`${opt}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(opt)}
        disabled={isDisabled}
        className={`${bounceClass} ${shakeClass} ${extraSolidClass} clay relative flex items-center justify-center rounded-3xl border-4 border-white transition-all ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        style={{
          ...bgStyle,
          ["--clay-shadow" as string]: currentShadowColor,
          width: "160px",
          height: "160px",
          overflow: "visible",
        }}
      >
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
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "130px",
              color: textColor,
              textShadow: "0 4px 8px rgba(0,0,0,0.10)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
            }}
          >
            {opt}
          </span>
        </div>

        {showIcon && IconComponent && (
          <span
            className={`mfn-bounce-in absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-10 sm:w-10 ${isWrongState ? "bg-red-600" : "bg-green-600"} text-white`}
          >
            {IconComponent}
          </span>
        )}
      </button>
    );
  };

  // 🔓 Only block on correct/wrong (for celebration freeze)
  const isGameLocked = isGameComplete || isCorrect || isWrong;

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${
            celebrationPhase === "pop"
              ? "mfn-celebration-pop"
              : celebrationPhase === "fade"
                ? "mfn-celebration-fade-out"
                : ""
          }`}
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
        className={`flex flex-wrap items-center justify-center gap-1 max-w-4xl w-full ${
          isGameLocked ? "pointer-events-none" : ""
        }`}
      >
        {options.map((opt, index) => renderCard(opt, index))}
      </div>
    </div>
  );
}

export default MathNumbersFindNumberBase;