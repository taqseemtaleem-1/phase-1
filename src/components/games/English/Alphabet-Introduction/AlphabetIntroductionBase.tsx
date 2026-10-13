// src/components/games/English/Alphabet-Introduction/AlphabetIntroductionBase.tsx
// ✅ Progress tracking: IndexedDB save with game-specific summary
// 🔥 Summary: "{studentName} Watched Completely Letter {Aa} Introduction"
// 🎨 Gradient on audio/tap

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AssistantTalking } from "@/components/AssistantTalking";

// 🔥 Progress sync import
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 SVGs
const FingerSVG = "/assets/finger.svg";
const CelebrationSVG = "/assets/Celebration.svg";

// 🔥 Audio
const TapAudio = "/assets/Alphabet-Introduction Audios/Assistant Audio/tap.aac";
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";

// 🔥 Andika Font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🔥 Raw "/src/assets/..." paths sirf dev server par chalte hain; production build mein
// files hashed hoti hain. import.meta.glob se bundled URL milta hai (offline/PWA ke liye bhi zaroori).
const introAudioModules = import.meta.glob<string>(
  "/src/assets/Alphabet-Introduction Audios/**/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function resolveAudio(path: string): string {
  const url = introAudioModules[path];
  if (!url) console.warn(`[AlphabetIntroduction] Missing audio asset: ${path}`);
  return url ?? path;
}


interface Props {
  letter: string;
  subject?: string;
  level?: number;
  lessonId?: number;
  onComplete?: () => void;
}

type Phase = "loading" | "assistant" | "letters" | "celebration" | "done";

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

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getLetterColor(subject: string = "english"): string {
  const colors: Record<string, string> = {
    english: "#4D82F6",
    math: "#2E8B57",
    urdu: "#CC6B2C",
  };
  return colors[subject] || "#4D82F6";
}

// ─── 🔥 PLAYING GRADIENT (audio/tap) ────────────────────────
const LETTER_PLAYING_GRADIENT =
  "linear-gradient(145deg, oklch(0.78 0.18 55), oklch(0.6 0.21 40))";

// ─── MAIN COMPONENT ──────────────────────────────────────────
export function AlphabetIntroductionBase({
  letter,
  subject,
  level,
  lessonId,
  onComplete,
}: Props) {
  const navigate = useNavigate();
  const capital = letter.toUpperCase();
  const small = letter.toLowerCase();
  const letterColor = getLetterColor(subject);

  // 🔥 Letter display format (Aa, Bb, etc.)
  const letterDisplay = `${capital}${small}`;

  // ─── State ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [capitalPlaying, setCapitalPlaying] = useState(false);
  const [smallPlaying, setSmallPlaying] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showLetters, setShowLetters] = useState(false);
  const [capitalPop, setCapitalPop] = useState(false);
  const [smallPop, setSmallPop] = useState(false);
  const [assistantFading, setAssistantFading] = useState(false);

  const [showFinger, setShowFinger] = useState(false);
  const [isCycleComplete, setIsCycleComplete] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<"capital" | "small">("capital");
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

  const capitalTappedRef = useRef(false);
  const smallTappedRef = useRef(false);

  const autoBounceTimerRef = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  const isUnmountedRef = useRef(false);
  const isPlayingRef = useRef(false);

  // 🔥 Progress tracking refs
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
    const isLetterA = capital === "A";

    const audioUrls = [
      isLetterA
        ? resolveAudio(`/src/assets/Alphabet-Introduction Audios/Assistant Audio/For A.wav`)
        : resolveAudio(`/src/assets/Alphabet-Introduction Audios/Assistant Audio/For B to Z.wav`),
      resolveAudio(`/src/assets/Alphabet-Introduction Audios/Auto Bounce Capital ${capital}.wav`),
      resolveAudio(`/src/assets/Alphabet-Introduction Audios/Auto Bounce Small ${small}.wav`),
      resolveAudio(`/src/assets/Alphabet-Introduction Audios/Tap Capital ${capital}.wav`),
      resolveAudio(`/src/assets/Alphabet-Introduction Audios/Tap Small ${small}.wav`),
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
  }, [capital, small, preloadAudio, TapAudio]);

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
            const summary = `${studentName} Watched Partially Letter ${letterDisplay} Introduction`;

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject: subject || "english",
              level: level || 1,
              lessonId: lessonId || 1,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                capitalTapped: capitalTappedRef.current,
                smallTapped: smallTappedRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[AlphabetIntro] Save partial failed:", err);
            });
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

      const isLetterA = capital === "A";
      const audioPath = isLetterA
        ? resolveAudio(`/src/assets/Alphabet-Introduction Audios/Assistant Audio/For A.wav`)
        : resolveAudio(`/src/assets/Alphabet-Introduction Audios/Assistant Audio/For B to Z.wav`);

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
  }, [capital, stopAudio]);

  // ─── Play Letter Audio ───────────────────────────────────────
  const playLetterAudio = useCallback(
    (
      audioType: "auto-capital" | "auto-small" | "tap-capital" | "tap-small",
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
          case "auto-capital":
            audioPath = resolveAudio(`/src/assets/Alphabet-Introduction Audios/Auto Bounce Capital ${capital}.wav`);
            break;
          case "auto-small":
            audioPath = resolveAudio(`/src/assets/Alphabet-Introduction Audios/Auto Bounce Small ${small}.wav`);
            break;
          case "tap-capital":
            audioPath = resolveAudio(`/src/assets/Alphabet-Introduction Audios/Tap Capital ${capital}.wav`);
            break;
          case "tap-small":
            audioPath = resolveAudio(`/src/assets/Alphabet-Introduction Audios/Tap Small ${small}.wav`);
            break;
        }

        if (onPopStart) onPopStart();

        playAudio(audioPath, () => {
          if (onPopEnd) onPopEnd();
          if (!isUnmountedRef.current) resolve();
        });
      });
    },
    [capital, small, playAudio],
  );

  // ─── Play Tap Audio ──────────────────────────────────────────
  const playTapAudio = useCallback((): Promise<void> => {
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
  }, [playMultipleAudios, correctMP3, correctWAV]);

  // ─── Auto Bounce Sequence ────────────────────────────────────
  const runAutoBounce = useCallback(
    async (target: "capital" | "small") => {
      return new Promise<void>((resolve) => {
        if (isUnmountedRef.current) {
          resolve();
          return;
        }
        if (target === "capital") {
          setCapitalPlaying(true);
          setCapitalPop(true);
          playLetterAudio(
            "auto-capital",
            () => {},
            () => {
              setCapitalPop(false);
              setCapitalPlaying(false);
              resolve();
            },
          );
        } else {
          setSmallPlaying(true);
          setSmallPop(true);
          playLetterAudio(
            "auto-small",
            () => {},
            () => {
              setSmallPop(false);
              setSmallPlaying(false);
              resolve();
            },
          );
        }
      });
    },
    [playLetterAudio],
  );

  // ─── Start Game Sequence ─────────────────────────────────────
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

      await runAutoBounce("capital");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("small");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("capital");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current || isUnmountedRef.current) return;

      await runAutoBounce("small");
      if (!isMountedRef.current || isUnmountedRef.current) return;

      if (isMountedRef.current && !isUnmountedRef.current) {
        await playTapAudio();
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
  }, [phase, showAssistant, playAssistantAudio, runAutoBounce, playTapAudio]);

  // ─── Start Cycle ─────────────────────────────────────────────
  const startCycle = useCallback(() => {
    capitalTappedRef.current = false;
    smallTappedRef.current = false;
    setIsCycleComplete(false);
    setCurrentTarget("capital");
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
        subject: subject || "english",
        level: level || 1,
        openPopup: "true",
      },
    });
  }, [navigate, subject, level, onComplete, stopAllAudio]);

  // ─── Handle Tap ──────────────────────────────────────────────
  const handleTap = useCallback(
    async (target: "capital" | "small") => {
      if (isLocked || isPlayingRef.current || isTapAudioPlaying) return;
      if (target !== currentTarget) return;
      if (isUnmountedRef.current) return;

      setShowFinger(false);

      if (target === "capital") {
        if (capitalTappedRef.current) return;
        capitalTappedRef.current = true;

        setCapitalPlaying(true);
        setCapitalPop(true);
        await playLetterAudio(
          "tap-capital",
          () => {},
          () => {
            setCapitalPop(false);
            setCapitalPlaying(false);
          },
        );
      } else {
        if (smallTappedRef.current) return;
        smallTappedRef.current = true;

        setSmallPlaying(true);
        setSmallPop(true);
        await playLetterAudio(
          "tap-small",
          () => {},
          () => {
            setSmallPop(false);
            setSmallPlaying(false);
          },
        );
      }

      if (capitalTappedRef.current && smallTappedRef.current) {
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
              const summary = `${studentName} Watched Completely Letter ${letterDisplay} Introduction`;

              try {
                await saveProgress({
                  studentId: session.student.studentId,
                  deviceToken: session.student.token,
                  subject: subject || "english",
                  level: level || 1,
                  lessonId: lessonId || 1,
                  status: "completed",
                  timeSpentSec: elapsed,
                  summary,
                  gameData: {
                    capitalTapped: true,
                    smallTapped: true,
                    completed: true,
                  },
                });
                console.log("✅ [AlphabetIntro] Progress saved (completed)");
              } catch (err) {
                console.warn("[AlphabetIntro] Save completed failed:", err);
              }
            }

            await goToNextLesson();
          }, 500);
        }, 400);
      } else {
        setCurrentTarget(target === "capital" ? "small" : "capital");
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
      letterDisplay,
    ],
  );

  // ─── Touch Handlers ──────────────────────────────────────────
  const handleCapitalTouch = () => {
    handleTap("capital");
  };

  const handleSmallTouch = () => {
    handleTap("small");
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

  // ─── Letter Style Helper ─────────────────────────────────────
  //  🔥 Playing: gradient, Idle: subject color
  const getLetterStyle = (isPlaying: boolean): React.CSSProperties => {
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
        background: LETTER_PLAYING_GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      };
    }

    return {
      ...base,
      color: letterColor,
    };
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

  // ─── Show Letters ────────────────────────────────────────────
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

      {showLetters && phase !== "done" && (
        <div className="ai-letters-fade-in flex items-center justify-center w-full h-full max-w-6xl gap-8 sm:gap-16">
          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "capital"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${capitalPop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleCapitalTouch}
            onTouchStart={handleCapitalTouch}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span style={getLetterStyle(capitalPlaying)}>
                {capital}
              </span>
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "capital" && !isLocked && !isTapAudioPlaying}
            />
          </div>

          <div
            className={`relative flex items-center justify-center cursor-pointer ${
              isLocked || isPlayingRef.current || isTapAudioPlaying || currentTarget !== "small"
                ? "pointer-events-none"
                : "pointer-events-auto"
            } ${smallPop ? "ai-pop" : ""}`}
            style={{
              width: "45%",
              maxWidth: "450px",
              aspectRatio: "1/1",
              transition: "none",
              zIndex: 1,
            }}
            onClick={handleSmallTouch}
            onTouchStart={handleSmallTouch}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span style={getLetterStyle(smallPlaying)}>
                {small}
              </span>
            </div>

            <FingerIndicator
              show={showFinger && currentTarget === "small" && !isLocked && !isTapAudioPlaying}
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
              <span style={getLetterStyle(false)}>
                {capital}
              </span>
            </div>
          </div>

          <div
            className="relative flex items-center justify-center"
            style={{ width: "45%", maxWidth: "450px", aspectRatio: "1/1", zIndex: 1 }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span style={getLetterStyle(false)}>
                {small}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  🔥 EXPORTS
// ══════════════════════════════════════════════════════════════

export default AlphabetIntroductionBase;