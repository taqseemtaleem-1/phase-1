// src/components/games/Urdu/Huroof-e-Tahajji-Find Letter/HuroofETahajjiFindLetterBase.tsx
// ✅ Urdu version of AlphabetFindLetterBase
// 🔥 2 Sessions: session 1 → letter1 find karo, session 2 → letter2 find karo
// 🎨 RTL layout: 4 options grid (mirrored for Urdu)
// 📝 Urdu font: Noto Nastaliq Urdu
// 🎵 Session-start: Urdu letter audio (Letter (N).wav) | Correct/Wrong: standard sounds
// 🔥 Fixed distractors per letter, only positions shuffle
// 🔥 Progress tracking: separate summaries for Letter 1 & Letter 2

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
//  🎨 COLORS — Orange gradient
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
//  🎬 GAME CSS (same as AlphabetFindLetterBase)
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes affl-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes affl-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes affl-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes affl-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes affl-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes affl-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes affl-wrong-flash {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95); }
    40%  { transform: scale(1.05); }
    60%  { transform: scale(0.98); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes affl-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .affl-pop-in { animation: affl-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .affl-shake { animation: affl-shake 0.45s ease-in-out; }
  .affl-bounce-in { animation: affl-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .affl-celebration-pop { 
    animation: affl-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .affl-celebration-fade-out {
    animation: affl-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .affl-reset-bounce {
    animation: affl-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .affl-wrong-flash {
    animation: affl-wrong-flash 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }

  .affl-solid-wrong {
    background-image: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    mix-blend-mode: normal !important;
  }
  .affl-solid-wrong::before,
  .affl-solid-wrong::after {
    opacity: 0 !important;
    background: none !important;
    display: none !important;
  }

  .affl-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .affl-lock-overlay-enter {
    animation: affl-overlay-in 0.15s ease-out both;
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

type SessionType = 1 | 2;

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED DISTRACTORS MAP (from HuroofETahajjiMatchingBase)
//  Har letter ke liye 3 visually-similar distractors
//  Letters hamesha same rahenge, sirf position shuffle hogi
// ═══════════════════════════════════════════════════════════════

const URDU_DISTRACTORS_MAP: Record<string, string[]> = {
  "ا": ["آ", "ل", "م"],
  "آ": ["ا", "ل", "م"],
  "ب": ["پ", "ت", "ن"],
  "پ": ["ب", "ت", "ن"],
  "ت": ["ٹ", "ب", "ث"],
  "ٹ": ["ت", "ث", "ب"],
  "ث": ["ٹ", "ت", "ن"],
  "ج": ["چ", "ح", "خ"],
  "چ": ["ج", "ح", "خ"],
  "ح": ["خ", "ج", "چ"],
  "خ": ["ح", "ج", "چ"],
  "د": ["ڈ", "ذ", "ر"],
  "ڈ": ["د", "ذ", "ر"],
  "ذ": ["ڈ", "ز", "ر"],
  "ر": ["ڑ", "ز", "د"],
  "ڑ": ["ر", "ز", "د"],
  "ز": ["ژ", "ر", "ذ"],
  "ژ": ["ز", "ر", "ذ"],
  "س": ["ش", "ص", "ض"],
  "ش": ["س", "ص", "ض"],
  "ص": ["ض", "س", "ش"],
  "ض": ["ص", "ط", "ظ"],
  "ط": ["ظ", "ص", "ض"],
  "ظ": ["ط", "ص", "ض"],
  "ع": ["غ", "ح", "خ"],
  "غ": ["ع", "ح", "خ"],
  "ف": ["ق", "و", "ن"],
  "ق": ["ف", "و", "ن"],
  "ک": ["گ", "ل", "ن"],
  "گ": ["ک", "ل", "ن"],
  "ل": ["م", "ا", "ن"],
  "م": ["ل", "ن", "و"],
  "ن": ["ں", "م", "ب"],
  "ں": ["ن", "م", "ب"],
  "و": ["ہ", "ھ", "م"],
  "ہ": ["ھ", "و", "م"],
  "ھ": ["ہ", "و", "م"],
  "ء": ["ہ", "ع", "ھ"],
  "ی": ["ے", "ن", "ں"],
  "ے": ["ی", "ن", "ں"],
};

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED OPTION GENERATOR
//  Correct + 3 FIXED distractors → only shuffle positions
// ═══════════════════════════════════════════════════════════════

function generateOptions(targetLetter: string): { picks: string[] } {
  const fixedDistractors = URDU_DISTRACTORS_MAP[targetLetter] || ["ل", "م", "ن"];

  // ✅ Fixed distractors — same every time
  const wrongPicks = [...fixedDistractors].slice(0, 3);

  // ✅ Only positions shuffle (Fisher-Yates)
  const picks = [targetLetter, ...wrongPicks];
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }

  return { picks };
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — SIMPLE COUNT-BASED (English pattern)
// ═══════════════════════════════════════════════════════════════

interface SessionAttempts {
  session1WrongCount: number;
  session2WrongCount: number;
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
  data: SessionAttempts,
): string {
  const firstLine = buildLetter1Summary(
    studentName,
    letter1,
    letter1Name,
    data.session1WrongCount,
    data.session1Completed,
  );

  const secondWasAttempted =
    data.session2Completed || data.session2WrongCount > 0;

  const secondLine = buildLetter2Summary(
    studentName,
    letter2,
    letter2Name,
    data.session2WrongCount,
    data.session2Completed,
    secondWasAttempted,
  );

  return `First Letter:\n${firstLine}\n\nSecond Letter:\n${secondLine}`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiFindLetterBase({
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
  const [selected, setSelected] = useState<string | null>(null);
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

  // Current target letter for this session (reactively)
  const currentTargetLetter = session === 1 ? letter1 : letter2;

  // 🔥 Session 1 options — SYNCHRONOUS via initializer
  const [options, setOptions] = useState<string[]>(() => {
    const { picks } = generateOptions(letter1);
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
    } catch {
      // Silently fail
    }
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

  const getCorrectChoice = useCallback((): string => {
    return session === 1 ? letter1 : letter2;
  }, [session, letter1, letter2]);

  // ─── 🔥 Play Letter Audio (Urdu letter audio for target) ────
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[session]) return;

    const letterNum = LETTER_TO_NUMBER[currentTargetLetter];
    if (!letterNum) {
      console.warn(`[UrduFindLetter] No audio number for letter: ${currentTargetLetter}`);
      return;
    }
    const audioUrl = LETTER_AUDIO[letterNum];
    if (!audioUrl) {
      console.warn(`[UrduFindLetter] No audio file for #${letterNum} (${currentTargetLetter})`);
      return;
    }

    introPlayedRef.current[session] = true;
    playAudio(audioUrl);
  }, [session, currentTargetLetter, playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  useEffect(() => {
    playIntroAudioRef.current = playIntroAudio;
  }, [playIntroAudio]);

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

  const playWrongAudio = useCallback(
    (onComplete: () => void) => {
      stopAllAudio();

      playMultipleAudios([wrongMP3, wrongWAV]).then(() => {
        onComplete();
      });
    },
    [playMultipleAudios, stopAllAudio],
  );

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

  const startSessionLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, LOCK_DURATION);
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 SESSION 2 OPTIONS — regenerate when session changes
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (session === 2) {
      const { picks } = generateOptions(letter2);
      setOptions(picks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ═══════════════════════════════════════════════════════════
  //  Handle Card Click
  // ═══════════════════════════════════════════════════════════

  const handleCardClick = useCallback(
    (choice: string) => {
      if (isLocked) return;
      if (isGameComplete || isCorrect || isWrong) return;
      if (selected === choice) return;

      const correctChoice = getCorrectChoice();
      setSelected(choice);

      if (choice === correctChoice) {
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
                    session1WrongCount: session1WrongCountRef.current,
                    session2WrongCount: session2WrongCountRef.current,
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
                    console.warn("[UrduFindLetter] Save failed:", err);
                  });
                }
              }

              correctAudioTimerRef.current = setTimeout(() => {
                goToLevelPopup();
              }, 500);
            } else {
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
              session1WrongCount: session1WrongCountRef.current,
              session2WrongCount: session2WrongCountRef.current,
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
            }).catch(() => {});
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderCard = (opt: string, index: number) => {
    const isSelected = selected === opt;
    const isWrongState = isWrong && isSelected;
    const isCorrectState = isCorrect && isSelected;

    let extraSolidClass = "";
    let shadowColor = "oklch(0.4 0.18 40 / 0.85)";
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let inlineStyle: React.CSSProperties = { ...CARD_IDLE_STYLE };

    if (isWrongState) {
      inlineStyle = {
        background: "#FF0000",
        ["--clay-shadow" as string]: "oklch(0.45 0.22 27 / 0.85)",
      };
      extraSolidClass = "affl-solid-wrong";
      shadowColor = "oklch(0.45 0.22 27 / 0.85)";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isCorrectState) {
      inlineStyle = {
        background: "#16A34A",
        ["--clay-shadow" as string]: "oklch(0.48 0.19 148 / 0.85)",
      };
      shadowColor = "oklch(0.48 0.19 148 / 0.85)";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isSelected) {
      inlineStyle = {
        background: "linear-gradient(145deg, oklch(0.7 0.18 55), oklch(0.55 0.21 40))",
        ["--clay-shadow" as string]: "oklch(0.35 0.18 40 / 0.85)",
      };
      shadowColor = "oklch(0.35 0.18 40 / 0.85)";
      textColor = "#FFFFFF";
    }

    // 🔥 Urdu letter sizing rules
    const isShortLetter = SHORT_LETTERS.includes(opt);
    const isLaam = opt === LAAM_LETTER;
    const isToeZoe = TOE_ZOE_LETTERS.includes(opt);
    const isAlifMadda = opt === ALIF_MADDA;

    // 🔥 Smaller sizes for these 4-option cards
    const fontSize = isShortLetter
      ? "min(20vh, 150px)"
      : isLaam
        ? "min(10vh, 75px)"
        : isToeZoe
          ? "min(18vh, 135px)"
          : isAlifMadda
            ? "min(16vh, 125px)"
            : "min(13vh, 100px)";

    const upNudge = UP_NUDGE_MARGIN[opt] ?? "0";

    const bounceClass = resetKey > 0 ? "affl-reset-bounce" : "affl-pop-in";
    const shakeClass = isWrongState ? "affl-shake affl-wrong-flash" : "";

    const isDisabled = isLocked || isGameComplete || isCorrect || isWrong;

    return (
      <button
        key={`${opt}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(opt)}
        disabled={isDisabled}
        className={`${bounceClass} ${shakeClass} ${extraSolidClass} clay relative flex items-center justify-center rounded-3xl border-4 border-white transition-all ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        style={{
          ...inlineStyle,
          width: "180px",
          height: "180px",
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
              marginBottom: upNudge,
              overflow: "visible",
            }}
          >
            {opt}
          </span>
        </div>

        {showIcon && IconComponent && (
          <span
            className={`affl-bounce-in absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-11 sm:w-11 ${isWrongState ? "bg-red-600" : "bg-green-600"} text-white`}
          >
            {IconComponent}
          </span>
        )}
      </button>
    );
  };

  const isGameLocked = isLocked || isGameComplete || isCorrect || isWrong;

  return (
    <div
      dir="rtl"
      className="relative flex h-full w-full select-none flex-col items-center justify-center p-4"
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="affl-lock-overlay affl-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationPhase === "pop" ? "affl-celebration-pop" : celebrationPhase === "fade" ? "affl-celebration-fade-out" : ""}`}
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
        className={`flex flex-wrap items-center justify-center gap-3 max-w-4xl w-full ${isGameLocked ? "pointer-events-none" : ""}`}
      >
        {options.map((opt, index) => renderCard(opt, index))}
      </div>
    </div>
  );
}

export default HuroofETahajjiFindLetterBase;