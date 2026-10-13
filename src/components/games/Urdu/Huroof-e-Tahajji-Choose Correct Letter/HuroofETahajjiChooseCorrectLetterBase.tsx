// src/components/games/Urdu/Huroof-e-Tahajji-Choose Correct Letter/HuroofETahajjiChooseCorrectLetterBase.tsx
// ✅ Urdu version of AlphabetCapitalSmallPickBase
// 🔥 2 Sessions: session 1 → letter1 choose karo, session 2 → letter2 choose karo
// 🎨 RTL layout: Letter 1 card RIGHT par, Letter 2 card LEFT par (Urdu reading order)
// 📝 Urdu font: Noto Nastaliq Urdu
// 🎵 Session-start: Urdu letter audio (Letter (N).wav) | Correct/Wrong: standard correct/wrong sounds
// 🔥 Progress tracking: separate summaries for Letter 1 & Letter 2
// 🎨 Card colors: orange gradient (same as HuroofETahajjiMatchingBase)

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

// 🔥 SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio — Correct / Wrong (standard, shared across all games)
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Urdu Font
const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 URDU LETTER AUDIOS — glob-import all Letter (N).wav files
//  From: src/assets/Huroof-e-Tahajji-Choose Correct Letter audios
// ═══════════════════════════════════════════════════════════════

const LETTER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Huroof-e-Tahajji-Choose Correct Letter audios/Letter (*).wav",
  { eager: true, query: "?url", import: "default" },
);

function buildLetterAudioMap(): Record<number, string> {
  const map: Record<number, string> = {};
  for (const [path, url] of Object.entries(LETTER_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^Letter \((\d+)\)\.wav$/);
    if (match) {
      const num = Number(match[1]);
      if (num >= 1 && num <= 40) {
        map[num] = url;
      }
    }
  }
  return map;
}

const LETTER_AUDIO: Record<number, string> = buildLetterAudioMap();

// 🔥 Letter → audio number mapping (Urdu alphabet order, 1-40)
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
//  🔥 LETTER SIZING RULES (from HuroofETahajjiMatchingBase)
// ═══════════════════════════════════════════════════════════════

// Short/wide letters that look visually small — need bigger font
const SHORT_LETTERS = ["د", "ڈ", "ذ", "ر", "ڑ", "ز", "ژ", "و", "ہ", "ھ"];

// Laam — renders visually very tall/large in Nastaliq, needs smaller font
const LAAM_LETTER = "ل";

// Toe (ط) & Zoe (ظ) — bigger font
const TOE_ZOE_LETTERS = ["ط", "ظ"];

// Alif Madda — tall + wide glyph, needs special handling
const ALIF_MADDA = "آ";

// Per-letter upward nudge using marginBottom (percent of card width)
const UP_NUDGE_MARGIN: Record<string, string> = {
  "ع": "26%", "غ": "26%", "ق": "50%", "و": "52%",
  "ب": "32%", "پ": "52%",
  "ج": "42%", "چ": "42%", "ح": "42%", "خ": "42%",
  "د": "52%", "ڈ": "52%", "ذ": "52%", "ر": "52%", "ڑ": "52%",
  "ز": "52%", "ژ": "52%",
  "س": "42%", "ش": "42%", "ص": "42%", "ض": "42%",
  "ط": "42%", "ظ": "42%",
  "ں": "42%", "ن": "42%",
  "م": "52%",
  "ہ": "42%", "ھ": "42%",
  "ی": "42%", "ے": "42%",
};

// ═══════════════════════════════════════════════════════════════
//  🎨 COLORS — Orange gradient (same as HuroofETahajjiMatchingBase)
// ═══════════════════════════════════════════════════════════════

const CARD_IDLE_STYLE: React.CSSProperties = {
  background: "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))",
  ["--clay-shadow" as string]: "oklch(0.4 0.18 40 / 0.85)",
};

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT CSS
// ═══════════════════════════════════════════════════════════════

const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  🎬 GAME CSS (same as AlphabetCapitalSmallPickBase)
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes hccl-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hccl-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes hccl-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes hccl-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes hccl-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes hccl-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hccl-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .hccl-pop-in { animation: hccl-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .hccl-shake { animation: hccl-shake 0.45s ease-in-out; }
  .hccl-bounce-in { animation: hccl-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .hccl-celebration-pop { 
    animation: hccl-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .hccl-celebration-fade-out {
    animation: hccl-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .hccl-reset-bounce {
    animation: hccl-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }

  .hccl-solid-wrong {
    background-image: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    mix-blend-mode: normal !important;
  }
  .hccl-solid-wrong::before,
  .hccl-solid-wrong::after {
    opacity: 0 !important;
    background: none !important;
    display: none !important;
  }

  .hccl-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .hccl-lock-overlay-enter {
    animation: hccl-overlay-in 0.15s ease-out both;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Choice = "letter1" | "letter2";
type SessionType = 1 | 2;

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — SIMPLE COUNT-BASED (English pattern)
// ═══════════════════════════════════════════════════════════════

interface SessionAttempts {
  session1Letter1: number;
  session2Letter2: number;
  session1Completed: boolean;
  session2Completed: boolean;
}

function buildLetter1Summary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  wrongCount: number,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const letterLabel = letter1Name ? `'${letter1}' (${letter1Name})` : `'${letter1}'`;

  if (wrongCount === 0) {
    return `${studentName} successfully selected the first letter ${letterLabel} correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting the first letter ${letterLabel} correctly on Attempt ${attemptNumber}.`;
}

function buildLetter2Summary(
  studentName: string,
  letter2: string,
  letter2Name: string,
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

  const letterLabel = letter2Name ? `'${letter2}' (${letter2Name})` : `'${letter2}'`;

  if (wrongCount === 0) {
    return `${studentName} successfully selected the second letter ${letterLabel} correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting the second letter ${letterLabel} correctly on Attempt ${attemptNumber}.`;
}

function buildFullSummary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  letter2: string,
  letter2Name: string,
  attempts: SessionAttempts,
): string {
  const firstLine = buildLetter1Summary(
    studentName,
    letter1,
    letter1Name,
    attempts.session1Letter1,
    attempts.session1Completed,
  );

  const secondWasAttempted =
    attempts.session2Completed || attempts.session2Letter2 > 0;

  const secondLine = buildLetter2Summary(
    studentName,
    letter2,
    letter2Name,
    attempts.session2Letter2,
    attempts.session2Completed,
    secondWasAttempted,
  );

  return `First Letter:\n${firstLine}\n\nSecond Letter:\n${secondLine}`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiChooseCorrectLetterBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

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

  // Current target letter for this session
  const targetLetter = session === 1 ? letter1 : letter2;
  const targetName = session === 1 ? letter1Name : letter2Name;

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
    return session === 1 ? "letter1" : "letter2";
  }, [session]);

  // ─── 🔥 Play Letter Audio (Urdu letter audio for target) ────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[session]) return;

    const letterNum = LETTER_TO_NUMBER[targetLetter];
    if (!letterNum) {
      console.warn(`[UrduChooseLetter] No audio number for letter: ${targetLetter}`);
      return;
    }
    const audioUrl = LETTER_AUDIO[letterNum];
    if (!audioUrl) {
      console.warn(`[UrduChooseLetter] No audio file for #${letterNum} (${targetLetter})`);
      return;
    }

    introPlayedRef.current[session] = true;
    playAudio(audioUrl, undefined, true);
  }, [session, targetLetter, playAudio]);

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
                    session1Letter1: session1WrongCountRef.current,
                    session2Letter2: session2WrongCountRef.current,
                    session1Completed: session1CompletedRef.current,
                    session2Completed: session2CompletedRef.current,
                  };

                  const summary = buildFullSummary(
                    studentName,
                    letter1,
                    letter1Name || "",
                    letter2,
                    letter2Name || "",
                    attempts,
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
                      letter1,
                      letter1Name,
                      letter2,
                      letter2Name,
                      session1WrongCount: session1WrongCountRef.current,
                      session2WrongCount: session2WrongCountRef.current,
                      session1Completed: true,
                      session2Completed: true,
                      completed: true,
                    },
                  }).catch((err) => {
                    console.warn("[UrduChooseLetter] Save completed failed:", err);
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
      letter1,
      letter1Name,
      letter2,
      letter2Name,
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
              session1Letter1: session1WrongCountRef.current,
              session2Letter2: session2WrongCountRef.current,
              session1Completed: session1CompletedRef.current,
              session2Completed: session2CompletedRef.current,
            };

            const summary = buildFullSummary(
              studentName,
              letter1,
              letter1Name || "",
              letter2,
              letter2Name || "",
              attempts,
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
                letter1,
                letter1Name,
                letter2,
                letter2Name,
                session1WrongCount: session1WrongCountRef.current,
                session2WrongCount: session2WrongCountRef.current,
                session1Completed: session1CompletedRef.current,
                session2Completed: session2CompletedRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[UrduChooseLetter] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🎨 RENDER CARD (Urdu letter with proper sizing)
  // ═══════════════════════════════════════════════════════════
  const renderCard = (choice: Choice, glyph: string, glyphName?: string) => {
    const isSelected = selected === choice;
    const isWrongState = isWrong && isSelected;
    const isCorrectState = isCorrect && isSelected;

    let extraSolidClass = "";
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let inlineStyle: React.CSSProperties = { ...CARD_IDLE_STYLE };

    if (isWrongState) {
      inlineStyle = {
        background: "#FF0000",
        ["--clay-shadow" as string]: "oklch(0.45 0.22 27 / 0.85)",
      };
      extraSolidClass = "hccl-solid-wrong";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <X className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={5} />;
    } else if (isCorrectState) {
      inlineStyle = {
        background: "#16A34A",
        ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)",
      };
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <Check className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={5} />;
    } else if (isSelected) {
      inlineStyle = {
        background: "linear-gradient(145deg, oklch(0.7 0.18 55), oklch(0.55 0.21 40))",
        ["--clay-shadow" as string]: "oklch(0.35 0.18 40 / 0.85)",
      };
      textColor = "#FFFFFF";
    }

    // 🔥 Urdu letter sizing rules (from HuroofETahajjiMatchingBase)
    const isShortLetter = SHORT_LETTERS.includes(glyph);
    const isLaam = glyph === LAAM_LETTER;
    const isToeZoe = TOE_ZOE_LETTERS.includes(glyph);
    const isAlifMadda = glyph === ALIF_MADDA;

    const fontSize = isShortLetter
      ? "min(28vh, 220px)"
      : isLaam
        ? "min(14vh, 110px)"
        : isToeZoe
          ? "min(26vh, 200px)"
          : isAlifMadda
            ? "min(24vh, 190px)"
            : "min(18vh, 145px)";

    const upNudge = UP_NUDGE_MARGIN[glyph] ?? "0";

    const bounceClass = resetKey > 0 ? "hccl-reset-bounce" : "hccl-pop-in";
    const shakeClass = isWrongState ? "hccl-shake" : "";

    const isDisabled = isLocked || isGameComplete || isCorrect || isWrong;

    return (
      <button
        key={`${choice}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(choice)}
        disabled={isDisabled}
        className={`${bounceClass} ${shakeClass} ${extraSolidClass} clay relative flex items-center justify-center rounded-3xl border-4 border-white transition-all ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        style={{
          ...inlineStyle,
          width: "300px",
          height: "300px",
          flexShrink: 0,
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
                "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: textColor,
              textShadow: "0 2px 8px rgba(0,0,0,0.15)",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease, transform 0.2s ease",
              marginBottom: upNudge,
              overflow: "visible",
            }}
          >
            {glyph}
          </span>
        </div>

        {showIcon && IconComponent && (
          <span
            className={`hccl-bounce-in absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-full border-[4px] border-white shadow-lg sm:h-14 sm:w-14 ${isWrongState ? "bg-red-600" : "bg-green-600"} text-white`}
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
    <div
      dir="rtl"
      className="relative flex h-full w-full select-none flex-col items-center justify-center p-4"
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="hccl-lock-overlay hccl-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationPhase === "pop" ? "hccl-celebration-pop" : celebrationPhase === "fade" ? "hccl-celebration-fade-out" : ""}`}
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

      {/* 🔥 RTL: Letter 1 card RIGHT par, Letter 2 card LEFT par */}
      <div
        className={`flex items-center justify-center gap-6 ${isGameLocked ? "pointer-events-none" : ""}`}
        style={{ flexDirection: "row" }}
      >
        {renderCard("letter1", letter1, letter1Name)}
        {renderCard("letter2", letter2, letter2Name)}
      </div>
    </div>
  );
}

export default HuroofETahajjiChooseCorrectLetterBase;