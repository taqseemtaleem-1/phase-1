// src/components/games/Urdu/Huroof-e-Tahajji-Introduction/HuroofETahajjiIntroductionBase.tsx
// ✅ English ki tarah 2 letters per lesson
// 🔥 Urdu RTL layout — pehla letter right, doosra left
// 🎨 Idle: orange solid | Playing: green solid (gradient removed — nukte fix)
// ✨ No text shadow
// 📝 Summary mein sirf letters (no brackets) → NOW WITH LETTER NAMES
// 🎵 Real Urdu audios: Auto Bounce (01-40), Tap (01-40), Assistant Audio
// ⬆️ Per-letter vertical offsets (position: relative + top)

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AssistantTalking } from "@/components/AssistantTalking";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

const FingerSVG = "/assets/finger.svg";
const CelebrationSVG = "/assets/Celebration.svg";

const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ══════════════════════════════════════════════════════════════
//  🎵 ASSISTANT AUDIOS
// ══════════════════════════════════════════════════════════════

const assistantFor01 = "/assets/Huroof-e-Tahajji-Introduction Audios/Assistant Audio/For 01.wav";
const assistantFor02To20 = "/assets/Huroof-e-Tahajji-Introduction Audios/Assistant Audio/For 02 to 20.wav";
const assistantTap = "/assets/Huroof-e-Tahajji-Introduction Audios/Assistant Audio/tap.wav";

// ══════════════════════════════════════════════════════════════
//  🎵 AUTO BOUNCE AUDIOS (01-40)
// ══════════════════════════════════════════════════════════════

const autoBounce01 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (01).wav";
const autoBounce02 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (02).wav";
const autoBounce03 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (03).wav";
const autoBounce04 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (04).wav";
const autoBounce05 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (05).wav";
const autoBounce06 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (06).wav";
const autoBounce07 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (07).wav";
const autoBounce08 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (08).wav";
const autoBounce09 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (09).wav";
const autoBounce10 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (10).wav";
const autoBounce11 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (11).wav";
const autoBounce12 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (12).wav";
const autoBounce13 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (13).wav";
const autoBounce14 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (14).wav";
const autoBounce15 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (15).wav";
const autoBounce16 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (16).wav";
const autoBounce17 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (17).wav";
const autoBounce18 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (18).wav";
const autoBounce19 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (19).wav";
const autoBounce20 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (20).wav";
const autoBounce21 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (21).wav";
const autoBounce22 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (22).wav";
const autoBounce23 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (23).wav";
const autoBounce24 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (24).wav";
const autoBounce25 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (25).wav";
const autoBounce26 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (26).wav";
const autoBounce27 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (27).wav";
const autoBounce28 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (28).wav";
const autoBounce29 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (29).wav";
const autoBounce30 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (30).wav";
const autoBounce31 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (31).wav";
const autoBounce32 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (32).wav";
const autoBounce33 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (33).wav";
const autoBounce34 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (34).wav";
const autoBounce35 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (35).wav";
const autoBounce36 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (36).wav";
const autoBounce37 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (37).wav";
const autoBounce38 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (38).wav";
const autoBounce39 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (39).wav";
const autoBounce40 = "/assets/Huroof-e-Tahajji-Introduction Audios/Auto Bounce (40).wav";

// ══════════════════════════════════════════════════════════════
//  🎵 TAP AUDIOS (01-40)
// ══════════════════════════════════════════════════════════════

const tap01 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (01).wav";
const tap02 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (02).wav";
const tap03 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (03).wav";
const tap04 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (04).wav";
const tap05 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (05).wav";
const tap06 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (06).wav";
const tap07 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (07).wav";
const tap08 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (08).wav";
const tap09 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (09).wav";
const tap10 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (10).wav";
const tap11 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (11).wav";
const tap12 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (12).wav";
const tap13 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (13).wav";
const tap14 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (14).wav";
const tap15 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (15).wav";
const tap16 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (16).wav";
const tap17 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (17).wav";
const tap18 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (18).wav";
const tap19 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (19).wav";
const tap20 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (20).wav";
const tap21 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (21).wav";
const tap22 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (22).wav";
const tap23 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (23).wav";
const tap24 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (24).wav";
const tap25 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (25).wav";
const tap26 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (26).wav";
const tap27 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (27).wav";
const tap28 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (28).wav";
const tap29 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (29).wav";
const tap30 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (30).wav";
const tap31 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (31).wav";
const tap32 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (32).wav";
const tap33 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (33).wav";
const tap34 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (34).wav";
const tap35 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (35).wav";
const tap36 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (36).wav";
const tap37 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (37).wav";
const tap38 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (38).wav";
const tap39 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (39).wav";
const tap40 = "/assets/Huroof-e-Tahajji-Introduction Audios/Tap (40).wav";

// ══════════════════════════════════════════════════════════════
//  📚 AUDIO MAPS
// ══════════════════════════════════════════════════════════════

const AUTO_BOUNCE_MAP: Record<number, string> = {
  1: autoBounce01,  2: autoBounce02,  3: autoBounce03,  4: autoBounce04,
  5: autoBounce05,  6: autoBounce06,  7: autoBounce07,  8: autoBounce08,
  9: autoBounce09,  10: autoBounce10, 11: autoBounce11, 12: autoBounce12,
  13: autoBounce13, 14: autoBounce14, 15: autoBounce15, 16: autoBounce16,
  17: autoBounce17, 18: autoBounce18, 19: autoBounce19, 20: autoBounce20,
  21: autoBounce21, 22: autoBounce22, 23: autoBounce23, 24: autoBounce24,
  25: autoBounce25, 26: autoBounce26, 27: autoBounce27, 28: autoBounce28,
  29: autoBounce29, 30: autoBounce30, 31: autoBounce31, 32: autoBounce32,
  33: autoBounce33, 34: autoBounce34, 35: autoBounce35, 36: autoBounce36,
  37: autoBounce37, 38: autoBounce38, 39: autoBounce39, 40: autoBounce40,
};

const TAP_MAP: Record<number, string> = {
  1: tap01,  2: tap02,  3: tap03,  4: tap04,
  5: tap05,  6: tap06,  7: tap07,  8: tap08,
  9: tap09,  10: tap10, 11: tap11, 12: tap12,
  13: tap13, 14: tap14, 15: tap15, 16: tap16,
  17: tap17, 18: tap18, 19: tap19, 20: tap20,
  21: tap21, 22: tap22, 23: tap23, 24: tap24,
  25: tap25, 26: tap26, 27: tap27, 28: tap28,
  29: tap29, 30: tap30, 31: tap31, 32: tap32,
  33: tap33, 34: tap34, 35: tap35, 36: tap36,
  37: tap37, 38: tap38, 39: tap39, 40: tap40,
};

// ══════════════════════════════════════════════════════════════
//  🎨 COLORS — Solid (gradient text breaks nukte on Nastaliq)
// ══════════════════════════════════════════════════════════════

const LETTER_IDLE_COLOR = "oklch(0.6 0.21 40)";
const LETTER_PLAYING_COLOR = "oklch(0.55 0.2 148)";

// ══════════════════════════════════════════════════════════════
//  ⬆️ LETTER VERTICAL OFFSETS (position:relative + top)
// ══════════════════════════════════════════════════════════════

const LETTER_Y_OFFSETS: Record<number, string> = {
  1: "0%",
  2: "0%",
  3: "-12%",  4: "-12%",  5: "-12%",  6: "-12%",
  7: "-12%",  8: "-12%",  9: "-12%",  10: "-12%",
  11: "-12%",
  12: "-8%",  13: "-8%",  14: "-8%",  15: "-8%",
  16: "-8%",  17: "-8%",  18: "-8%",
  19: "0%",  20: "0%",  21: "0%",  22: "0%",
  23: "0%",  24: "0%",  25: "0%",  26: "0%",
  27: "0%",  28: "-8%",
  29: "0%",  30: "0%",  31: "0%",  32: "0%",
  33: "-8%", 34: "-8%",
  35: "-8%",
  36: "0%",  37: "0%",  38: "0%",
  39: "-12%", 40: "-8%",
};

function getLetterOffset(letterNum: number): string {
  return LETTER_Y_OFFSETS[letterNum] ?? "0%";
}

// ══════════════════════════════════════════════════════════════
//  📦 PROPS
// ══════════════════════════════════════════════════════════════

interface Props {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
}

type Phase = "loading" | "assistant" | "letters" | "celebration" | "done";

// ══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

function buildIntroSummary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  letter2: string,
  letter2Name: string,
  completed: boolean,
): string {
  const l1 = letter1Name ? `'${letter1}' (${letter1Name})` : `'${letter1}'`;
  const l2 = letter2Name ? `'${letter2}' (${letter2Name})` : `'${letter2}'`;

  if (completed) {
    return `${studentName} Watched Completely Letter ${l1} and ${l2} Introduction`;
  }
  return `${studentName} Watched Partially Letter ${l1} and ${l2} Introduction`;
}

// ══════════════════════════════════════════════════════════════
//  🎨 CSS
// ══════════════════════════════════════════════════════════════

const ANIMATION_CSS = `
  @keyframes ai-assistant-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.9); }
  }
  
  @keyframes ai-letters-fade-in {
    0%   { opacity: 0; transform: scale(0.85); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes ai-pop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.12); }
    70%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }

  @keyframes ai-celebration-pop {
    0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  
  @keyframes ai-celebration-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.1); }
  }

  .ai-assistant-fade-out { animation: ai-assistant-fade-out 0.4s ease-out both; }
  .ai-letters-fade-in { animation: ai-letters-fade-in 0.5s ease-out both; }
  .ai-pop { animation: ai-pop 0.4s ease-out both; }
  .ai-celebration-pop { 
    animation: ai-celebration-pop 0.6s cubic-bezier(.34,1.56,.64,1) both;
    pointer-events: none;
    z-index: 50;
  }
  .ai-celebration-fade-out {
    animation: ai-celebration-fade-out 0.5s ease-in forwards;
    pointer-events: none;
    z-index: 50;
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

// ══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function HuroofETahajjiIntroductionBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject = "urdu",
  level,
  lessonId,
  onComplete,
}: Props) {
  const navigate = useNavigate();

  const letter1Num = (level || 1) * 2 - 1;
  const letter2Num = (level || 1) * 2;

  // ─── State ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [isLocked, setIsLocked] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showLetters, setShowLetters] = useState(false);
  const [letter1Pop, setLetter1Pop] = useState(false);
  const [letter2Pop, setLetter2Pop] = useState(false);
  const [letter1Playing, setLetter1Playing] = useState(false);
  const [letter2Playing, setLetter2Playing] = useState(false);
  const [assistantFading, setAssistantFading] = useState(false);

  const [showFinger, setShowFinger] = useState(false);
  const [isCycleComplete, setIsCycleComplete] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<"letter1" | "letter2">("letter1");
  const [isTapAudioPlaying, setIsTapAudioPlaying] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null);
  const tapAudioRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const letter1TappedRef = useRef(false);
  const letter2TappedRef = useRef(false);

  const autoBounceTimerRef = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  const isUnmountedRef = useRef(false);
  const isPlayingRef = useRef(false);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

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

    if (assistantAudioRef.current) {
      stopAudio(assistantAudioRef.current);
      assistantAudioRef.current = null;
    }

    if (tapAudioRef.current) {
      stopAudio(tapAudioRef.current);
      tapAudioRef.current = null;
    }

    setIsAudioPlaying(false);
    setIsTapAudioPlaying(false);
    isPlayingRef.current = false;
  }, [stopAudio]);

  const playAudio = useCallback(
    (src: string, onEnd?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();

        try {
          const audio = new Audio(src);
          audioRefs.current.push(audio);
          setIsAudioPlaying(true);
          isPlayingRef.current = true;

          audio.onended = () => {
            setIsAudioPlaying(false);
            isPlayingRef.current = false;
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onEnd) onEnd();
            resolve();
          };

          audio.onerror = () => {
            setIsAudioPlaying(false);
            isPlayingRef.current = false;
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onEnd) onEnd();
            resolve();
          };

          audio.play().catch(() => {
            setIsAudioPlaying(false);
            isPlayingRef.current = false;
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onEnd) onEnd();
            resolve();
          });
        } catch {
          setIsAudioPlaying(false);
          isPlayingRef.current = false;
          if (onEnd) onEnd();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

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
            isPlayingRef.current = true;

            audio.onended = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                isPlayingRef.current = false;
                audioRefs.current = [];
                resolve();
              }
            };

            audio.onerror = () => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                isPlayingRef.current = false;
                audioRefs.current = [];
                resolve();
              }
            };

            audio.play().catch(() => {
              completedCount++;
              if (completedCount >= totalFiles && !isResolved) {
                isResolved = true;
                setIsAudioPlaying(false);
                isPlayingRef.current = false;
                audioRefs.current = [];
                resolve();
              }
            });
          } catch {
            completedCount++;
            if (completedCount >= totalFiles && !isResolved) {
              isResolved = true;
              setIsAudioPlaying(false);
              isPlayingRef.current = false;
              audioRefs.current = [];
              resolve();
            }
          }
        });
      });
    },
    [stopAllAudio],
  );

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
    const isFirstLesson = level === 1;
    const audioUrls = [
      isFirstLesson ? assistantFor01 : assistantFor02To20,
      assistantTap,
      AUTO_BOUNCE_MAP[letter1Num],
      AUTO_BOUNCE_MAP[letter2Num],
      TAP_MAP[letter1Num],
      TAP_MAP[letter2Num],
      correctMP3,
      correctWAV,
    ].filter(Boolean);

    const promises = audioUrls.map(async (url) => {
      try {
        await preloadAudio(url);
      } catch {}
    });

    await Promise.all(promises);
  }, [level, letter1Num, letter2Num, preloadAudio]);

  const loadFont = useCallback(async () => {
    try {
      const font = new FontFace("Noto Nastaliq Urdu", `url(${notoFontUrl})`);
      await font.load();
      document.fonts.add(font);
      console.log("✅ [HuroofIntro] Noto Nastaliq Urdu font loaded");
    } catch (err) {
      console.warn("Noto Nastaliq Urdu font load failed:", err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    isUnmountedRef.current = false;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    const init = async () => {
      await Promise.all([loadFont(), preloadAllAudio()]);

      if (isMountedRef.current && !isUnmountedRef.current) {
        setPhase("assistant");
        setShowAssistant(true);
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      isUnmountedRef.current = true;
      stopAllAudio();

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000
        );

        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;

            const studentName = session.student.studentName || "Student";
            const summary = buildIntroSummary(
              studentName,
              letter1,
              letter1Name || "",
              letter2,
              letter2Name || "",
              false,
            );

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject: subject || "urdu",
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter1,
                letter1Name,
                letter2,
                letter2Name,
                letter1Tapped: letter1TappedRef.current,
                letter2Tapped: letter2TappedRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[HuroofIntro] Save partial failed:", err);
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
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const playAssistantAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (isUnmountedRef.current) {
        resolve();
        return;
      }

      const isFirstLesson = level === 1;
      const audioPath = isFirstLesson ? assistantFor01 : assistantFor02To20;

      if (assistantAudioRef.current) {
        stopAudio(assistantAudioRef.current);
        assistantAudioRef.current = null;
      }

      const audio = new Audio(audioPath);
      assistantAudioRef.current = audio;
      audioRefs.current.push(audio);
      setIsAudioPlaying(true);

      audio.onended = () => {
        if (assistantAudioRef.current === audio) {
          assistantAudioRef.current = null;
        }
        const index = audioRefs.current.indexOf(audio);
        if (index !== -1) {
          audioRefs.current.splice(index, 1);
        }
        setIsAudioPlaying(false);
        if (!isUnmountedRef.current) resolve();
      };

      audio.onerror = () => {
        if (assistantAudioRef.current === audio) {
          assistantAudioRef.current = null;
        }
        const index = audioRefs.current.indexOf(audio);
        if (index !== -1) {
          audioRefs.current.splice(index, 1);
        }
        setIsAudioPlaying(false);
        if (!isUnmountedRef.current) resolve();
      };

      audio.play().catch(() => {
        if (assistantAudioRef.current === audio) {
          assistantAudioRef.current = null;
        }
        const index = audioRefs.current.indexOf(audio);
        if (index !== -1) {
          audioRefs.current.splice(index, 1);
        }
        setIsAudioPlaying(false);
        if (!isUnmountedRef.current) resolve();
      });
    });
  }, [level, stopAudio]);

  const playLetterAudio = useCallback(
    (
      audioType: "auto-letter1" | "auto-letter2" | "tap-letter1" | "tap-letter2",
      onPopStart?: () => void,
      onPopEnd?: () => void,
    ): Promise<void> => {
      return new Promise((resolve) => {
        if (isUnmountedRef.current) {
          resolve();
          return;
        }
        if (isPlayingRef.current) {
          resolve();
          return;
        }

        let audioPath: string | undefined = "";

        switch (audioType) {
          case "auto-letter1":
            audioPath = AUTO_BOUNCE_MAP[letter1Num];
            break;
          case "auto-letter2":
            audioPath = AUTO_BOUNCE_MAP[letter2Num];
            break;
          case "tap-letter1":
            audioPath = TAP_MAP[letter1Num];
            break;
          case "tap-letter2":
            audioPath = TAP_MAP[letter2Num];
            break;
        }

        if (!audioPath) {
          console.warn(`[HuroofIntro] No audio found for ${audioType}`);
          if (onPopStart) onPopStart();
          if (onPopEnd) onPopEnd();
          resolve();
          return;
        }

        if (onPopStart) onPopStart();

        playAudio(audioPath, () => {
          if (onPopEnd) onPopEnd();
          if (!isUnmountedRef.current) resolve();
        });
      });
    },
    [playAudio, letter1Num, letter2Num],
  );

  const playTapPromptAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (isUnmountedRef.current) {
        resolve();
        return;
      }

      setIsTapAudioPlaying(true);

      playAudio(assistantTap, () => {
        setIsTapAudioPlaying(false);
        if (!isUnmountedRef.current) resolve();
      });
    });
  }, [playAudio]);

  const playCelebrationAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (isUnmountedRef.current) {
        resolve();
        return;
      }

      playMultipleAudios([correctMP3, correctWAV]).then(() => {
        if (!isUnmountedRef.current) resolve();
      });
    });
  }, [playMultipleAudios]);

  const runAutoBounce = useCallback(
    async (target: "letter1" | "letter2") => {
      return new Promise<void>((resolve) => {
        if (isUnmountedRef.current) {
          resolve();
          return;
        }
        if (target === "letter1") {
          setLetter1Playing(true);
          setLetter1Pop(true);
          playLetterAudio(
            "auto-letter1",
            () => {},
            () => {
              setLetter1Pop(false);
              setLetter1Playing(false);
              resolve();
            },
          );
        } else {
          setLetter2Playing(true);
          setLetter2Pop(true);
          playLetterAudio(
            "auto-letter2",
            () => {},
            () => {
              setLetter2Pop(false);
              setLetter2Playing(false);
              resolve();
            },
          );
        }
      });
    },
    [playLetterAudio],
  );

  useEffect(() => {
    if (phase !== "assistant" || !showAssistant) return;

    setIsLocked(true);

    const startSequence = async () => {
      await playAssistantAudio();
      if (!isMountedRef.current || isUnmountedRef.current) return;

      setAssistantFading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      setShowAssistant(false);
      setAssistantFading(false);
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      setShowLetters(true);
      setPhase("letters");
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("letter1");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("letter2");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("letter1");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("letter2");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      if (isMountedRef.current && !isUnmountedRef.current) {
        await playTapPromptAudio();
        setIsLocked(false);
        startCycle();
      }
    };

    const timer = setTimeout(() => {
      startSequence();
    }, 500);

    autoBounceTimerRef.current.push(timer);

    return () => {
      autoBounceTimerRef.current.forEach((timer) => clearTimeout(timer));
      autoBounceTimerRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, showAssistant, playAssistantAudio, runAutoBounce, playTapPromptAudio]);

  const startCycle = useCallback(() => {
    letter1TappedRef.current = false;
    letter2TappedRef.current = false;
    setIsCycleComplete(false);
    setCurrentTarget("letter1");
    setShowFinger(true);
    setIsLocked(false);
  }, []);

  const goToNextLesson = useCallback(async () => {
    stopAllAudio();

    if (onComplete) {
      onComplete();
      return;
    }
    navigate({
      to: "/levels",
      search: {
        subject: subject || "urdu",
        level: level || 1,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, onComplete, stopAllAudio]);

  const handleTap = useCallback(
    async (target: "letter1" | "letter2") => {
      if (isLocked || isPlayingRef.current || isTapAudioPlaying) return;
      if (target !== currentTarget) return;
      if (isUnmountedRef.current) return;

      setShowFinger(false);

      if (target === "letter1") {
        if (letter1TappedRef.current) return;
        letter1TappedRef.current = true;

        setLetter1Playing(true);
        setLetter1Pop(true);
        await playLetterAudio(
          "tap-letter1",
          () => {},
          () => {
            setLetter1Pop(false);
            setLetter1Playing(false);
          },
        );
      } else {
        if (letter2TappedRef.current) return;
        letter2TappedRef.current = true;

        setLetter2Playing(true);
        setLetter2Pop(true);
        await playLetterAudio(
          "tap-letter2",
          () => {},
          () => {
            setLetter2Pop(false);
            setLetter2Playing(false);
          },
        );
      }

      if (letter1TappedRef.current && letter2TappedRef.current) {
        setIsLocked(true);
        setIsCycleComplete(true);

        timerRef.current = setTimeout(async () => {
          setShowCelebration(true);
          setCelebrationPhase("pop");
          await playCelebrationAudio();

          setCelebrationPhase("fade");

          celebrationTimerRef.current = setTimeout(async () => {
            setShowCelebration(false);
            setPhase("done");

            completedRef.current = true;

            const elapsed = Math.floor(
              (Date.now() - sessionStartTimeRef.current) / 1000
            );

            const session = getSession();
            if (session?.student && !progressSavedRef.current) {
              progressSavedRef.current = true;

              const studentName = session.student.studentName || "Student";
              const summary = buildIntroSummary(
                studentName,
                letter1,
                letter1Name || "",
                letter2,
                letter2Name || "",
                true,
              );

              try {
                await saveProgress({
                  studentId: session.student.studentId,
                  deviceToken: session.student.token,
                  subject: subject || "urdu",
                  level: level || 1,
                  lessonId: lessonId || 1,
                  status: "completed",
                  timeSpentSec: elapsed,
                  summary,
                  gameData: {
                    letter1,
                    letter1Name,
                    letter2,
                    letter2Name,
                    letter1Tapped: true,
                    letter2Tapped: true,
                    completed: true,
                  },
                });
                console.log("✅ [HuroofIntro] Progress saved (completed)");
              } catch (err) {
                console.warn("[HuroofIntro] Save completed failed:", err);
              }
            }

            await goToNextLesson();
          }, 500);
        }, 400);
      } else {
        setCurrentTarget(target === "letter1" ? "letter2" : "letter1");
        setShowFinger(true);
      }
    },
    [
      isLocked,
      isTapAudioPlaying,
      currentTarget,
      playLetterAudio,
      playCelebrationAudio,
      goToNextLesson,
      subject,
      level,
      lessonId,
      letter1,
      letter1Name,
      letter2,
      letter2Name,
    ],
  );

  const handleLetter1Touch = () => {
    handleTap("letter1");
  };

  const handleLetter2Touch = () => {
    handleTap("letter2");
  };

  const FingerIndicator = ({ show }: { show: boolean }) => {
    if (!show) return null;

    return (
      <div
        className="absolute pointer-events-none"
        style={{
          top: "58%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          height: "100%",
          maxWidth: "360px",
          maxHeight: "360px",
          zIndex: 20,
        }}
      >
        <img
          src={FingerSVG}
          alt="Tap here"
          className="w-full h-full object-contain"
          style={{
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.25))",
          }}
        />
      </div>
    );
  };

  const LetterSpan = ({
    letter,
    isPlaying,
    letterNum,
  }: {
    letter: string;
    isPlaying: boolean;
    letterNum: number;
  }) => {
    const color = isPlaying ? LETTER_PLAYING_COLOR : LETTER_IDLE_COLOR;
    const yOffset = getLetterOffset(letterNum);

    return (
      <span
        style={{
          fontFamily:
            "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
          fontWeight: 400,
          fontSize: "min(35vh, 320px)",
          lineHeight: 1.2,
          letterSpacing: "0.02em",
          color: color,
          textShadow: "none",
          display: "inline-block",
          padding: "0.1em 0.3em",
          transition: "color 0.15s ease, top 0.15s ease",
          position: "relative",
          top: yOffset,
        }}
      >
        {letter}
      </span>
    );
  };

  if (showAssistant) {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>

        <div
          className={`absolute inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm ${
            assistantFading ? "ai-assistant-fade-out" : ""
          }`}
        >
          <AssistantTalking />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full p-4 overflow-hidden">
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {showCelebration && (
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl ${
            celebrationPhase === "pop"
              ? "ai-celebration-pop"
              : celebrationPhase === "fade"
                ? "ai-celebration-fade-out"
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

      {/* 🔥 RTL LAYOUT */}
      {showLetters && phase !== "done" && (
        <div className="ai-letters-fade-in flex flex-row-reverse items-center justify-center w-full h-full max-w-6xl gap-8 sm:gap-16">
          {/* Letter 1 — RIGHT */}
          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "letter1"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${letter1Pop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleLetter1Touch}
            onTouchStart={handleLetter1Touch}
          >
            <div className="flex h-full w-full items-center justify-center">
              <LetterSpan
                letter={letter1}
                isPlaying={letter1Playing}
                letterNum={letter1Num}
              />
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "letter1" && !isLocked && !isTapAudioPlaying}
            />
          </div>

          {/* Letter 2 — LEFT */}
          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "letter2"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${letter2Pop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleLetter2Touch}
            onTouchStart={handleLetter2Touch}
          >
            <div className="flex h-full w-full items-center justify-center">
              <LetterSpan
                letter={letter2}
                isPlaying={letter2Playing}
                letterNum={letter2Num}
              />
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "letter2" && !isLocked && !isTapAudioPlaying}
            />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="ai-letters-fade-in flex flex-row-reverse items-center justify-center w-full h-full max-w-6xl gap-8 sm:gap-16">
          <div
            className="relative flex items-center justify-center"
            style={{ width: "45%", maxWidth: "450px", aspectRatio: "1/1", zIndex: 1 }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <LetterSpan
                letter={letter1}
                isPlaying={false}
                letterNum={letter1Num}
              />
            </div>
          </div>

          <div
            className="relative flex items-center justify-center"
            style={{ width: "45%", maxWidth: "450px", aspectRatio: "1/1", zIndex: 1 }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <LetterSpan
                letter={letter2}
                isPlaying={false}
                letterNum={letter2Num}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HuroofETahajjiIntroductionBase;