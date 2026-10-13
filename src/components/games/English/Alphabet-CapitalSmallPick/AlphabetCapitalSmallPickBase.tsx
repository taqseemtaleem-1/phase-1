// src/components/games/English/Alphabet-CapitalSmallPick/AlphabetCapitalSmallPickBase.tsx
// ✅ Progress tracking: 2 sessions — separate summaries for Uppercase & Lowercase
// 🔥 Summary format: "Uppercase:\n{...}\n\nLowercase:\n{...}"

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
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

// 🔥 Descenders list - sirf small letters ke liye
const DESCENDERS = new Set(["g", "j", "p", "q", "y"]);

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
const SUBJECT_COLORS: Record<string, { idleBg: string; selectedBg: string; shadow: string }> = {
  english: {
    idleBg: "#4D82F6",
    selectedBg: "#3a6fd4",
    shadow: "oklch(0.35 0.18 260 / 0.85)",
  },
  math: {
    idleBg: "#2E8B57",
    selectedBg: "#267a4b",
    shadow: "oklch(0.32 0.18 148 / 0.85)",
  },
  urdu: {
    idleBg: "#CC6B2C",
    selectedBg: "#b85e27",
    shadow: "oklch(0.4 0.18 40 / 0.85)",
  },
};

function getSubjectColor(subject: string = "english") {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.english;
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

const GAME_CSS = `
  @keyframes acsp-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes acsp-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes acsp-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes acsp-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes acsp-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes acsp-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  .acsp-pop-in { animation: acsp-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .acsp-shake { animation: acsp-shake 0.45s ease-in-out; }
  .acsp-bounce-in { animation: acsp-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .acsp-celebration-pop { 
    animation: acsp-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .acsp-celebration-fade-out {
    animation: acsp-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .acsp-reset-bounce {
    animation: acsp-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }

  .acsp-solid-wrong {
    background-image: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    mix-blend-mode: normal !important;
  }
  .acsp-solid-wrong::before,
  .acsp-solid-wrong::after {
    opacity: 0 !important;
    background: none !important;
    display: none !important;
  }

  .acsp-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .acsp-lock-overlay-enter {
    animation: acsp-overlay-in 0.15s ease-out both;
  }
  @keyframes acsp-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

interface Props {
  letter: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Choice = "capital" | "small";
type SessionType = 1 | 2;

// ─── 🔥 AUDIO MODULES ──────────────────────────────────────────
const CAPITAL_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Alphabet-CapitalSmallPick Audios/Capital Letters/*.wav",
  { eager: true, query: "?url", import: "default" },
);

const SMALL_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Alphabet-CapitalSmallPick Audios/Small Letters/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildCapitalAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(CAPITAL_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^([A-Z])\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

function buildSmallAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(SMALL_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^Small ([A-Z])\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const CAPITAL_AUDIO = buildCapitalAudioMap();
const SMALL_AUDIO = buildSmallAudioMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER — SEPARATE UPPERCASE & LOWERCASE
// ═══════════════════════════════════════════════════════════════

interface SessionAttempts {
  session1Capital: number;   // Uppercase session mein kitne wrong attempts
  session2Small: number;     // Lowercase session mein kitne wrong attempts
  session1Completed: boolean;
  session2Completed: boolean;
}

function buildUppercaseSummary(
  studentName: string,
  capital: string,
  small: string,
  wrongCount: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  if (wrongCount === 0) {
    return `${studentName} successfully selected Uppercase (${capital}) correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting Uppercase (${capital}) correctly on Attempt ${attemptNumber}.`;
}

function buildLowercaseSummary(
  studentName: string,
  capital: string,
  small: string,
  wrongCount: number,
  completed: boolean,
  wasAttempted: boolean,
): string {
  if (!wasAttempted) {
    return `Not attempted.`;
  }

  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  if (wrongCount === 0) {
    return `${studentName} successfully selected Lowercase (${small}) correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting Lowercase (${small}) correctly on Attempt ${attemptNumber}.`;
}

function buildFullSummary(
  studentName: string,
  capital: string,
  small: string,
  attempts: SessionAttempts,
  overallCompleted: boolean,
): string {
  // 🔥 Separate summaries
  const uppercaseLine = buildUppercaseSummary(
    studentName,
    capital,
    small,
    attempts.session1Capital,
    attempts.session1Completed,
  );

  const smallWasAttempted =
    attempts.session2Completed || attempts.session2Small > 0;

  const lowercaseLine = buildLowercaseSummary(
    studentName,
    capital,
    small,
    attempts.session2Small,
    attempts.session2Completed,
    smallWasAttempted,
  );

  return `Uppercase:\n${uppercaseLine}\n\nLowercase:\n${lowercaseLine}`;
}

export function AlphabetCapitalSmallPickBase({ letter, subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const capital = letter.toUpperCase();
  const small = letter.toLowerCase();
  const colors = getSubjectColor(subject);

  // ─── Simple States ──────────────────────────────────────────
  const [session, setSession] = useState<SessionType>(1);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");
  const [resetKey, setResetKey] = useState(0);

  const hasTransitionedRef = useRef(false);

  // ─── 🔥 3-SECOND LOCK STATE ──────────────────────────────────
  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LOCK_DURATION = 3000;

  // ─── 🔥 AUDIO SYSTEM ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const introPlayedRef = useRef<Record<SessionType, boolean>>({ 1: false, 2: false });

  // ─── 🔥 PROGRESS TRACKING REFS ────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const session1WrongCountRef = useRef<number>(0);
  const session2WrongCountRef = useRef<number>(0);
  const session1CompletedRef = useRef<boolean>(false);
  const session2CompletedRef = useRef<boolean>(false);

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

  // ─── 🔥 STOP ALL AUDIO ────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      stopAudio(audio);
    });
    audioRefs.current = [];
    setIsAudioPlaying(false);
  }, [stopAudio]);

  // ─── 🔥 PLAY MULTIPLE AUDIOS ─────────────────────────────────
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

  // ─── 🔥 PLAY SINGLE AUDIO ────────────────────────────────────
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

  // ─── Get Correct Choice ────────────────────────────────────
  const getCorrectChoice = useCallback((): Choice => {
    return session === 1 ? "capital" : "small";
  }, [session]);

  // ─── Play Intro Audio ──────────────────────────────────────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[session]) {
      return;
    }

    let path = "";
    if (session === 1) {
      path = CAPITAL_AUDIO[capital];
    } else {
      path = SMALL_AUDIO[capital];
    }

    if (!path) {
      console.warn(
        `⚠️ No audio found for ${session === 1 ? "capital" : "small"} letter: ${capital}`,
      );
      return;
    }

    introPlayedRef.current[session] = true;
    playAudio(path, undefined, true);
  }, [session, capital, playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  useEffect(() => {
    playIntroAudioRef.current = playIntroAudio;
  }, [playIntroAudio]);

  // ─── Play Correct Audio ────────────────────────────────────
  const playCorrectAudio = useCallback(
    (onComplete: () => void) => {
      stopAllAudio();

      playMultipleAudios([correctMP3, correctWAV]).then(() => {
        setTimeout(() => {
          onComplete();
        }, 300);
      });
    },
    [playMultipleAudios, stopAllAudio],
  );

  // ─── Play Wrong Audio ──────────────────────────────────────
  const playWrongAudio = useCallback(
    (onComplete: () => void) => {
      stopAllAudio();

      playMultipleAudios([wrongMP3, wrongWAV]).then(() => {
        onComplete();
      });
    },
    [playMultipleAudios, stopAllAudio],
  );

  // ─── ✅ Navigate to Level Popup ─────────────────────────────
  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (correctAudioTimerRef.current) {
      clearTimeout(correctAudioTimerRef.current);
    }
    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── 🔥 Start Session Lock (3 sec) ──────────────────────────
  const startSessionLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, LOCK_DURATION);
  }, []);

  // ─── 🔥 Handle Card Click ─────────────────────────────────
  const handleCardClick = useCallback(
    (choice: Choice) => {
      if (isLocked) return;
      if (isGameComplete || isCorrect || isWrong) return;
      if (selected === choice) return;

      const correctChoice = getCorrectChoice();
      setSelected(choice);

      if (choice === correctChoice) {
        // ✅ CORRECT
        if (session === 1) {
          session1CompletedRef.current = true;
        } else {
          session2CompletedRef.current = true;
        }

        setIsCorrect(true);
        setShowCelebration(true);
        setCelebrationPhase("pop");

        playCorrectAudio(() => {
          setCelebrationPhase("fade");
          celebrationTimerRef.current = setTimeout(() => {
            setShowCelebration(false);
            setCelebrationPhase("idle");

            if (session === 2) {
              // Both sessions complete → save + go to level popup
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

                  const attempts: SessionAttempts = {
                    session1Capital: session1WrongCountRef.current,
                    session2Small: session2WrongCountRef.current,
                    session1Completed: session1CompletedRef.current,
                    session2Completed: session2CompletedRef.current,
                  };

                  const summary = buildFullSummary(
                    studentName,
                    capital,
                    small,
                    attempts,
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
                      capitalLetter: capital,
                      smallLetter: small,
                      session1WrongCount: session1WrongCountRef.current,
                      session2WrongCount: session2WrongCountRef.current,
                      session1Completed: true,
                      session2Completed: true,
                      completed: true,
                    },
                  }).catch((err) => {
                    console.warn("[CapitalSmallPick] Save completed failed:", err);
                  });
                }
              }

              correctAudioTimerRef.current = setTimeout(() => {
                goToLevelPopup();
              }, 500);
            } else {
              // 🔥 Move to session 2
              if (!hasTransitionedRef.current) {
                hasTransitionedRef.current = true;
                setSelected(null);
                setIsCorrect(false);
                setSession(2);
                setResetKey((prev) => prev + 1);

                startSessionLock();

                setTimeout(() => {
                  if (isMountedRef.current) {
                    playIntroAudioRef.current();
                  }
                }, 400);
              }
            }
          }, 500);
        });
      } else {
        // ❌ WRONG
        if (session === 1) {
          session1WrongCountRef.current += 1;
        } else {
          session2WrongCountRef.current += 1;
        }

        setIsWrong(true);

        playWrongAudio(() => {
          setIsWrong(false);
          setSelected(null);
        });
      }
    },
    [
      isLocked,
      isGameComplete,
      isCorrect,
      isWrong,
      selected,
      getCorrectChoice,
      session,
      playCorrectAudio,
      playWrongAudio,
      goToLevelPopup,
      startSessionLock,
      capital,
      small,
      subject,
      level,
      lessonId,
    ],
  );

  // ─── Handle Restart ────────────────────────────────────────
  const handleRestart = useCallback(() => {
    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

    hasTransitionedRef.current = false;
    setSession(1);
    setSelected(null);
    setIsWrong(false);
    setIsCorrect(false);
    setIsGameComplete(false);
    setShowCelebration(false);
    setCelebrationPhase("idle");
    setResetKey((prev) => prev + 1);

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    session1WrongCountRef.current = 0;
    session2WrongCountRef.current = 0;
    session1CompletedRef.current = false;
    session2CompletedRef.current = false;

    introPlayedRef.current = { 1: false, 2: false };

    startSessionLock();

    setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 400);
  }, [stopAllAudio, startSessionLock]);

  // ─── 🔥 Initialize + Save partial on unmount ──────────────
  useEffect(() => {
    isMountedRef.current = true;
    hasTransitionedRef.current = false;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    session1WrongCountRef.current = 0;
    session2WrongCountRef.current = 0;
    session1CompletedRef.current = false;
    session2CompletedRef.current = false;

    startSessionLock();

    const introTimer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
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

            const attempts: SessionAttempts = {
              session1Capital: session1WrongCountRef.current,
              session2Small: session2WrongCountRef.current,
              session1Completed: session1CompletedRef.current,
              session2Completed: session2CompletedRef.current,
            };

            const summary = buildFullSummary(
              studentName,
              capital,
              small,
              attempts,
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
                capitalLetter: capital,
                smallLetter: small,
                session1WrongCount: session1WrongCountRef.current,
                session2WrongCount: session2WrongCountRef.current,
                session1Completed: session1CompletedRef.current,
                session2Completed: session2CompletedRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[CapitalSmallPick] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render Card ─────────────────────────────────────────────
  const renderCard = (choice: Choice, glyph: string) => {
    const isSelected = selected === choice;
    const isWrongState = isWrong && isSelected;
    const isCorrectState = isCorrect && isSelected;

    let bgColor = colors.idleBg;
    let extraSolidClass = "";
    let shadowColor = colors.shadow;
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let inlineBgColor = "";

    if (isWrongState) {
      inlineBgColor = "#FF0000";
      extraSolidClass = "acsp-solid-wrong";
      shadowColor = "oklch(0.45 0.22 27 / 0.85)";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isCorrectState) {
      inlineBgColor = "#16A34A";
      shadowColor = "oklch(0.48 0.19 148 / 0.85)";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isSelected) {
      bgColor = colors.selectedBg;
      shadowColor = colors.shadow;
      textColor = "#FFFFFF";
    }

    const isDescender = choice === "small" && DESCENDERS.has(glyph.toLowerCase());
    const descenderStyle = isDescender ? { transform: "translateY(-12%)" } : {};

    const bounceClass = resetKey > 0 ? "acsp-reset-bounce" : "acsp-pop-in";
    const shakeClass = isWrongState ? "acsp-shake" : "";

    const isDisabled = isLocked || isGameComplete || isCorrect || isWrong;

    return (
      <button
        key={`${choice}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(choice)}
        disabled={isDisabled}
        className={`${bounceClass} ${shakeClass} ${extraSolidClass} clay relative flex items-center justify-center rounded-3xl border-4 border-white transition-all ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "300px",
          height: "300px",
          flexShrink: 0,
          backgroundColor: inlineBgColor || bgColor,
        }}
      >
        <div className="pointer-events-none flex h-[85%] w-[85%] items-center justify-center">
          <span
            style={{
              fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "260px",
              color: textColor,
              textShadow: "0 4px 8px rgba(0,0,0,0.10)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease, transform 0.2s ease",
              ...descenderStyle,
            }}
          >
            {glyph}
          </span>
        </div>

        {showIcon && IconComponent && (
          <span
            className={`acsp-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-12 sm:w-12 ${isWrongState ? "bg-red-600" : "bg-green-600"} text-white`}
          >
            {IconComponent}
          </span>
        )}
      </button>
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  const isGameLocked = isLocked || isGameComplete || isCorrect || isWrong;

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="acsp-lock-overlay acsp-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationPhase === "pop" ? "acsp-celebration-pop" : celebrationPhase === "fade" ? "acsp-celebration-fade-out" : ""}`}
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
        className={`flex items-center justify-center gap-6 ${isGameLocked ? "pointer-events-none" : ""}`}
      >
        {renderCard("capital", capital)}
        {renderCard("small", small)}
      </div>
    </div>
  );
}

export default AlphabetCapitalSmallPickBase;