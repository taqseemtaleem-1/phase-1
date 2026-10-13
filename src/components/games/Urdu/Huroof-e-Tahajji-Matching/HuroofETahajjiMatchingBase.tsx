// src/components/games/Urdu/Huroof-e-Tahajji-Matching/HuroofETahajjiMatchingBase.tsx
// ✅ Urdu version of AlphabetMatchingBase
// 🔥 2 Sessions: letter1 first, then letter2
// 🎨 RTL layout: Letter on right, options on left
// 📝 Urdu font: Noto Nastaliq Urdu
// 🎵 Session-start: Urdu letter audio | Correct/Wrong: standard correct/wrong sounds
// 🔥 FIX: Alif Madda (آ) madda fully visible — no clipping on top or sides
// 🔥 Alif Madda (آ) moved slightly DOWN via TARGET_PADDING

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

// 🔥 Urdu Font
const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 URDU LETTER AUDIOS — glob-import all Letter (N).wav files
// ═══════════════════════════════════════════════════════════════

const LETTER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Huroof-e-Tahajji-Matching Audios/Letter (*).wav",
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
//  🔥 URDU DISTRACTORS MAP
// ═══════════════════════════════════════════════════════════════

const URDU_DISTRACTORS_MAP: Record<string, string[]> = {
  "ا": ["آ", "ل"],
  "آ": ["ا", "ل"],
  "ب": ["پ", "ت"],
  "پ": ["ب", "ت"],
  "ت": ["ٹ", "ب"],
  "ٹ": ["ت", "ث"],
  "ث": ["ٹ", "ت"],
  "ج": ["چ", "ح"],
  "چ": ["ج", "ح"],
  "ح": ["خ", "ج"],
  "خ": ["ح", "د"],
  "د": ["ڈ", "ذ"],
  "ڈ": ["د", "ذ"],
  "ذ": ["ڈ", "ز"],
  "ر": ["ڑ", "ز"],
  "ڑ": ["ر", "ز"],
  "ز": ["ژ", "ر"],
  "ژ": ["ز", "ر"],
  "س": ["ش", "ص"],
  "ش": ["س", "ص"],
  "ص": ["ض", "س"],
  "ض": ["ص", "ط"],
  "ط": ["ظ", "ض"],
  "ظ": ["ط", "ص"],
  "ع": ["غ", "ح"],
  "غ": ["ع", "خ"],
  "ف": ["ق", "و"],
  "ق": ["ف", "و"],
  "ک": ["گ", "ل"],
  "گ": ["ک", "ل"],
  "ل": ["م", "ا"],
  "م": ["ل", "و"],
  "ن": ["ں", "م"],
  "ں": ["ن", "م"],
  "و": ["ہ", "م"],
  "ہ": ["ھ", "و"],
  "ھ": ["ہ", "و"],
  "ء": ["ہ", "ع"],
  "ی": ["ے", "ن"],
  "ے": ["ی", "ن"],
};

// 🔥 Short/wide letters that look visually small — need bigger font
const SHORT_LETTERS = ["د", "ڈ", "ذ", "ر", "ڑ", "ز", "ژ", "و", "ہ", "ھ"];

// 🔥 Laam — renders visually very tall/large in Nastaliq, needs smaller font
const LAAM_LETTER = "ل";

// 🔥 Toe (ط) & Zoe (ظ) — bigger font
const TOE_ZOE_LETTERS = ["ط", "ظ"];

// 🔥 Alif Madda — tall + wide glyph, needs special handling
const ALIF_MADDA = "آ";

// 🔥 Per-letter upward nudge using marginBottom (percent of card width)
const UP_NUDGE_MARGIN: Record<string, string> = {
  "ع": "26%",
  "غ": "26%",
  "ق": "50%",
  "و": "52%",
  "ب": "32%",
  "پ": "52%",
  "ج": "42%",
  "چ": "42%",
  "ح": "42%",
  "خ": "42%",
  "د": "52%",
  "ڈ": "52%",
  "ذ": "52%",
  "ر": "52%",
  "ڑ": "52%",
  "ز": "52%",
  "ژ": "52%",
  "س": "42%",
  "ش": "42%",
  "ص": "42%",
  "ض": "42%",
  "ط": "42%",
  "ظ": "42%",
  "ں": "42%",
  "ن": "42%",
  "م": "52%",
  "ہ": "42%",
  "ھ": "42%",
  "ی": "42%",
  "ے": "42%",
};

// ═══════════════════════════════════════════════════════════════
//  🎯 TARGET LETTER PADDING (right side big letter)
// ═══════════════════════════════════════════════════════════════
const TARGET_PADDING: Record<string, string> = {
  "آ": "0.2em",
  "د": "0.55em",
  "ڈ": "0.55em",
  "ذ": "0.55em",
  "ر": "0.55em",
  "ڑ": "0.55em",
  "ز": "0.55em",
  "ژ": "0.55em",
  "ط": "0.5em",
  "ظ": "0.5em",
  "ل": "0.7em",
  "س": "0.4em",
  "ش": "0.4em",
  "ص": "0.4em",
  "ض": "0.4em",
  "ج": "0.4em",
  "چ": "0.4em",
  "ح": "0.4em",
  "خ": "0.4em",
  "ب": "0.6em",
  "پ": "0.6em",
  "ی": "0.35em",
  "ے": "0.35em",
  "ن": "0.35em",
  "ں": "0.35em",
  "ق": "0.35em",
  "ف": "0.35em",
  "ع": "0.35em",
  "غ": "0.35em",
  "و": "0.3em",
  "ہ": "0.3em",
  "ھ": "0.3em",
  "م": "0.3em",
};

// ═══════════════════════════════════════════════════════════════
//  🎨 COLORS (gradient option cards)
// ═══════════════════════════════════════════════════════════════

function getCardColors(subject: string, state: "idle" | "selected" | "correct" | "wrong") {
  const themes: Record<string, any> = {
    urdu: {
      idle: {
        bg: "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))",
        shadow: "oklch(0.4 0.18 40 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "linear-gradient(145deg, oklch(0.7 0.18 55), oklch(0.55 0.21 40))",
        shadow: "oklch(0.35 0.18 40 / 0.85)",
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
    english: {
      idle: {
        bg: "linear-gradient(145deg, oklch(0.72 0.16 250), oklch(0.55 0.2 260))",
        shadow: "oklch(0.35 0.18 260 / 0.85)",
        text: "#FFFFFF",
      },
      selected: {
        bg: "linear-gradient(145deg, oklch(0.65 0.16 250), oklch(0.5 0.2 260))",
        shadow: "oklch(0.3 0.18 260 / 0.85)",
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
  return themes[subject]?.[state] || themes.urdu.idle;
}

function getLetterColor(subject: string): string {
  const colors: Record<string, string> = {
    urdu: "#CC6B2C",
    english: "#4D82F6",
    math: "#2E8B57",
  };
  return colors[subject] || "#CC6B2C";
}

const letterGradient = "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))";

interface Props {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Point = { x: number; y: number };
type Session = 1 | 2;

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
  @keyframes am-session-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes am-session-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
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
  .am-session-fade-out {
    animation: am-session-fade-out 0.4s ease-out forwards;
  }
  .am-session-fade-in {
    animation: am-session-fade-in 0.4s ease-in forwards;
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
    return `${studentName} successfully matched the first letter ${letterLabel} correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully matching the first letter ${letterLabel} correctly on Attempt ${attemptNumber}.`;
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
    return `${studentName} successfully matched the second letter ${letterLabel} correctly on the very first attempt.`;
  }

  const attemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully matching the second letter ${letterLabel} correctly on Attempt ${attemptNumber}.`;
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
    attempts.session1WrongCount,
    attempts.session1Completed,
  );

  const secondWasAttempted =
    attempts.session2Completed || attempts.session2WrongCount > 0;

  const secondLine = buildLetter2Summary(
    studentName,
    letter2,
    letter2Name,
    attempts.session2WrongCount,
    attempts.session2Completed,
    secondWasAttempted,
  );

  return `First Letter:\n${firstLine}\n\nSecond Letter:\n${secondLine}`;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiMatchingBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  const [session, setSession] = useState<Session>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "out" | "in">("idle");

  const targetLetter = session === 1 ? letter1 : letter2;
  const targetName = session === 1 ? letter1Name : letter2Name;

  const options = useMemo(() => {
    const distractors = URDU_DISTRACTORS_MAP[targetLetter] || ["ل", "م"];
    const picks = [targetLetter, distractors[0], distractors[1]];

    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, [targetLetter, session]);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const s1WrongCountRef = useRef<number>(0);
  const s1CompletedRef = useRef<boolean>(false);
  const s2WrongCountRef = useRef<number>(0);
  const s2CompletedRef = useRef<boolean>(false);

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

  // 🔥 Play the current target letter's Urdu audio (used ONLY at session start)
  const playLetterAudio = useCallback((): Promise<void> => {
    const letterNum = LETTER_TO_NUMBER[targetLetter];
    if (!letterNum) {
      console.warn(`[UrduMatching] No audio number for letter: ${targetLetter}`);
      return Promise.resolve();
    }
    const audioUrl = LETTER_AUDIO[letterNum];
    if (!audioUrl) {
      console.warn(
        `[UrduMatching] No audio file for letter #${letterNum} (${targetLetter})`,
      );
      return Promise.resolve();
    }
    return playAudio(audioUrl);
  }, [playAudio, targetLetter]);

  // 🔥 Result audio: use standard correct/wrong sounds for matches
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
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
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
      LETTER_AUDIO[LETTER_TO_NUMBER[letter1]],
      LETTER_AUDIO[LETTER_TO_NUMBER[letter2]],
      correctMP3,
      correctWAV,
      wrongMP3,
      wrongWAV,
    ].filter(Boolean);
    await Promise.all(urls.map(preloadAudio));
  }, [preloadAudio, letter1, letter2]);

  const loadFont = useCallback(async () => {
    try {
      const font = new FontFace("Noto Nastaliq Urdu", `url(${notoFontUrl})`);
      await font.load();
      document.fonts.add(font);
    } catch (err) {
      console.warn("Noto Nastaliq Urdu font load failed:", err);
    }
  }, []);

  const startSessionLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, 4000);
  }, []);

  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    s1WrongCountRef.current = 0;
    s1CompletedRef.current = false;
    s2WrongCountRef.current = 0;
    s2CompletedRef.current = false;

    const init = async () => {
      await Promise.all([loadFont(), preloadAllAudio()]);
      startSessionLock();
      setTimeout(() => {
        playLetterAudio();
      }, 300);
    };
    init();

    return () => {
      stopAllAudio();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;

            const studentName = sessionData.student.studentName || "Student";

            const attempts: SessionAttempts = {
              session1WrongCount: s1WrongCountRef.current,
              session2WrongCount: s2WrongCountRef.current,
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
              console.warn("[UrduMatching] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      stopAllAudio();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [stopAllAudio]);

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
  const capitalRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!selected || status !== "idle" || isAudioPlaying) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (selected === targetLetter) {
      if (session === 1) {
        s1CompletedRef.current = true;
      } else {
        s2CompletedRef.current = true;
      }

      setStatus("correct");
      setShowCelebration(true);
      setCelebrationPhase("pop");

      playResultAudio(true).then(() => {
        setCelebrationPhase("fade");
        celebrationTimerRef.current = setTimeout(() => {
          setShowCelebration(false);

          if (session === 1) {
            setIsTransitioning(true);
            setTransitionPhase("out");

            sessionTimerRef.current = setTimeout(() => {
              setSelected(null);
              setStatus("idle");
              setLineEnd(null);
              setLineStart(null);
              setIsLineLocked(false);
              setShowLine(false);
              setIsDragging(false);
              setDragPoint(null);
              setHoveredOption(null);

              setSession(2);
              setTransitionPhase("in");

              sessionTimerRef.current = setTimeout(() => {
                setTransitionPhase("idle");
                setIsTransitioning(false);
                startSessionLock();
                setTimeout(() => {
                  playLetterAudio();
                }, 300);
              }, 450);
            }, 450);
          } else {
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

                const attempts: SessionAttempts = {
                  session1WrongCount: s1WrongCountRef.current,
                  session2WrongCount: s2WrongCountRef.current,
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
                }).catch((err) => {
                  console.warn("[UrduMatching] Save completed failed:", err);
                });
              }
            }
            timerRef.current = setTimeout(() => {
              goToLevelPopup();
            }, 400);
          }
        }, 500);
      });
    } else {
      if (session === 1) {
        s1WrongCountRef.current += 1;
      } else {
        s2WrongCountRef.current += 1;
      }

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
  }, [selected, targetLetter, status, isAudioPlaying, session]);

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
    if (isLocked || isAudioPlaying || isTransitioning) return;
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
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const distance = Math.hypot(e.clientX - cx, e.clientY - cy);
      const maxDistance = Math.min(r.width, r.height) * 0.35;
      if (distance > maxDistance) return;
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
    if (isLocked || isAudioPlaying || isTransitioning) return;
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
    if (isLocked || isAudioPlaying || isTransitioning) return;
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

  const isGameLocked =
    isLocked || isAudioPlaying || status === "correct" || status === "wrong" || isTransitioning;

  const containerFadeClass =
    transitionPhase === "out"
      ? "am-session-fade-out"
      : transitionPhase === "in"
        ? "am-session-fade-in"
        : "";

  return (
    <div
      ref={boardRef}
      className={`relative flex h-full w-full select-none flex-col items-center justify-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 ${containerFadeClass}`}
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
        className={`flex h-full w-full items-center justify-center gap-4 sm:gap-8 ${
          isGameLocked ? "pointer-events-none" : ""
        }`}
      >
        {/* ─── RIGHT: Target Urdu Letter (RTL feel) ───────── */}
        <div
          ref={capitalRef}
          className={`flex h-full flex-1 items-center justify-center ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ order: 2 }}
        >
          <div
            className="am-pop-in flex h-full w-full items-center justify-center"
            style={{
              overflow: "visible",
              padding: targetLetter === ALIF_MADDA ? "4% 6%" : "4% 0",
            }}
          >
            <span
              style={{
                fontFamily:
                  "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                fontWeight: 400,
                fontSize:
                  targetLetter === LAAM_LETTER
                    ? "min(28vh, 250px)"
                    : targetLetter === ALIF_MADDA
                      ? "min(36vh, 320px)"
                      : "min(42vh, 380px)",
                background: letterGradient,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
                textAlign: "center",
                paddingBottom: TARGET_PADDING[targetLetter] ?? "0.2em",
                paddingInline: targetLetter === ALIF_MADDA ? "0.15em" : "0",
                overflow: "visible",
              }}
            >
              {targetLetter}
            </span>
          </div>
        </div>

        {/* SPACE */}
        <div className="w-4 sm:w-8 flex-shrink-0" />

        {/* ─── LEFT: Small letters (options) ──────────────── */}
        <div
          className="flex h-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3"
          style={{ order: 1 }}
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

            // 🔥 Font size rules
            const isShortLetter = SHORT_LETTERS.includes(opt);
            const isLaam = opt === LAAM_LETTER;
            const isToeZoe = TOE_ZOE_LETTERS.includes(opt);

            const optionFontSize = isShortLetter
              ? "min(22vh, 175px)"
              : isLaam
                ? "min(11vh, 90px)"
                : isToeZoe
                  ? "min(21vh, 165px)"
                  : "min(14vh, 115px)";

            const upNudge = UP_NUDGE_MARGIN[opt] ?? "0";

            return (
              <button
                key={`${session}-${opt}`}
                ref={(el) => {
                  optionRefs.current[opt] = el;
                }}
                type="button"
                disabled={isDisabled}
                aria-label={`Urdu letter ${opt}`}
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
                        "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
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
                      marginBottom: upNudge,
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

export default HuroofETahajjiMatchingBase;