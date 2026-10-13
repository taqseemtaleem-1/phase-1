// src/components/games/Urdu/Huroof-e-Tahajji-Drag Correct Letter/HuroofETahajjiDragCorrectLetterBase.tsx
// ✅ Urdu version of AlphabetMakeLetterPairBase — EXACT UI/UX MATCH
// 🔥 2 Sessions: session 1 → letter1 drag karo, session 2 → letter2 drag karo
// 🎨 Box empty when idle, letter shows inside after drop
// 📝 Urdu font: Noto Nastaliq Urdu
// 🎵 Session-start: Urdu letter audio (Letter (N).wav) | Correct/Wrong: standard sounds
// 🔥 Progress tracking: separate summaries for Letter 1 & Letter 2
// 🔥 Colors/borders/sizes: EXACTLY like English MakeLetterPair
// 🔥 Letter sizing: EXACTLY like HuroofETahajjiChooseCorrectLetterBase
// 🔥 UP_NUDGE_MARGIN: FURTHER INCREASED so letters sit higher

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

// 🔥 Urdu Font
const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 URDU LETTER AUDIOS — glob-import all Letter (N).wav files
// ═══════════════════════════════════════════════════════════════

const LETTER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Huroof-e-Tahajji-Drag Correct Letter Audios/Letter (*).wav",
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
//  🔥 LETTER SIZING RULES (from HuroofETahajjiChooseCorrectLetterBase)
// ═══════════════════════════════════════════════════════════════

const SHORT_LETTERS = ["د", "ذ", "ر", "ز", "و", "ہ", "ھ"];
const LAAM_LETTER = "ل";
const TOE_ZOE_LETTERS = ["ط", "ظ"];
const ALIF_MADDA = "آ";
const ALIF_LETTER = "ا";
const DAAL_TA_LETTER = "ڈ";
const RRAY_LETTER = "ڑ";
const ZHAY_LETTER = "ژ";
const SHEEN_LETTER = "ش";
const KAAF_LETTER = "ک";
const GAAF_LETTER = "گ";

// 🔥 Gradient colors — reused for cards
const GRADIENT_BG = "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))";

// 🔥 Per-letter upward nudge — FURTHER INCREASED so letters sit even higher
const UP_NUDGE_MARGIN: Record<string, string> = {
  "ع": "55%", "غ": "55%", "ق": "80%", "و": "85%",
  "ب": "60%", "پ": "85%",
  "ج": "70%", "چ": "70%", "ح": "70%", "خ": "40%",
  "د": "85%", "ڈ": "50%", "ذ": "85%", "ر": "85%", "ڑ": "50%",
  "ز": "85%", "ژ": "50%",
  "س": "70%", "ش": "20%", "ص": "70%", "ض": "70%",
  "ط": "70%", "ظ": "70%",
  "ں": "70%", "ن": "70%",
  "م": "85%",
  "ہ": "70%", "ھ": "70%",
  "ی": "70%", "ے": "70%",
  "ا": "40%", 
  "ل": "0%",    
};

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
    idleBg: "#2E8B57",
    shadow: "oklch(0.32 0.18 148 / 0.85)",
    textColor: "#2E8B57",
  },
  urdu: {
    idleBg: GRADIENT_BG,
    shadow: "oklch(0.4 0.18 40 / 0.85)",
    textColor: "#CC6B2C",
  },
};

function getSubjectColor(subject: string = "urdu") {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.urdu;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 DISTRACTORS MAP
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
//  🎬 GAME CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes mlp-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mlp-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes mlp-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mlp-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes mlp-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }
  @keyframes mlp-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mlp-wrong-flash {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95); }
    40%  { transform: scale(1.05); }
    60%  { transform: scale(0.98); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes mlp-drop-success {
    0%   { transform: scale(0.5); }
    60%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes mlp-target-pulse {
    0%, 100% { 
      border-color: #CC6B2C; 
      box-shadow: 0 0 0 0 rgba(204, 107, 44, 0);
      transform: scale(1);
    }
    50% { 
      border-color: #b85e27; 
      box-shadow: 0 0 20px 4px rgba(204, 107, 44, 0.15);
      transform: scale(1.02);
    }
  }

  .mlp-pop-in { animation: mlp-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .mlp-shake { animation: mlp-shake 0.45s ease-in-out; }
  .mlp-bounce-in { animation: mlp-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .mlp-celebration-pop { 
    animation: mlp-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .mlp-celebration-fade-out {
    animation: mlp-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
  }
  .mlp-reset-bounce {
    animation: mlp-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mlp-wrong-flash {
    animation: mlp-wrong-flash 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mlp-drop-success {
    animation: mlp-drop-success 0.5s cubic-bezier(.34,1.4,.64,1) both;
  }
  .mlp-target-pulse {
    animation: mlp-target-pulse 1.8s ease-in-out infinite;
  }

  .mlp-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .mlp-lock-overlay-enter {
    animation: mlp-overlay-in 0.15s ease-out both;
  }
  @keyframes mlp-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
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

interface BoxState {
  base: string;
  matched: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  matchedSmall: string | null;
  isTarget: boolean;
}

type SessionType = 1 | 2;
type Point = { x: number; y: number };

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
    return `${studentName} successfully dragged the first letter ${letterLabel} into the box correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully dragging the first letter ${letterLabel} into the box correctly on Attempt ${attemptNumber}.`;
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
    return `${studentName} successfully dragged the second letter ${letterLabel} into the box correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully dragging the second letter ${letterLabel} into the box correctly on Attempt ${attemptNumber}.`;
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

export function HuroofETahajjiDragCorrectLetterBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const colors = getSubjectColor(subject);

  // ─── State ──────────────────────────────────────────────────
  const [session, setSession] = useState<SessionType>(1);

  const [box, setBox] = useState<BoxState>({
    base: letter1,
    matched: false,
    isCorrect: false,
    isWrong: false,
    matchedSmall: null,
    isTarget: true,
  });

  const [smallLetters, setSmallLetters] = useState<string[]>([]);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    letter: string | null;
    position: Point | null;
  }>({
    isDragging: false,
    letter: null,
    position: null,
  });

  const [hoveredBox, setHoveredBox] = useState(false);
  const [isWrongLocked, setIsWrongLocked] = useState(false);

  // ─── Audio ──────────────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const introPlayedRef = useRef<Record<SessionType, boolean>>({ 1: false, 2: false });

  // ─── Celebration ──────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  // ─── 🔥 LOCK STATES ──────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INITIAL_LOCK_DURATION = 6000;

  const wrongLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ─── 🔥 PROGRESS TRACKING REFS ──────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const s1WrongCountRef = useRef<number>(0);
  const s1CompletedRef = useRef<boolean>(false);

  const s2WrongCountRef = useRef<number>(0);
  const s2CompletedRef = useRef<boolean>(false);

  const currentTargetLetter = session === 1 ? letter1 : letter2;

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

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[session]) return;

    const letterNum = LETTER_TO_NUMBER[currentTargetLetter];
    if (!letterNum) {
      console.warn(`[UrduDrag] No audio number for letter: ${currentTargetLetter}`);
      return;
    }
    const audioUrl = LETTER_AUDIO[letterNum];
    if (!audioUrl) {
      console.warn(`[UrduDrag] No audio file for #${letterNum} (${currentTargetLetter})`);
      return;
    }

    introPlayedRef.current[session] = true;
    playAudio(audioUrl, undefined, true);
  }, [session, currentTargetLetter, playAudio]);

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
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── Build Small Letters (Fixed distractors, shuffle positions) ────
  const buildSmallLetters = useCallback((targetLetter: string) => {
    const distractors = URDU_DISTRACTORS_MAP[targetLetter] || ["ل", "م", "ن"];
    const picks = [targetLetter, distractors[0], distractors[1], distractors[2]];

    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, []);

  // ─── Initialize Session ────────────────────────────────────
  const initializeSession = useCallback((sessionNum: SessionType) => {
    const baseLetter = sessionNum === 1 ? letter1 : letter2;

    setBox({
      base: baseLetter,
      matched: false,
      isCorrect: false,
      isWrong: false,
      matchedSmall: null,
      isTarget: true,
    });

    const initialSmallLetters = buildSmallLetters(baseLetter);
    setSmallLetters(initialSmallLetters);

    setIsGameComplete(false);
    setShowCelebration(false);
    setCelebrationPhase("idle");
    setResetKey((prev) => prev + 1);
    setHoveredBox(false);
    setIsWrongLocked(false);
    setDragState({ isDragging: false, letter: null, position: null });
    stopAllAudio();
  }, [letter1, letter2, buildSmallLetters, stopAllAudio]);

  const startGameLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, INITIAL_LOCK_DURATION);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    s1WrongCountRef.current = 0;
    s1CompletedRef.current = false;
    s2WrongCountRef.current = 0;
    s2CompletedRef.current = false;

    initializeSession(1);
    startGameLock();

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (wrongLockTimerRef.current) clearTimeout(wrongLockTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      stopAllAudio();

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
              session1Letter1: s1WrongCountRef.current,
              session2Letter2: s2WrongCountRef.current,
              session1Completed: s1CompletedRef.current,
              session2Completed: s2CompletedRef.current,
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
                session1WrongCount: s1WrongCountRef.current,
                session2WrongCount: s2WrongCountRef.current,
                session1Completed: s1CompletedRef.current,
                session2Completed: s2CompletedRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[UrduDrag] Save partial failed:", err);
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
    (e: React.PointerEvent, letter: string) => {
      if (isAudioPlaying) return;
      if (isWrongLocked || isGameComplete || isLocked) return;
      if (dragState.isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        letter: letter,
        position: getPointerPosition(e),
      });
    },
    [
      isAudioPlaying,
      isWrongLocked,
      isGameComplete,
      isLocked,
      dragState.isDragging,
      getPointerPosition,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter) return;

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
    [dragState.isDragging, dragState.letter, box.matched, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter) {
        setDragState({ isDragging: false, letter: null, position: null });
        setHoveredBox(false);
        return;
      }

      const droppedLetter = dragState.letter;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({ isDragging: false, letter: null, position: null });
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

      if (dropped && droppedLetter) {
        const isCorrect = droppedLetter === currentTargetLetter;

        if (isCorrect) {
          if (session === 1) {
            s1CompletedRef.current = true;
          } else {
            s2CompletedRef.current = true;
          }

          setBox((prev) => ({
            ...prev,
            isCorrect: true,
            matched: true,
            matchedSmall: droppedLetter,
            isTarget: false,
          }));

          setSmallLetters((prev) => prev.filter((l) => l !== droppedLetter));

          setShowCelebration(true);
          setCelebrationPhase("pop");

          playCorrectAudio().then(() => {
            setCelebrationPhase("fade");
            celebrationTimerRef.current = setTimeout(async () => {
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
                    const studentName =
                      sessionData.student.studentName || "Student";

                    const attempts: SessionAttempts = {
                      session1Letter1: s1WrongCountRef.current,
                      session2Letter2: s2WrongCountRef.current,
                      session1Completed: s1CompletedRef.current,
                      session2Completed: s2CompletedRef.current,
                    };

                    const summary = buildFullSummary(
                      studentName,
                      letter1,
                      letter1Name || "",
                      letter2,
                      letter2Name || "",
                      attempts,
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
                          letter1,
                          letter1Name,
                          letter2,
                          letter2Name,
                          session1WrongCount: s1WrongCountRef.current,
                          session2WrongCount: s2WrongCountRef.current,
                          session1Completed: true,
                          session2Completed: true,
                          completed: true,
                        },
                      });
                      console.log("✅ [UrduDrag] Progress saved (completed)");
                    } catch (err) {
                      console.warn("[UrduDrag] Save completed failed:", err);
                    }
                  }
                }

                navigateTimerRef.current = setTimeout(() => {
                  goToLevelPopup();
                }, 500);
              } else {
                setSession(2);
                initializeSession(2);
                startGameLock();

                setTimeout(() => {
                  if (isMountedRef.current) {
                    playIntroAudioRef.current();
                  }
                }, 300);
              }
            }, 500);
          });
        } else {
          setIsWrongLocked(true);

          setSmallLetters((prev) => prev.filter((l) => l !== droppedLetter));

          setBox((prev) => ({
            ...prev,
            isWrong: true,
            matchedSmall: droppedLetter,
          }));

          playWrongAudio().then(() => {
            setIsWrongLocked(false);
            setBox((prev) => ({
              ...prev,
              isWrong: false,
              matchedSmall: null,
            }));
            setSmallLetters((prev) => [...prev, droppedLetter]);
          });
        }
      }
    },
    [
      dragState,
      box.matched,
      currentTargetLetter,
      session,
      playCorrectAudio,
      playWrongAudio,
      goToLevelPopup,
      initializeSession,
      startGameLock,
      letter1,
      letter1Name,
      letter2,
      letter2Name,
      subject,
      level,
      lessonId,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  //  🔤 FONT SIZE HELPERS
  // ═══════════════════════════════════════════════════════════

  const getFontSize = (glyph: string): string => {
    const isShortLetter = SHORT_LETTERS.includes(glyph);
    const isLaam = glyph === LAAM_LETTER;
    const isToeZoe = TOE_ZOE_LETTERS.includes(glyph);
    const isAlifMadda = glyph === ALIF_MADDA;
    const isAlif = glyph === ALIF_LETTER;
    const isDaalTa = glyph === DAAL_TA_LETTER;
    const isRray = glyph === RRAY_LETTER;
    const isZhay = glyph === ZHAY_LETTER;
    const isSheen = glyph === SHEEN_LETTER;
    const isKaafGaaf = glyph === KAAF_LETTER || glyph === GAAF_LETTER;

    return isShortLetter
      ? "min(28vh, 220px)"
      : isLaam
        ? "min(14vh, 110px)"
        : isToeZoe
          ? "min(26vh, 200px)"
          : isAlifMadda
            ? "min(24vh, 190px)"
            : isAlif
              ? "min(30vh, 240px)"
              : isDaalTa
                ? "min(22vh, 175px)"
                : isRray
                  ? "min(22vh, 175px)"
                  : isZhay
                    ? "min(22vh, 175px)"
                    : isSheen
                      ? "min(16vh, 130px)"
                      : isKaafGaaf
                        ? "min(14vh, 110px)"
                        : "min(18vh, 145px)";
  };

  // ─── Render Box (empty when idle, shows letter on drop) ────────
  const renderBox = () => {
    const isMatched = box.matched;
    const isCorrect = box.isCorrect;
    const isWrong = box.isWrong;
    const isTarget = box.isTarget && !box.matched;

    let bgColor = "bg-transparent";
    let borderColor = "border-[#CC6B2C]";
    let textColor = "#FFFFFF";
    let showIcon = false;
    let IconComponent = null;
    let iconBgColor = "";
    let iconTextColor = "";
    let shadowColor = "rgba(204, 107, 44, 0.3)";
    let scaleClass = "";

    const showLetter = (isMatched || isWrong) && box.matchedSmall;
    const displayLetter = showLetter ? box.matchedSmall! : "";
    const fontSize = displayLetter ? getFontSize(displayLetter) : "6rem";
    const upNudge = displayLetter ? (UP_NUDGE_MARGIN[displayLetter] ?? "0") : "0";

    if (isMatched && isCorrect) {
      bgColor = "bg-green-500";
      borderColor = "border-green-600";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
      iconBgColor = "bg-green-600";
      iconTextColor = "text-white";
      shadowColor = "oklch(0.48 0.19 148 / 0.85)";
      scaleClass = "mlp-drop-success";
    } else if (isWrong) {
      bgColor = "bg-red-500";
      borderColor = "border-red-600";
      textColor = "#FFFFFF";
      showIcon = true;
      IconComponent = <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={5} />;
      iconBgColor = "bg-red-600";
      iconTextColor = "text-white";
      shadowColor = "oklch(0.45 0.22 27 / 0.85)";
      scaleClass = "mlp-shake mlp-wrong-flash";
    } else if (isTarget) {
      borderColor = "border-[#CC6B2C]";
      shadowColor = "rgba(204, 107, 44, 0.3)";
      scaleClass = "mlp-target-pulse";
    }

    return (
      <div
        data-box
        className={`mlp-pop-in clay-sm relative flex flex-col items-center justify-center rounded-2xl border-4 transition-all duration-200 ${bgColor} ${borderColor} ${scaleClass}`}
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
        {showLetter && displayLetter && (
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
                fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: fontSize,
                color: textColor,
                textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                transition: "color 0.2s ease, font-size 0.2s ease",
                marginBottom: upNudge,
                overflow: "visible",
              }}
            >
              {displayLetter}
            </span>
          </div>
        )}

        {showIcon && IconComponent && (
          <span
            className={`mlp-bounce-in absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white shadow-lg sm:h-12 sm:w-12 ${iconBgColor} ${iconTextColor}`}
          >
            {IconComponent}
          </span>
        )}
      </div>
    );
  };

  // ─── Render Small Letter (draggable options) ──────────────
  const renderSmallLetter = (letter: string, index: number) => {
    const isDraggingThis = dragState.letter === letter && dragState.isDragging;
    const isUsed = !smallLetters.includes(letter);
    const isDisabled =
      isUsed || isWrongLocked || isAudioPlaying || isLocked || isGameComplete;
    const fontSize = getFontSize(letter);
    const upNudge = UP_NUDGE_MARGIN[letter] ?? "0";

    return (
      <div
        key={`small-${session}-${letter}-${index}`}
        className={`
          mlp-pop-in clay-sm flex items-center justify-center
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
          !isDisabled && !isDraggingThis && handlePointerDown(e, letter)
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
                fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: fontSize,
                color: "#FFFFFF",
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
              {letter}
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
      dir="rtl"
      className="relative flex h-full w-full select-none flex-col items-center justify-between p-6"
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="mlp-lock-overlay mlp-lock-overlay-enter" />}

      {isWrongLocked && !showLockOverlay && (
        <div className="mlp-lock-overlay mlp-lock-overlay-enter" />
      )}

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl z-50 pointer-events-none
            ${celebrationPhase === "pop" ? "mlp-celebration-pop" : ""}
            ${celebrationPhase === "fade" ? "mlp-celebration-fade-out" : ""}
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

      {/* ─── TOP: Box (drop target) ─── */}
      <div className="flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}>
          {renderBox()}
        </div>
      </div>

      {/* ─── BOTTOM: Small Letters (draggable options) ─── */}
      <div className="flex w-full max-w-4xl items-center justify-center pb-4">
        <div
          className={`grid ${gridCols} gap-3 sm:gap-4 w-full max-w-3xl place-items-center`}
        >
          {smallLetters.map((letter, index) => renderSmallLetter(letter, index))}
        </div>
      </div>

      {/* ─── Floating Dragged Letter ──────────────────────────── */}
      {dragState.isDragging && dragState.letter && dragState.position && (
        <span
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: getFontSize(dragState.letter),
            color: "#FFFFFF",
            lineHeight: 1.4,
            letterSpacing: "0.02em",
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            textShadow: "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {dragState.letter}
        </span>
      )}
    </div>
  );
}

export default HuroofETahajjiDragCorrectLetterBase;