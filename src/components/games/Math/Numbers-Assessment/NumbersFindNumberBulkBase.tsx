// src/components/games/Math/Numbers-Assessment/NumbersFindNumberBulkBase.tsx
// ✅ Math version of HuroofETahajjiFindLetterBulkBase
// 🔥 Har number ek alag session:
//    Level 21 → 1,2,3,4  = 4 sessions
//    Level 22 → 5,6,7,8  = 4 sessions
//    Level 23 → 9,0      = 2 sessions
// 🔥 SILENT gameplay — koi correct/wrong feedback NAHI
// 🎵 Intro audios from: src/assets/Math Assets/Math Find Numbers/{0-9}.wav
// 🔥 ROYAL BLUE theme
// 🔥 Undo / Redo / Clear / Check toolbar
// 🔓 NO LOCK — board interactive from frame 1
// 📝 Summary: Simple "Number X - Correct/Wrong/Missed" pattern

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Andika Font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎵 MATH FIND NUMBERS — INTRO AUDIOS (har number ki apni)
//  Folder: src/assets/Math Assets/Math Find Numbers/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const FIND_NUMBER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Math Find Numbers/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildFindNumberAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(FIND_NUMBER_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const FIND_NUMBER_AUDIO: Record<string, string> = buildFindNumberAudioMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 MATH DISTRACTORS MAP
// ═══════════════════════════════════════════════════════════════

const MATH_DISTRACTORS_MAP: Record<string, string[]> = {
  "0": ["8", "6", "9"],
  "1": ["7", "4", "2"],
  "2": ["7", "3", "5"],
  "3": ["8", "5", "2"],
  "4": ["1", "9", "7"],
  "5": ["6", "3", "8"],
  "6": ["5", "8", "9"],
  "7": ["1", "2", "4"],
  "8": ["0", "6", "3"],
  "9": ["4", "7", "0"],
};

// ═══════════════════════════════════════════════════════════════
//  🔥 ROYAL BLUE THEME
// ═══════════════════════════════════════════════════════════════

const ROYAL_BLUE = "#4169E1";
const ROYAL_BLUE_SHADOW = "oklch(0.4 0.18 260 / 0.9)";

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT CSS
// ═══════════════════════════════════════════════════════════════

const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  🎬 GAME CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes nfnb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfnb-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes nfnb-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfnb-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes nfnb-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfnb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nfnb-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }

  .nfnb-pop-in { animation: nfnb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nfnb-card-select { animation: nfnb-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nfnb-reset-bounce { animation: nfnb-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nfnb-fade-out { animation: nfnb-fade-out 0.5s ease-in both; }
  .nfnb-fade-in { animation: nfnb-fade-in 0.5s ease-out both; }
  .nfnb-tool-pop { animation: nfnb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nfnb-check-pulse { animation: nfnb-tool-pulse-green 1.4s ease-out infinite; }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

type TransitionPhase = "idle" | "fade-out" | "fade-in";

interface SelectionResult {
  sessionNum: number;
  targetNumber: string;
  allOptions: string[];
  userSelected: string | null;
  isCorrect: boolean;
  timeSec: number;
}

interface SessionStats {
  totalSelections: number;
  undoCount: number;
  redoCount: number;
  clearCount: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalSelections: 0,
    undoCount: 0,
    redoCount: 0,
    clearCount: 0,
    timeSec: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — Simple per-number Correct/Wrong/Missed
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  sessionNumbers: string[],
  results: Record<number, SelectionResult>,
  completed: boolean,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the Find Number lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Find Number lesson.`;

  // 🔥 Per-number lines
  const lines: string[] = [];
  sessionNumbers.forEach((num, idx) => {
    const result = results[idx];

    let status: string;
    if (!result || !result.userSelected) {
      status = "Missed";
    } else if (result.isCorrect) {
      status = "Correct";
    } else {
      status = "Wrong";
    }

    lines.push(`Number ${num} - ${status}`);
  });

  return `${header}\n\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 OPTION GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateOptions(
  targetNumber: string,
): { picks: string[]; allOptions: string[] } {
  const fixedDistractors = MATH_DISTRACTORS_MAP[targetNumber] || ["1", "2", "3"];

  const wrongPicks = [...fixedDistractors].slice(0, 3);

  const picks = [targetNumber, ...wrongPicks];
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }

  return {
    picks,
    allOptions: [targetNumber, ...wrongPicks].sort(),
  };
}

// ═══════════════════════════════════════════════════════════════
//  🎛️ TOOLBAR
// ═══════════════════════════════════════════════════════════════

interface ToolButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  pulse?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

const ToolButton = React.memo(function ToolButton({
  onClick,
  disabled,
  active,
  danger,
  pulse,
  ariaLabel,
  children,
}: ToolButtonProps) {
  const base =
    "nfnb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

  let style = "border-white/60 bg-white text-slate-600 shadow";
  if (disabled) {
    style = "border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed";
  } else if (danger) {
    style = "border-white bg-red-500 text-white shadow-lg hover:bg-red-600";
  } else if (active) {
    style =
      "border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600";
  } else {
    style =
      "border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${base} ${style} ${pulse ? "nfnb-check-pulse" : ""}`}
    >
      {children}
    </button>
  );
});

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCheck: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  canCheck: boolean;
  isTransitioning: boolean;
}

const Toolbar = React.memo(function Toolbar({
  onUndo,
  onRedo,
  onClear,
  onCheck,
  canUndo,
  canRedo,
  canClear,
  canCheck,
  isTransitioning,
}: ToolbarProps) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center">
      <div className="flex h-full max-h-[500px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-[3px] border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-4 shadow-[0_6px_0_rgba(0,0,0,0.12)]">
        <ToolButton
          onClick={onUndo}
          disabled={!canUndo || isTransitioning}
          ariaLabel="Undo"
        >
          <Undo2 className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <ToolButton
          onClick={onRedo}
          disabled={!canRedo || isTransitioning}
          ariaLabel="Redo"
        >
          <Redo2 className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <div className="h-px w-10 rounded-full bg-white/40" />

        <ToolButton
          onClick={onClear}
          danger={canClear}
          disabled={!canClear || isTransitioning}
          ariaLabel="Clear selection"
        >
          <Eraser className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <div className="h-px w-10 rounded-full bg-white/40" />

        <ToolButton
          onClick={onCheck}
          active={canCheck}
          pulse={canCheck && !isTransitioning}
          disabled={!canCheck || isTransitioning}
          ariaLabel="Check"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </ToolButton>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function NumbersFindNumberBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  // 🔥 Har number = ek session (1 number per session)
  const SESSION_NUMBERS = React.useMemo(
    () => letters.filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [letters.join("|")],
  );

  const TOTAL_SESSIONS = SESSION_NUMBERS.length;

  // ─── State ──────────────────────────────────────────────────
  const [sessionIndex, setSessionIndex] = useState(0); // 0-based
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [undoStack, setUndoStack] = useState<Array<string | null>>([]);
  const [redoStack, setRedoStack] = useState<Array<string | null>>([]);

  // ─── Audio ──────────────────────────────────────────────────
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const isMountedRef = useRef(true);

  const introPlayedRef = useRef<Record<number, boolean>>({});

  // ─── Progress tracking refs ─────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  // 🔥 Session stats (per session index)
  const sessionStatsRef = useRef<Record<number, SessionStats>>({});

  // 🔥 Selection results (per session index)
  const selectionResultsRef = useRef<Record<number, SelectionResult>>({});

  // 🔥 Options snapshot per session
  const selectionOptionsRef = useRef<Record<number, string[]>>({});

  // Active stats ref
  if (!sessionStatsRef.current[sessionIndex]) {
    sessionStatsRef.current[sessionIndex] = emptyStats();
  }
  const activeStatsRef = useRef(sessionStatsRef.current[sessionIndex]);
  activeStatsRef.current = sessionStatsRef.current[sessionIndex];

  const sessionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // 🔥 Current target = current session ka number
  const currentTargetNumber = SESSION_NUMBERS[sessionIndex] || "1";

  // ═══════════════════════════════════════════════════════════
  //  🔥 AUDIO HELPERS
  // ═══════════════════════════════════════════════════════════

  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {
      // silent
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => stopAudio(audio));
    audioRefs.current = [];
  }, [stopAudio]);

  const playAudio = useCallback(
    (src: string, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();

        try {
          const audio = new Audio(src);
          audioRefs.current.push(audio);

          audio.onended = () => {
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.onerror = () => {
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          };

          audio.play().catch(() => {
            const index = audioRefs.current.indexOf(audio);
            if (index !== -1) audioRefs.current.splice(index, 1);
            if (onComplete) onComplete();
            resolve();
          });
        } catch {
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current[sessionIndex]) return;

    const audioUrl = FIND_NUMBER_AUDIO[currentTargetNumber];

    if (!audioUrl) {
      console.warn(`[FindNumberBulk] No audio for number: ${currentTargetNumber}`);
      return;
    }

    introPlayedRef.current[sessionIndex] = true;
    playAudio(audioUrl);
  }, [sessionIndex, currentTargetNumber, playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  useEffect(() => {
    playIntroAudioRef.current = playIntroAudio;
  }, [playIntroAudio]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 SELECTION INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  const initializeSelection = useCallback(
    (sessionIdx: number) => {
      const target = SESSION_NUMBERS[sessionIdx];
      if (!target) return;

      const { picks, allOptions } = generateOptions(target);

      setOptions(picks);
      setSelected(null);
      setUndoStack([]);
      setRedoStack([]);
      setResetKey((prev) => prev + 1);
      setTransitionPhase("idle");

      selectionOptionsRef.current[sessionIdx] = allOptions;

      sessionStartTimeRef.current = Date.now();
    },
    [SESSION_NUMBERS],
  );

  // ─── Mount ─────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    // Init all session stats
    for (let i = 0; i < TOTAL_SESSIONS; i++) {
      sessionStatsRef.current[i] = emptyStats();
    }

    initializeSelection(0);

    // 🎵 Play intro for first session (no lock)
    const introTimer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudioRef.current();
      }
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      if (sessionTransitionRef.current)
        clearTimeout(sessionTransitionRef.current);
      stopAllAudio();

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        );
        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || "Student";
            const summary = buildSummary(
              studentName,
              SESSION_NUMBERS,
              selectionResultsRef.current,
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
              gameData: buildGameData(false),
            }).catch((err) => {
              console.warn("[FindNumberBulk] Partial save failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 HANDLE CARD SELECT
  // ═══════════════════════════════════════════════════════════

  const isGameComplete = useCallback(() => {
    return completedRef.current;
  }, []);

  const handleCardClick = useCallback(
    (choice: string) => {
      if (isChecking) return;
      if (transitionPhase !== "idle") return;
      if (selected !== null) return;
      if (isGameComplete()) return;

      setUndoStack((prev) => [...prev, null]);
      setRedoStack([]);

      setSelected(choice);
      activeStatsRef.current.totalSelections += 1;
    },
    [isChecking, transitionPhase, selected, isGameComplete],
  );

  // ═══════════════════════════════════════════════════════════
  //  🔥 UNDO / REDO / CLEAR
  // ═══════════════════════════════════════════════════════════

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    if (isChecking) return;
    if (selected === null) return;

    activeStatsRef.current.undoCount += 1;

    setRedoStack((prev) => [...prev, selected]);
    setUndoStack((prev) => prev.slice(0, -1));
    setSelected(null);
  }, [undoStack.length, isChecking, selected]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    if (isChecking) return;

    activeStatsRef.current.redoCount += 1;

    const nextValue = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, null]);
    setRedoStack((prev) => prev.slice(0, -1));
    setSelected(nextValue);
  }, [redoStack, isChecking]);

  const handleClear = useCallback(() => {
    if (selected === null) return;
    if (isChecking) return;

    activeStatsRef.current.clearCount += 1;
    setUndoStack((prev) => [...prev, selected]);
    setRedoStack([]);
    setSelected(null);
  }, [selected, isChecking]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 CHECK — Save selection, move to next session (SILENT)
  // ═══════════════════════════════════════════════════════════

  const handleCheck = useCallback(() => {
    if (selected === null) return;
    if (isChecking) return;
    if (transitionPhase !== "idle") return;

    setIsChecking(true);

    const targetNumber = currentTargetNumber;
    const isCorrect = selected === targetNumber;

    const stats = activeStatsRef.current;
    const timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );
    stats.timeSec += timeSec;

    selectionResultsRef.current[sessionIndex] = {
      sessionNum: sessionIndex + 1,
      targetNumber,
      allOptions: selectionOptionsRef.current[sessionIndex] || [],
      userSelected: selected,
      isCorrect,
      timeSec,
    };

    // 🔥 Next session or finish
    setTimeout(() => {
      if (!isMountedRef.current) return;

      const isLastSession = sessionIndex >= TOTAL_SESSIONS - 1;

      // Case A: Next session
      if (!isLastSession) {
        const nextSessionIdx = sessionIndex + 1;
        setTransitionPhase("fade-out");
        sessionTransitionRef.current = setTimeout(() => {
          setSessionIndex(nextSessionIdx);
          initializeSelection(nextSessionIdx);
          setTransitionPhase("fade-in");

          setTimeout(() => {
            if (!isMountedRef.current) return;
            setTransitionPhase("idle");
            setIsChecking(false);

            setTimeout(() => {
              if (isMountedRef.current) {
                playIntroAudioRef.current();
              }
            }, 300);
          }, 500);
        }, 500);
        return;
      }

      // Case B: All sessions complete → Save + Navigate
      setTransitionPhase("fade-out");
      sessionTransitionRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        completedRef.current = true;

        if (!progressSavedRef.current) {
          progressSavedRef.current = true;

          const totalElapsed = Math.floor(
            (Date.now() - sessionStartTimeRef.current) / 1000,
          );
          const sessionData = getSession();

          if (sessionData?.student) {
            const totalTimeSec = Object.values(sessionStatsRef.current).reduce(
              (sum, s) => sum + (s?.timeSec || 0),
              0,
            );
            const studentName = sessionData.student.studentName || "Student";

            // 🔥 NEW SUMMARY
            const summary = buildSummary(
              studentName,
              SESSION_NUMBERS,
              selectionResultsRef.current,
              true,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject,
              level,
              lessonId,
              status: "completed",
              timeSpentSec: totalTimeSec || totalElapsed,
              summary,
              gameData: buildGameData(true),
            }).catch((err) => {
              console.warn("[FindNumberBulk] Final save failed:", err);
            });
          }
        }

        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      }, 500);
    }, 300);
  }, [
    selected,
    isChecking,
    transitionPhase,
    currentTargetNumber,
    sessionIndex,
    TOTAL_SESSIONS,
    SESSION_NUMBERS,
    initializeSelection,
    navigate,
    subject,
    level,
    lessonId,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 BUILD GAME DATA
  // ═══════════════════════════════════════════════════════════

  const buildGameData = useCallback(
    (completed: boolean) => {
      const sessions = SESSION_NUMBERS.map((targetNumber, idx) => {
        const sessionNum = idx + 1;
        const result = selectionResultsRef.current[idx];

        return {
          sessionNum,
          stats: { ...(sessionStatsRef.current[idx] || emptyStats()) },
          selections: [
            {
              selectionNum: 1,
              targetNumber: result?.targetNumber ?? targetNumber,
              allOptions: selectionOptionsRef.current[idx] || [],
              userSelected: result?.userSelected ?? null,
              isCorrect: result?.isCorrect ?? false,
              timeSec: result?.timeSec ?? 0,
            },
          ],
        };
      });

      return {
        type: "numbers-find-number-bulk",
        lessonType: "find-number",
        sessions,
        completed,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [SESSION_NUMBERS],
  );

  // ═══════════════════════════════════════════════════════════
  //  🎨 RENDER CARD
  // ═══════════════════════════════════════════════════════════

  const renderCard = (opt: string, index: number) => {
    const isSelected = selected === opt;

    const bgColor = isSelected ? ROYAL_BLUE : "transparent";
    const borderColor = isSelected ? "#FFFFFF" : ROYAL_BLUE;
    const textColor = isSelected ? "#FFFFFF" : ROYAL_BLUE;
    const shadowColor = isSelected ? ROYAL_BLUE_SHADOW : "transparent";

    const fontSize = "min(20vh, 150px)";

    const bounceClass = resetKey > 0 ? "nfnb-reset-bounce" : "nfnb-pop-in";
    const cardSelectClass = isSelected ? "nfnb-card-select" : "";

    const isDisabled =
      isChecking || transitionPhase !== "idle" || isGameComplete();

    let cursorClass = "cursor-pointer";
    if (isDisabled) cursorClass = "cursor-not-allowed";
    else if (isSelected) cursorClass = "cursor-default";

    return (
      <button
        key={`${opt}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(opt)}
        disabled={isDisabled}
        className={`
          ${bounceClass} ${cardSelectClass} clay-sm relative flex items-center justify-center
          rounded-3xl border-4 transition-all duration-200
          ${cursorClass}
          ${isDisabled && !isSelected ? "opacity-60" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "180px",
          height: "180px",
          overflow: "visible",
          backgroundColor: bgColor,
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor: borderColor,
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
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: textColor,
              textShadow: isSelected
                ? "0 2px 8px rgba(0,0,0,0.25)"
                : "0 2px 8px rgba(65, 105, 225, 0.15)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              overflow: "visible",
              transition: "color 0.2s ease",
            }}
          >
            {opt}
          </span>
        </div>
      </button>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "nfnb-fade-out";
    if (transitionPhase === "fade-in") return "nfnb-fade-in";
    return "";
  };

  const canUndo = undoStack.length > 0 && selected !== null;
  const canRedo = redoStack.length > 0 && selected === null;
  const canClear = selected !== null;
  const canCheck = selected !== null;
  const isTransitioning = transitionPhase !== "idle";

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* ─── TOOLBAR (LEFT) ──────────────────────────────── */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onCheck={handleCheck}
        canUndo={canUndo}
        canRedo={canRedo}
        canClear={canClear}
        canCheck={canCheck}
        isTransitioning={isTransitioning}
      />

      {/* ─── BOARD ───────────────────────────────────────── */}
      <div
        className="relative flex flex-1 select-none flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud p-6"
      >
        <div
          className={`flex flex-wrap items-center justify-center gap-3 max-w-4xl w-full ${
            isChecking ? "pointer-events-none" : ""
          }`}
        >
          {options.map((opt, index) => renderCard(opt, index))}
        </div>
      </div>
    </div>
  );
}

export default NumbersFindNumberBulkBase;