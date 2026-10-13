// src/components/games/Math/Numbers-Introduction/MathNumbersIntroductionBase.tsx
// ✅ Math Numbers Introduction — uses CSS BALLS (no SVG)
// 🔢 Number shown as "capital" position (LEFT)
// ⚽ CSS balls shown as "small" position (RIGHT) — same as Number Matching Objects
// 🎬 SAME FLOW as English Introduction:
//    1. Assistant audio
//    2. 4× auto-bounce (number, balls, number, balls)
//    3. Tap prompt audio
//    4. Hand on number → tap → number audio
//    5. Hand on balls → tap → balls audio
//    6. Celebration
// 🔥 Ball layout matches Number Matching Objects:
//    1 ball  → 62% (single center)
//    2 balls → 45% (1 row of 2)
//    3 balls → 45% (2 top + 1 center)
//    4 balls → 45% (2×2)
//    5 balls → 30% (3 top + 2 center)
//    6 balls → 30% (3×2)
//    7 balls → 28% (3 + 3 + 1)
//    8 balls → 28% (3 + 3 + 2)
//    9 balls → 28% (3×3)
//
// 📝 Summary: Simple "Ahmed watched the number '3' introduction completely." pattern

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AssistantTalking } from "@/components/AssistantTalking";

// 🔥 Progress sync
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 SVGs
const FingerSVG = "/assets/finger.svg";
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio
const TapAudio = "/assets/Math Assets/Numbers-Introduction Assests/Assistant/tap.wav";
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";

// 🔥 Math Assistant Audios
const mathAssistantFor1 = "/assets/Math Assets/Numbers-Introduction Assests/Assistant/For Num 1.wav";
const mathAssistantFor2To0 = "/assets/Math Assets/Numbers-Introduction Assests/Assistant/For Num 2 to 0.wav";

// 🔥 Math Number Audios
const numberAudio0 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (0).wav";
const numberAudio1 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (1).wav";
const numberAudio2 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (2).wav";
const numberAudio3 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (3).wav";
const numberAudio4 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (4).wav";
const numberAudio5 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (5).wav";
const numberAudio6 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (6).wav";
const numberAudio7 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (7).wav";
const numberAudio8 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (8).wav";
const numberAudio9 = "/assets/Math Assets/Numbers-Introduction Assests/Number Audios/Number (9).wav";

// 🔥 Math Balls Audios
const ballsAppear1 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (1).wav";
const ballsAppear2 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (2).wav";
const ballsAppear3 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (3).wav";
const ballsAppear4 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (4).wav";
const ballsAppear5 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (5).wav";
const ballsAppear6 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (6).wav";
const ballsAppear7 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (7).wav";
const ballsAppear8 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (8).wav";
const ballsAppear9 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/balls-appear (9).wav";
const noBallAppear0 = "/assets/Math Assets/Numbers-Introduction Assests/Ball Audios/no ball appear (0).wav";

// 🔥 Andika Font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

interface Props {
  number?: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
}

type Phase = "loading" | "assistant" | "game" | "celebration" | "done";

// ══════════════════════════════════════════════════════════════
//  📚 AUDIO MAPS
// ══════════════════════════════════════════════════════════════

const NUMBER_AUDIO_MAP: Record<string, string> = {
  "0": numberAudio0,
  "1": numberAudio1,
  "2": numberAudio2,
  "3": numberAudio3,
  "4": numberAudio4,
  "5": numberAudio5,
  "6": numberAudio6,
  "7": numberAudio7,
  "8": numberAudio8,
  "9": numberAudio9,
};

const BALLS_APPEAR_MAP: Record<string, string> = {
  "0": noBallAppear0,
  "1": ballsAppear1,
  "2": ballsAppear2,
  "3": ballsAppear3,
  "4": ballsAppear4,
  "5": ballsAppear5,
  "6": ballsAppear6,
  "7": ballsAppear7,
  "8": ballsAppear8,
  "9": ballsAppear9,
};

function getMathAssistantAudio(numberChar: string): string {
  if (numberChar === "1") return mathAssistantFor1;
  return mathAssistantFor2To0;
}

function getNumberAudio(numberChar: string): string {
  return NUMBER_AUDIO_MAP[numberChar] ?? numberAudio1;
}

function getBallsAudio(numberChar: string): string {
  return BALLS_APPEAR_MAP[numberChar] ?? ballsAppear1;
}

function getBallCount(numberChar: string): number {
  const n = parseInt(numberChar, 10);
  return isNaN(n) ? 0 : n;
}

// ══════════════════════════════════════════════════════════════
//  🎨 COLORS
// ══════════════════════════════════════════════════════════════

const NUMBER_COLOR = "#2E8B57";  // Math green
const NUMBER_PLAYING_GRADIENT =
  "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))";

// ══════════════════════════════════════════════════════════════
//  🎨 CSS — Same as English Introduction + CSS Balls
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

  .ai-assistant-fade-out {
    animation: ai-assistant-fade-out 0.4s ease-out both;
  }
  
  .ai-letters-fade-in {
    animation: ai-letters-fade-in 0.5s ease-out both;
  }
  
  .ai-pop {
    animation: ai-pop 0.4s ease-out both;
  }
  
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

  /* ═══════════════════════════════════════════════════════════ */
  /*  ⚽ CSS BALL — same styling as Number Matching Objects      */
  /* ═══════════════════════════════════════════════════════════ */
  .mi-ball {
    display: block;
    border-radius: 50%;
    position: relative;
    background:
      radial-gradient(
        circle at 32% 28%,
        #FF8A8A 0%,
        #E63946 35%,
        #B71C2E 75%,
        #8B0000 100%
      );
    box-shadow:
      inset -3px -4px 8px rgba(0, 0, 0, 0.35),
      inset 3px 3px 6px rgba(255, 255, 255, 0.25),
      0 3px 6px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
  }

  .mi-ball::before {
    content: "";
    position: absolute;
    top: 14%;
    left: 18%;
    width: 28%;
    height: 22%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    filter: blur(0.5px);
    pointer-events: none;
  }

  .mi-ball::after {
    content: "";
    position: absolute;
    bottom: 12%;
    right: 20%;
    width: 18%;
    height: 12%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.35) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
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

// ══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function MathNumbersIntroductionBase({
  number: numberProp,
  subject = "math",
  level = 1,
  lessonId = 1,
  onComplete,
}: Props) {
  const navigate = useNavigate();

  // 🔢 Number (string "1"-"9", "0")
  const numberChar = numberProp ?? "1";
  const ballCount = getBallCount(numberChar);

  // 🔥 Audio sources
  const assistantAudioSrc = getMathAssistantAudio(numberChar);
  const numberAudioSrc = getNumberAudio(numberChar);
  const ballsAudioSrc = getBallsAudio(numberChar);

  // ─── State ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [numberPlaying, setNumberPlaying] = useState(false);
  const [ballsPlaying, setBallsPlaying] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [numberPop, setNumberPop] = useState(false);
  const [ballsPop, setBallsPop] = useState(false);
  const [assistantFading, setAssistantFading] = useState(false);

  const [showFinger, setShowFinger] = useState(false);
  const [isCycleComplete, setIsCycleComplete] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<"number" | "balls">("number");
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

  const numberTappedRef = useRef(false);
  const ballsTappedRef = useRef(false);

  const autoBounceTimerRef = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  const isUnmountedRef = useRef(false);
  const isPlayingRef = useRef(false);

  // Progress tracking refs
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  // ─── STOP SINGLE AUDIO ─────────────────────────────────────
  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
  }, []);

  // ─── STOP ALL AUDIO ──────────────────────────────────────────
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

  // ─── CREATE AND PLAY AUDIO ────────────────────────────────
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

  // ─── PLAY MULTIPLE AUDIOS ──────────────────────────────────
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

  // ─── Preload Single Audio ────────────────────────────────────
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

  // ─── Preload ALL Audio ───────────────────────────────────────
  const preloadAllAudio = useCallback(async () => {
    const audioUrls = [
      assistantAudioSrc,
      numberAudioSrc,
      ballsAudioSrc,
      TapAudio,
      correctMP3,
      correctWAV,
    ];

    const promises = audioUrls.map(async (url) => {
      try {
        await preloadAudio(url);
      } catch {}
    });

    await Promise.all(promises);
  }, [assistantAudioSrc, numberAudioSrc, ballsAudioSrc, preloadAudio]);

  // ─── Load Andika Font ────────────────────────────────────────
  const loadFont = useCallback(async () => {
    try {
      const font = new FontFace("Andika", `url(${andikaFontUrl})`);
      await font.load();
      document.fonts.add(font);
    } catch (err) {
      console.warn("Andika font load failed:", err);
    }
  }, []);

  // ─── Initialize Loading ──────────────────────────────────────
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
            const summary = `${studentName} did not complete the lesson.`;

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject: subject || "math",
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                numberTapped: numberTappedRef.current,
                ballsTapped: ballsTappedRef.current,
                completed: false,
              },
            }).catch(() => {});
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cleanup timers on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      stopAllAudio();
    };
  }, [stopAllAudio]);

  // ─── Play Assistant Audio ────────────────────────────────────
  const playAssistantAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (isUnmountedRef.current) {
        resolve();
        return;
      }

      if (assistantAudioRef.current) {
        stopAudio(assistantAudioRef.current);
        assistantAudioRef.current = null;
      }

      const audio = new Audio(assistantAudioSrc);
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
  }, [assistantAudioSrc, stopAudio]);

  // ─── Play Number or Balls Audio ──────────────────────────────
  const playItemAudio = useCallback(
    (
      audioType: "auto-number" | "auto-balls" | "tap-number" | "tap-balls",
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

        let audioPath = "";

        switch (audioType) {
          case "auto-number":
          case "tap-number":
            audioPath = numberAudioSrc;
            break;
          case "auto-balls":
          case "tap-balls":
            audioPath = ballsAudioSrc;
            break;
        }

        if (onPopStart) onPopStart();

        playAudio(audioPath, () => {
          if (onPopEnd) onPopEnd();
          if (!isUnmountedRef.current) resolve();
        });
      });
    },
    [numberAudioSrc, ballsAudioSrc, playAudio],
  );

  // ─── Play Tap Prompt Audio ───────────────────────────────────
  const playTapPromptAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (isUnmountedRef.current) {
        resolve();
        return;
      }

      setIsTapAudioPlaying(true);

      playAudio(TapAudio, () => {
        setIsTapAudioPlaying(false);
        if (!isUnmountedRef.current) resolve();
      });
    });
  }, [playAudio, TapAudio]);

  // ─── Play Celebration Audio ──────────────────────────────────
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

  // ─── Auto Bounce Sequence ────────────────────────────────────
  const runAutoBounce = useCallback(
    async (target: "number" | "balls") => {
      return new Promise<void>((resolve) => {
        if (isUnmountedRef.current) {
          resolve();
          return;
        }
        if (target === "number") {
          setNumberPlaying(true);
          setNumberPop(true);
          playItemAudio(
            "auto-number",
            () => {},
            () => {
              setNumberPop(false);
              setNumberPlaying(false);
              resolve();
            },
          );
        } else {
          setBallsPlaying(true);
          setBallsPop(true);
          playItemAudio(
            "auto-balls",
            () => {},
            () => {
              setBallsPop(false);
              setBallsPlaying(false);
              resolve();
            },
          );
        }
      });
    },
    [playItemAudio],
  );

  // ─── Start Game Sequence ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "assistant" || !showAssistant) return;

    setIsLocked(true);

    const startSequence = async () => {
      // STEP 1: Assistant audio
      await playAssistantAudio();
      if (!isMountedRef.current || isUnmountedRef.current) return;

      // STEP 2: Fade out assistant
      setAssistantFading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      setShowAssistant(false);
      setAssistantFading(false);
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      // STEP 3: Show game (number + balls)
      setShowGame(true);
      setPhase("game");
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      // STEP 4: Auto bounces
      await runAutoBounce("number");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("balls");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("number");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("balls");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      // STEP 5: Tap prompt
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

  // ─── Start Cycle ─────────────────────────────────────────────
  const startCycle = useCallback(() => {
    numberTappedRef.current = false;
    ballsTappedRef.current = false;
    setIsCycleComplete(false);
    setCurrentTarget("number");
    setShowFinger(true);
    setIsLocked(false);
  }, []);

  // ─── Go to next lesson ───────────────────────────────────────
  const goToNextLesson = useCallback(async () => {
    stopAllAudio();

    if (onComplete) {
      onComplete();
      return;
    }
    navigate({
      to: "/levels",
      search: {
        subject: subject || "math",
        level: level || 1,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, onComplete, stopAllAudio]);

  // ─── Handle Tap ──────────────────────────────────────────────
  const handleTap = useCallback(
    async (target: "number" | "balls") => {
      if (isLocked || isPlayingRef.current || isTapAudioPlaying) return;
      if (target !== currentTarget) return;
      if (isUnmountedRef.current) return;

      setShowFinger(false);

      if (target === "number") {
        if (numberTappedRef.current) return;
        numberTappedRef.current = true;

        setNumberPlaying(true);
        setNumberPop(true);
        await playItemAudio(
          "tap-number",
          () => {},
          () => {
            setNumberPop(false);
            setNumberPlaying(false);
          },
        );
      } else {
        if (ballsTappedRef.current) return;
        ballsTappedRef.current = true;

        setBallsPlaying(true);
        setBallsPop(true);
        await playItemAudio(
          "tap-balls",
          () => {},
          () => {
            setBallsPop(false);
            setBallsPlaying(false);
          },
        );
      }

      if (numberTappedRef.current && ballsTappedRef.current) {
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
              const summary = `${studentName} watched the number '${numberChar}' introduction completely.`;

              try {
                await saveProgress({
                  studentId: session.student.studentId,
                  deviceToken: session.student.token,
                  subject: subject || "math",
                  level: level || 1,
                  lessonId: lessonId || 1,
                  status: "completed",
                  timeSpentSec: elapsed,
                  summary,
                  gameData: {
                    numberTapped: true,
                    ballsTapped: true,
                    completed: true,
                  },
                });
                console.log("✅ [MathIntro] Progress saved (completed)");
              } catch (err) {
                console.warn("[MathIntro] Save completed failed:", err);
              }
            }

            await goToNextLesson();
          }, 500);
        }, 400);
      } else {
        setCurrentTarget(target === "number" ? "balls" : "number");
        setShowFinger(true);
      }
    },
    [
      isLocked,
      isTapAudioPlaying,
      currentTarget,
      playItemAudio,
      playCelebrationAudio,
      goToNextLesson,
      subject,
      level,
      lessonId,
      numberChar,
    ],
  );

  const handleNumberTouch = () => {
    handleTap("number");
  };

  const handleBallsTouch = () => {
    handleTap("balls");
  };

  // ─── Finger Indicator ────────────────────────────────────────
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

  // ─── Number Style Helper ─────────────────────────────────────
  const getNumberStyle = (isPlaying: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
      fontWeight: 400,
      fontSize: "min(50vh, 450px)",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      letterSpacing: "0.02em",
      transition: "color 0.15s ease",
      textShadow: "0 4px 12px rgba(0,0,0,0.08)",
    };

    if (isPlaying) {
      return {
        ...base,
        background: NUMBER_PLAYING_GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      };
    }

    return {
      ...base,
      color: NUMBER_COLOR,
    };
  };

  // ═══════════════════════════════════════════════════════════
  //  ⚽ CSS BALLS — SAME LAYOUT AS NUMBER MATCHING OBJECTS
  // ═══════════════════════════════════════════════════════════

  const renderBalls = (count: number) => {
    if (count === 0) {
      return <div className="w-full h-full" />;
    }

    const PADDING = 4;

    // ═══ 1 BALL ═══
    if (count === 1) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            className="mi-ball"
            style={{
              width: "62%",
              aspectRatio: "1 / 1",
              maxHeight: "100%",
            }}
          />
        </div>
      );
    }

    // ═══ 2 BALLS ═══
    if (count === 2) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "2%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="mi-ball"
              style={{
                width: "45%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          ))}
        </div>
      );
    }

    // ═══ 3 BALLS ═══ 2 top + 1 center
    if (count === 3) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "45%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "50%",
            }}
          >
            <div
              className="mi-ball"
              style={{
                width: "45%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>
      );
    }

    // ═══ 4 BALLS ═══ 2×2
    if (count === 4) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "50%",
              }}
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="mi-ball"
                  style={{
                    width: "45%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ═══ 5 BALLS ═══ 3 top + 2 bottom centered
    if (count === 5) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "30%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "50%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "30%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ═══ 6 BALLS ═══ 3×2
    if (count === 6) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "50%",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="mi-ball"
                  style={{
                    width: "30%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ═══ 7 BALLS ═══ 3 top + 3 middle + 1 center bottom
    if (count === 7) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "33%",
            }}
          >
            <div
              className="mi-ball"
              style={{
                width: "28%",
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>
      );
    }

    // ═══ 8 BALLS ═══ 3 top + 3 middle + 2 center bottom
    if (count === 8) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "2%",
              width: "100%",
              height: "33%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="mi-ball"
                style={{
                  width: "28%",
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ═══ 9 BALLS ═══ 3×3
    if (count === 9) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3%",
            padding: `${PADDING}%`,
            boxSizing: "border-box",
          }}
        >
          {[0, 1, 2].map((rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2%",
                width: "100%",
                height: "33%",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="mi-ball"
                  style={{
                    width: "28%",
                    aspectRatio: "1 / 1",
                    maxHeight: "100%",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Fallback
    return <div className="w-full h-full" />;
  };

  // ─── Show Assistant ──────────────────────────────────────────
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

  // ─── Show Game ───────────────────────────────────────────────
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

      {showGame && phase !== "done" && (
        <div className="ai-letters-fade-in flex items-center justify-center w-full h-full max-w-6xl gap-8 sm:gap-16">
          {/* ─── LEFT: Number ─── */}
          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "number"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${numberPop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleNumberTouch}
            onTouchStart={handleNumberTouch}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span style={getNumberStyle(numberPlaying)}>
                {numberChar}
              </span>
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "number" && !isLocked && !isTapAudioPlaying}
            />
          </div>

          {/* ─── RIGHT: CSS Balls ─── */}
          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "balls"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${ballsPop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleBallsTouch}
            onTouchStart={handleBallsTouch}
          >
            <div className="flex h-full w-full items-center justify-center">
              {renderBalls(ballCount)}
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "balls" && !isLocked && !isTapAudioPlaying}
            />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="ai-letters-fade-in flex items-center justify-center w-full h-full max-w-6xl gap-8 sm:gap-16">
          <div
            className="relative flex items-center justify-center"
            style={{ width: "45%", maxWidth: "450px", aspectRatio: "1/1", zIndex: 1 }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span style={getNumberStyle(false)}>
                {numberChar}
              </span>
            </div>
          </div>

          <div
            className="relative flex items-center justify-center"
            style={{ width: "45%", maxWidth: "450px", aspectRatio: "1/1", zIndex: 1 }}
          >
            <div className="flex h-full w-full items-center justify-center">
              {renderBalls(ballCount)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MathNumbersIntroductionBase;