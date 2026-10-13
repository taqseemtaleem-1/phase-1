// src/components/games/English/Alphabet-FindLetter/AlphabetFindLetterBase.tsx
// ✅ Progress tracking: 2 sessions — separate summaries for Uppercase & Lowercase
// 🔥 FIXED: Single source of truth for options — no duplicate effects
// 🔥 NEW: Fixed distractors per letter (only positions shuffle, letters same)

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
  @keyframes aff-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes aff-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes aff-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes aff-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes aff-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes aff-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes aff-wrong-flash {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95); }
    40%  { transform: scale(1.05); }
    60%  { transform: scale(0.98); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  .aff-pop-in { animation: aff-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .aff-shake { animation: aff-shake 0.45s ease-in-out; }
  .aff-bounce-in { animation: aff-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .aff-celebration-pop { 
    animation: aff-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .aff-celebration-fade-out {
    animation: aff-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .aff-reset-bounce {
    animation: aff-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .aff-wrong-flash {
    animation: aff-wrong-flash 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }

  .aff-solid-wrong {
    background-image: none !important;
    filter: none !important;
    backdrop-filter: none !important;
    mix-blend-mode: normal !important;
  }
  .aff-solid-wrong::before,
  .aff-solid-wrong::after {
    opacity: 0 !important;
    background: none !important;
    display: none !important;
  }

  .aff-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .aff-lock-overlay-enter {
    animation: aff-overlay-in 0.15s ease-out both;
  }
  @keyframes aff-overlay-in {
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

type SessionType = 1 | 2;

interface AttemptEntry {
  attemptNumber: number;
  letter: string;
}

// ─── 🔥 AUDIO MODULES ──────────────────────────────────────────
const AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Alphabet-CapitalSmallPick Audios/Capital Letters/*.wav",
  { eager: true, query: "?url", import: "default" },
);

const SMALL_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Alphabet-CapitalSmallPick Audios/Small Letters/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildCapitalAudioMap(): Record<string, string> {
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

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALL_SMALLS = "abcdefghijklmnopqrstuvwxyz".split("");

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED DISTRACTORS MAP
// ═══════════════════════════════════════════════════════════════

const CAPITAL_DISTRACTORS: Record<string, string[]> = {
  A: ["E", "R", "P"],
  B: ["D", "P", "R"],
  C: ["G", "O", "Q"],
  D: ["B", "O", "P"],
  E: ["F", "L", "H"],
  F: ["E", "P", "T"],
  G: ["C", "O", "Q"],
  H: ["N", "M", "K"],
  I: ["J", "L", "T"],
  J: ["I", "L", "T"],
  K: ["H", "X", "R"],
  L: ["I", "J", "T"],
  M: ["N", "W", "H"],
  N: ["M", "H", "V"],
  O: ["Q", "C", "G"],
  P: ["B", "R", "D"],
  Q: ["O", "G", "C"],
  R: ["P", "B", "K"],
  S: ["Z", "C", "O"],
  T: ["I", "L", "F"],
  U: ["V", "W", "J"],
  V: ["U", "W", "Y"],
  W: ["V", "M", "U"],
  X: ["K", "Y", "V"],
  Y: ["V", "X", "U"],
  Z: ["S", "N", "X"],
};

const SMALL_DISTRACTORS: Record<string, string[]> = {
  a: ["e", "o", "c"],
  b: ["d", "p", "q"],
  c: ["e", "o", "a"],
  d: ["b", "p", "q"],
  e: ["a", "c", "o"],
  f: ["t", "l", "j"],
  g: ["q", "p", "y"],
  h: ["n", "b", "k"],
  i: ["l", "j", "t"],
  j: ["i", "g", "y"],
  k: ["h", "x", "r"],
  l: ["i", "t", "f"],
  m: ["n", "h", "w"],
  n: ["m", "h", "r"],
  o: ["a", "e", "c"],
  p: ["b", "d", "q"],
  q: ["g", "p", "b"],
  r: ["n", "k", "v"],
  s: ["z", "c", "e"],
  t: ["l", "i", "f"],
  u: ["v", "w", "n"],
  v: ["u", "w", "y"],
  w: ["v", "m", "u"],
  x: ["k", "y", "v"],
  y: ["g", "j", "v"],
  z: ["s", "c", "n"],
};

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED OPTION GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateOptions(
  sessionNum: SessionType,
  capital: string,
  small: string,
): { picks: string[]; wrongPicks: string[] } {
  const correct = sessionNum === 1 ? capital : small;

  const distractorMap =
    sessionNum === 1 ? CAPITAL_DISTRACTORS : SMALL_DISTRACTORS;

  const fixedDistractors =
    distractorMap[sessionNum === 1 ? correct.toUpperCase() : correct.toLowerCase()] || [];

  if (fixedDistractors.length < 3) {
    console.warn(`[FindLetter] Missing distractors for: ${correct}`);
    const allLetters = sessionNum === 1 ? ALL_LETTERS : ALL_SMALLS;
    const others = allLetters.filter((l) => l !== correct);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const wrongPicks = shuffled.slice(0, 3);
    const picks = [correct, ...wrongPicks].sort(() => Math.random() - 0.5);
    return { picks, wrongPicks: [...wrongPicks].sort() };
  }

  const wrongPicks = [...fixedDistractors];

  const picks = [correct, ...wrongPicks];
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
//  🔥 SUMMARY BUILDER — SEPARATE UPPERCASE & LOWERCASE
//  - Partial:   "Student did not complete the lesson."
//  - First try: "Student successfully selected Uppercase (B)
//                correctly on the very first attempt."
//  - Wrong(s):  "Student made 2 wrong attempts before successfully
//                selecting Uppercase (B) correctly on Attempt 3."
// ═══════════════════════════════════════════════════════════════

interface SessionAttempts {
  session1WrongLetters: AttemptEntry[];
  session2WrongLetters: AttemptEntry[];
  session1Options: string[];
  session2Options: string[];
  session1Completed: boolean;
  session2Completed: boolean;
}

function buildUppercaseSummary(
  studentName: string,
  capital: string,
  wrongAttempts: AttemptEntry[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const wrongCount = wrongAttempts.length;

  if (wrongCount === 0) {
    return `${studentName} successfully selected Uppercase (${capital}) correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully selecting Uppercase (${capital}) correctly on Attempt ${attemptNumber}.`;
}

function buildLowercaseSummary(
  studentName: string,
  small: string,
  wrongAttempts: AttemptEntry[],
  completed: boolean,
  wasAttempted: boolean,
): string {
  if (!wasAttempted) {
    return `Not attempted.`;
  }

  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const wrongCount = wrongAttempts.length;

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
  data: SessionAttempts,
): string {
  const uppercaseLine = buildUppercaseSummary(
    studentName,
    capital,
    data.session1WrongLetters,
    data.session1Completed,
  );

  const smallWasAttempted =
    data.session2Completed || data.session2WrongLetters.length > 0;

  const lowercaseLine = buildLowercaseSummary(
    studentName,
    small,
    data.session2WrongLetters,
    data.session2Completed,
    smallWasAttempted,
  );

  return `Uppercase:\n${uppercaseLine}\n\nLowercase:\n${lowercaseLine}`;
}

export function AlphabetFindLetterBase({ letter, subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const capital = letter.toUpperCase();
  const small = letter.toLowerCase();
  const colors = getSubjectColor(subject);

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

  const session1WrongRef = useRef<AttemptEntry[]>([]);
  const session2WrongRef = useRef<AttemptEntry[]>([]);
  const session1AttemptCounterRef = useRef<number>(0);
  const session2AttemptCounterRef = useRef<number>(0);
  const session1CompletedRef = useRef<boolean>(false);
  const session2CompletedRef = useRef<boolean>(false);

  // 🔥 Options tracking — SINGLE source of truth
  const optionsBySessionRef = useRef<{ 1: string[]; 2: string[] }>({
    1: [],
    2: [],
  });

  // 🔥 Session 1 options — SYNCHRONOUS via initializer
  const [options, setOptions] = useState<string[]>(() => {
    const { picks, wrongPicks } = generateOptions(1, capital, small);
    optionsBySessionRef.current[1] = wrongPicks;
    console.log("[FindLetter] INIT S1 picks:", picks);
    console.log("[FindLetter] INIT S1 wrong options saved:", wrongPicks);
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
    return session === 1 ? capital : small;
  }, [session, capital, small]);

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[session]) {
      return;
    }

    let path = "";
    if (session === 1) {
      path = CAPITAL_AUDIO[capital];
    } else {
      path = SMALL_AUDIO[small.toUpperCase()];
    }

    if (!path) return;

    introPlayedRef.current[session] = true;
    playAudio(path);
  }, [session, capital, small, playAudio]);

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
  //  🔥 SESSION 2 OPTIONS — only ONE effect for this
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (session === 2 && optionsBySessionRef.current[2].length === 0) {
      const { picks, wrongPicks } = generateOptions(2, capital, small);
      setOptions(picks);
      optionsBySessionRef.current[2] = wrongPicks;
      console.log("[FindLetter] S2 picks:", picks);
      console.log("[FindLetter] S2 wrong options saved:", wrongPicks);
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
                    session1WrongLetters: session1WrongRef.current,
                    session2WrongLetters: session2WrongRef.current,
                    session1Options: optionsBySessionRef.current[1],
                    session2Options: optionsBySessionRef.current[2],
                    session1Completed: session1CompletedRef.current,
                    session2Completed: session2CompletedRef.current,
                  };

                  const summary = buildFullSummary(
                    studentName,
                    capital,
                    small,
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
                      capitalLetter: capital,
                      smallLetter: small,
                      session1WrongLetters: session1WrongRef.current,
                      session2WrongLetters: session2WrongRef.current,
                      session1Options: optionsBySessionRef.current[1],
                      session2Options: optionsBySessionRef.current[2],
                      session1Completed: true,
                      session2Completed: true,
                      completed: true,
                    },
                  }).catch((err) => {
                    console.warn("[FindLetter] Save failed:", err);
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
          session1AttemptCounterRef.current += 1;
          session1WrongRef.current.push({
            attemptNumber: session1AttemptCounterRef.current,
            letter: choice,
          });
        } else {
          session2AttemptCounterRef.current += 1;
          session2WrongRef.current.push({
            attemptNumber: session2AttemptCounterRef.current,
            letter: choice,
          });
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
    session1WrongRef.current = [];
    session2WrongRef.current = [];
    session1AttemptCounterRef.current = 0;
    session2AttemptCounterRef.current = 0;
    session1CompletedRef.current = false;
    session2CompletedRef.current = false;

    const { picks, wrongPicks } = generateOptions(1, capital, small);
    setOptions(picks);
    optionsBySessionRef.current = { 1: wrongPicks, 2: [] };

    introPlayedRef.current = { 1: false, 2: false };

    startSessionLock();

    setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 400);
  }, [stopAllAudio, startSessionLock, capital, small]);

  useEffect(() => {
    isMountedRef.current = true;
    hasTransitionedRef.current = false;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    session1WrongRef.current = [];
    session2WrongRef.current = [];
    session1AttemptCounterRef.current = 0;
    session2AttemptCounterRef.current = 0;
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
              session1WrongLetters: session1WrongRef.current,
              session2WrongLetters: session2WrongRef.current,
              session1Options: optionsBySessionRef.current[1],
              session2Options: optionsBySessionRef.current[2],
              session1Completed: session1CompletedRef.current,
              session2Completed: session2CompletedRef.current,
            };

            const summary = buildFullSummary(
              studentName,
              capital,
              small,
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
                capitalLetter: capital,
                smallLetter: small,
                session1WrongLetters: session1WrongRef.current,
                session2WrongLetters: session2WrongRef.current,
                session1Options: optionsBySessionRef.current[1],
                session2Options: optionsBySessionRef.current[2],
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

    let bgColor = colors.idleBg;
    let extraSolidClass = "";
    let shadowColor = colors.shadow;
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let inlineBgColor = "";

    if (isWrongState) {
      inlineBgColor = "#FF0000";
      extraSolidClass = "aff-solid-wrong";
      shadowColor = "oklch(0.45 0.22 27 / 0.85)";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isCorrectState) {
      inlineBgColor = "#16A34A";
      shadowColor = "oklch(0.48 0.19 148 / 0.85)";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={4} />;
    } else if (isSelected) {
      bgColor = colors.selectedBg;
      shadowColor = colors.shadow;
    }

    const isDescender = session === 2 && DESCENDERS.has(opt.toLowerCase());
    const descenderStyle = isDescender ? { transform: "translateY(-15%)" } : {};

    const bounceClass = resetKey > 0 ? "aff-reset-bounce" : "aff-pop-in";
    const shakeClass = isWrongState ? "aff-shake aff-wrong-flash" : "";

    const isDisabled = isLocked || isGameComplete || isCorrect || isWrong;

    return (
      <button
        key={`${opt}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(opt)}
        disabled={isDisabled}
        className={`${bounceClass} ${shakeClass} ${extraSolidClass} clay relative flex items-center justify-center rounded-3xl border-4 border-white transition-all ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "160px",
          height: "160px",
          backgroundColor: inlineBgColor || bgColor,
        }}
      >
        <div className="pointer-events-none flex h-[85%] w-[85%] items-center justify-center">
          <span
            style={{
              fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "130px",
              color: textColor,
              textShadow: "0 4px 8px rgba(0,0,0,0.10)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              ...descenderStyle,
            }}
          >
            {opt}
          </span>
        </div>

        {showIcon && IconComponent && (
          <span
            className={`aff-bounce-in absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-10 sm:w-10 ${isWrongState ? "bg-red-600" : "bg-green-600"} text-white`}
          >
            {IconComponent}
          </span>
        )}
      </button>
    );
  };

  const isGameLocked = isLocked || isGameComplete || isCorrect || isWrong;

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="aff-lock-overlay aff-lock-overlay-enter" />}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${celebrationPhase === "pop" ? "aff-celebration-pop" : celebrationPhase === "fade" ? "aff-celebration-fade-out" : ""}`}
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
        className={`flex flex-wrap items-center justify-center gap-1 max-w-4xl w-full ${isGameLocked ? "pointer-events-none" : ""}`}
      >
        {options.map((opt, index) => renderCard(opt, index))}
      </div>
    </div>
  );
}

export default AlphabetFindLetterBase;