// src/components/games/English/Alphabet-MakeLetterPair/AlphabetMakeLetterPairBase.tsx
// ✅ Progress saving ENABLED
// ✅ Cards = Royal Blue, Text = White
// ✅ Summary: Attempt-wise tracking (wrong count only)
// ✅ On complete → navigate to /levels popup

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

// SVGs
const CelebrationSVG = "/assets/Celebration.svg";

// Audio
const correctMP3 = "/assets/Audios/correct.mp3";
const correctWAV = "/assets/Audios/correct.wav";
const wrongMP3 = "/assets/Audios/wrong.mp3";
const wrongWAV = "/assets/Audios/wrong.wav";
const MakeLetterPairIntroAudio = "/assets/English Revision Audios/MakeLetterPair.wav";

// 🔥 Progress sync imports
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
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
    idleBg: "#CC6B2C",
    shadow: "oklch(0.4 0.18 40 / 0.85)",
    textColor: "#CC6B2C",
  },
};

function getSubjectColor(subject: string = "english") {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.english;
}

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
      border-color: #4D82F6; 
      box-shadow: 0 0 0 0 rgba(77, 130, 246, 0);
      transform: scale(1);
    }
    50% { 
      border-color: #2a5fc7; 
      box-shadow: 0 0 20px 4px rgba(77, 130, 246, 0.15);
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

interface Props {
  letter: string;
  subject: string;
  level: number;
  lessonId: number;
}

interface BoxState {
  capital: string;
  matched: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  matchedSmall: string | null;
  isTarget: boolean;
}

type Point = { x: number; y: number };

// 🔥 Descender letters
const DESCENDER_LETTERS = new Set(["g", "j", "p", "q", "y"]);

// 🔥 FIXED DISTRACTORS MAP — 3 distractors per letter
const DISTRACTORS_MAP: Record<string, string[]> = {
  a: ["b", "c", "d"],
  b: ["a", "c", "e"],
  c: ["b", "d", "f"],
  d: ["c", "e", "g"],
  e: ["d", "f", "h"],
  f: ["e", "g", "i"],
  g: ["f", "h", "j"],
  h: ["g", "i", "k"],
  i: ["h", "j", "l"],
  j: ["i", "k", "m"],
  k: ["j", "l", "n"],
  l: ["k", "m", "o"],
  m: ["l", "n", "p"],
  n: ["m", "o", "q"],
  o: ["n", "p", "r"],
  p: ["o", "q", "s"],
  q: ["p", "r", "t"],
  r: ["q", "s", "u"],
  s: ["r", "t", "v"],
  t: ["s", "u", "w"],
  u: ["t", "v", "x"],
  v: ["u", "w", "y"],
  w: ["v", "x", "z"],
  x: ["w", "y", "a"],
  y: ["x", "z", "b"],
  z: ["y", "a", "c"],
};

// ═══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
//  - Partial:   "Student did not complete the lesson."
//  - First try: "Student successfully formed a pair of Letter Aa
//                correctly on the very first attempt."
//  - Wrong(s):  "Student made 2 wrong attempts before successfully
//                forming a pair of Letter Aa correctly on Attempt 3."
// ═══════════════════════════════════════════════════════════════

interface AttemptRecord {
  attemptNumber: number;
  letter: string;
  correct: boolean;
}

function buildSummary(
  studentName: string,
  capital: string,
  small: string,
  _options: string[],
  attempts: AttemptRecord[],
  completed: boolean,
): string {
  const pairLabel = `Letter ${capital}${small}`;

  if (!completed) {
    return `${studentName} did not complete the lesson.`;
  }

  const wrongCount = attempts.filter((a) => !a.correct).length;
  const totalAttempts = attempts.length;

  if (wrongCount === 0) {
    if (totalAttempts === 1) {
      return `${studentName} successfully formed a pair of ${pairLabel} correctly on the very first attempt.`;
    }
    return `${studentName} successfully formed a pair of ${pairLabel} correctly on Attempt ${totalAttempts}.`;
  }

  const correctAttemptNumber = wrongCount + 1;
  return `${studentName} made ${wrongCount} wrong ${wrongCount === 1 ? "attempt" : "attempts"} before successfully forming a pair of ${pairLabel} correctly on Attempt ${correctAttemptNumber}.`;
}

export function AlphabetMakeLetterPairBase({ letter, subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const capital = letter.toUpperCase();
  const correctSmall = letter.toLowerCase();
  const colors = getSubjectColor(subject);

  // ─── State ──────────────────────────────────────────────────
  const [box, setBox] = useState<BoxState>({
    capital: capital,
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

  // ─── Audio states ──────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);

  // ─── Celebration ──────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<"idle" | "pop" | "fade">("idle");

  // ─── 🔥 LOCK STATES ──────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INITIAL_LOCK_DURATION = 6000;

  const wrongLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WRONG_LOCK_DURATION = 3000;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ─── 🔥 PROGRESS TRACKING REFS ──────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const attemptsRef = useRef<AttemptRecord[]>([]);
  const currentAttemptNumberRef = useRef<number>(0);
  const optionsSnapshotRef = useRef<string[]>([]);

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

  // ─── 🔥 STOP ALL AUDIO ──────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      stopAudio(audio);
    });
    audioRefs.current = [];
    setIsAudioPlaying(false);
  }, [stopAudio]);

  // ─── 🔥 PLAY MULTIPLE AUDIOS ──────────────────────────────
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

  // ─── 🔥 PLAY SINGLE AUDIO ──────────────────────────────────
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

  // ─── Play Intro Audio ────────────────────────────────────
  const playIntroAudio = useCallback(() => {
    if (hasIntroPlayed) return;
    if (isAudioPlaying) return;
    playAudio(
      MakeLetterPairIntroAudio,
      () => {
        setHasIntroPlayed(true);
      },
      true,
    );
  }, [hasIntroPlayed, isAudioPlaying, playAudio]);

  // ─── Play Correct Audio ──────────────────────────────────
  const playCorrectAudio = useCallback((): Promise<void> => {
    return playMultipleAudios([correctMP3, correctWAV]);
  }, [playMultipleAudios]);

  // ─── Play Wrong Audio ────────────────────────────────────
  const playWrongAudio = useCallback((): Promise<void> => {
    return playMultipleAudios([wrongMP3, wrongWAV]);
  }, [playMultipleAudios]);

  // ─── ✅ Navigate to Level Popup ─────────────────────────────
  const goToLevelPopup = useCallback(() => {
    stopAllAudio();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [navigate, subject, level, stopAllAudio]);

  // ─── Build Small Letters ──────────────────────────────────
  const buildSmallLetters = useCallback(() => {
    const distractors = DISTRACTORS_MAP[correctSmall] || ["b", "c", "d"];
    const picks = [correctSmall, distractors[0], distractors[1], distractors[2]];

    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, [correctSmall]);

  // ─── Initialize Game ──────────────────────────────────────
  const initializeGame = useCallback(() => {
    setBox({
      capital: capital,
      matched: false,
      isCorrect: false,
      isWrong: false,
      matchedSmall: null,
      isTarget: true,
    });
    const initialSmallLetters = buildSmallLetters();
    setSmallLetters(initialSmallLetters);

    optionsSnapshotRef.current = [...initialSmallLetters].sort();

    setIsGameComplete(false);
    setShowCelebration(false);
    setCelebrationPhase("idle");
    setResetKey((prev) => prev + 1);
    setHoveredBox(false);
    setIsWrongLocked(false);
    setDragState({ isDragging: false, letter: null, position: null });
    stopAllAudio();
  }, [capital, buildSmallLetters, stopAllAudio]);

  // ─── Start Game Lock ──────────────────────────────────────
  const startGameLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, INITIAL_LOCK_DURATION);
  }, []);

  // ─── Initialize on mount ─────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    currentAttemptNumberRef.current = 0;

    initializeGame();
    startGameLock();

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudio();
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

      // 🔥 Save partial progress on unmount
      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000
        );

        if (elapsed >= 1) {
          const session = getSession();
          if (session?.student) {
            progressSavedRef.current = true;

            const studentName = session.student.studentName || "Student";
            const attempts = attemptsRef.current;

            const summary = buildSummary(
              studentName,
              capital,
              correctSmall,
              optionsSnapshotRef.current,
              attempts,
              false,
            );

            const wrongLetters = attempts
              .filter((a) => !a.correct)
              .map((a) => a.letter);

            saveProgress({
              studentId: session.student.studentId,
              deviceToken: session.student.token,
              subject,
              level,
              lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                capitalLetter: capital,
                smallLetter: correctSmall,
                options: optionsSnapshotRef.current,
                totalAttempts: attempts.length,
                wrongAttempts: wrongLetters.length,
                wrongLetters,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[MakeLetterPair] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Get Pointer Position ─────────────────────────────────
  const getPointerPosition = useCallback((e: React.PointerEvent | PointerEvent): Point => {
    return { x: e.clientX - 50, y: e.clientY - 50 };
  }, []);

  // ─── Handle Pointer Down ─────────────────────────────────
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

  // ─── Handle Pointer Move ─────────────────────────────────
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

  // ─── Handle Pointer Up (WITH PROGRESS SAVE) ───────────────
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
        const isCorrect = droppedLetter === correctSmall;

        currentAttemptNumberRef.current += 1;
        const attemptNumber = currentAttemptNumberRef.current;

        attemptsRef.current.push({
          attemptNumber,
          letter: droppedLetter,
          correct: isCorrect,
        });

        if (isCorrect) {
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
              setIsGameComplete(true);

              // 🔥 Save completed progress
              if (!completedRef.current && !progressSavedRef.current) {
                completedRef.current = true;
                progressSavedRef.current = true;

                const elapsed = Math.floor(
                  (Date.now() - sessionStartTimeRef.current) / 1000
                );

                const session = getSession();
                if (session?.student) {
                  const studentName =
                    session.student.studentName || "Student";
                  const attempts = attemptsRef.current;

                  const summary = buildSummary(
                    studentName,
                    capital,
                    correctSmall,
                    optionsSnapshotRef.current,
                    attempts,
                    true,
                  );

                  const wrongLetters = attempts
                    .filter((a) => !a.correct)
                    .map((a) => a.letter);

                  try {
                    await saveProgress({
                      studentId: session.student.studentId,
                      deviceToken: session.student.token,
                      subject,
                      level,
                      lessonId,
                      status: "completed",
                      timeSpentSec: elapsed,
                      summary,
                      gameData: {
                        capitalLetter: capital,
                        smallLetter: correctSmall,
                        options: optionsSnapshotRef.current,
                        totalAttempts: attempts.length,
                        wrongAttempts: wrongLetters.length,
                        wrongLetters,
                        completed: true,
                      },
                    });
                    console.log(
                      "✅ [MakeLetterPair] Progress saved (completed)",
                    );
                  } catch (err) {
                    console.warn(
                      "[MakeLetterPair] Save completed failed:",
                      err,
                    );
                  }
                }
              }

              navigateTimerRef.current = setTimeout(() => {
                goToLevelPopup();
              }, 500);
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
      correctSmall,
      playCorrectAudio,
      playWrongAudio,
      goToLevelPopup,
      capital,
      subject,
      level,
      lessonId,
    ],
  );

  // ─── Handle Restart ──────────────────────────────────────
  const handleRestart = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (wrongLockTimerRef.current) clearTimeout(wrongLockTimerRef.current);
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    stopAllAudio();

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    attemptsRef.current = [];
    currentAttemptNumberRef.current = 0;

    initializeGame();
    startGameLock();

    setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudio();
      }
    }, 300);
  }, [initializeGame, startGameLock, playIntroAudio, stopAllAudio]);

  // ─── Get Font Size ──────────────────────────────────────
  const getFontSize = (text: string) => {
    if (text === "Ww" || text === "Mm") {
      return "clamp(4rem, 14vh, 7rem)";
    }
    return "clamp(7rem, 22vh, 12rem)";
  };

  // ─── Get Small Letter Font Size ────────────────────────────
  const getSmallFontSize = (letter: string) => {
    if (DESCENDER_LETTERS.has(letter)) {
      return "clamp(6rem, 20vh, 11rem)";
    }
    if (letter === "w" || letter === "m") {
      return "clamp(5rem, 16vh, 8rem)";
    }
    return "clamp(7rem, 22vh, 12rem)";
  };

  // ─── Render Box ───────────────────────────────────────────
  const renderBox = () => {
    const isMatched = box.matched;
    const isCorrect = box.isCorrect;
    const isWrong = box.isWrong;
    const isTarget = box.isTarget && !box.matched;

    let bgColor = "bg-transparent";
    let borderColor = "border-black";
    let textColor = colors.textColor;
    let showIcon = false;
    let IconComponent = null;
    let iconBgColor = "";
    let iconTextColor = "";
    let shadowColor = "none";
    let scaleClass = "";

    const displayText =
      (isMatched || isWrong) && box.matchedSmall
        ? `${box.capital}${box.matchedSmall}`
        : box.capital;
    const fontSize = getFontSize(displayText);

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
      borderColor = "border-blue-500";
      shadowColor = "rgba(77, 130, 246, 0.3)";
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
        }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <span
            style={{
              fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: textColor,
              textShadow: "0 2px 8px rgba(0,0,0,0.06)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease, font-size 0.2s ease",
            }}
          >
            {displayText}
          </span>
        </div>
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

  // ─── Render Small Letter ──────────────────────────────────
  const renderSmallLetter = (letter: string, index: number) => {
    const isDraggingThis = dragState.letter === letter && dragState.isDragging;
    const isUsed = !smallLetters.includes(letter);
    const isDisabled =
      isUsed || isWrongLocked || isAudioPlaying || isLocked || isGameComplete;
    const fontSize = getSmallFontSize(letter);

    const isDescender = DESCENDER_LETTERS.has(letter);
    const descenderStyle = isDescender ? { transform: "translateY(-12%)" } : {};

    return (
      <div
        key={`small-${index}`}
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
          backgroundColor: isUsed ? undefined : colors.idleBg,
        }}
        onPointerDown={(e) =>
          !isDisabled && !isDraggingThis && handlePointerDown(e, letter)
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && !isUsed && (
          <span
            style={{
              fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: "#FFFFFF",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              ...descenderStyle,
            }}
          >
            {letter}
          </span>
        )}
      </div>
    );
  };

  const gridCols = smallLetters.length === 4 ? "grid-cols-4" : "grid-cols-4";

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      ref={boardRef}
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

      {/* ─── TOP: Capital Box ─────────────────────────────────── */}
      <div className="flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}>
          {renderBox()}
        </div>
      </div>

      {/* ─── BOTTOM: Small Letters ───────────────────────────── */}
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
            fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4rem, 15vh, 8rem)",
            color: "#FFFFFF",
            lineHeight: 1,
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

export default AlphabetMakeLetterPairBase;