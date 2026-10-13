// src/components/games/Math/Numbers-Assessment/NumbersFindMissingNumberBulkBase.tsx
// ✅ Math version of HuroofETahajjiFindMissingLetterBulkBase
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Koi celebration SVG nahi
// 🎵 Intro audio plays ONCE on lesson start (no lock, fire-and-forget)
// ✅ Koi green/red slot colors nahi — sab slots royal blue theme
// ✅ Toolbar: Undo, Redo, Clear, Check — on LEFT
// 🔥 SINGLE SESSION — saare numbers ek hi baar (no session 1 / session 2 split)
// 🔥 FIXED PATTERN: Odd-position (0, 2) filled, Even-position (1, 3) empty.
// 🔥 Numbers font: Andika
// 📝 Summary: Simple "Number X - Correct/Wrong/Missed" pattern

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Andika Font (Math standard)
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🎵 Intro audio — plays ONCE on lesson start
const introAudio = "/assets/Math Assets/Math Assessment/Find Missing Number Bulk/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

// ─── 🔥 COMPLETE NUMBER SEQUENCE (0-9) ─────────────────────
const NUMBER_SEQUENCE: string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
];

// Helper: Get index of a number in sequence
const getSequenceIndex = (num: string): number => {
  return NUMBER_SEQUENCE.indexOf(num);
};

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────────
function getSubjectColor(subject: string = "math") {
  const colors: Record<
    string,
    { cardBg: string; cardShadow: string; textColor: string; outlineColor: string }
  > = {
    math: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      textColor: ROYAL_BLUE,
      outlineColor: ROYAL_BLUE,
    },
    english: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      textColor: ROYAL_BLUE,
      outlineColor: ROYAL_BLUE,
    },
    urdu: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      textColor: ROYAL_BLUE,
      outlineColor: ROYAL_BLUE,
    },
  };
  return colors[subject] || colors.math;
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

// ─── 🔥 ANIMATION CSS ──────────────────────────────────────────
const GAME_CSS = `
  @keyframes nfml-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfml-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nfml-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes nfml-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfml-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes nfml-target-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(65, 105, 225, 0);
    }
    50% {
      transform: scale(1.03);
      box-shadow: 0 0 30px 8px rgba(65, 105, 225, 0.18);
    }
  }
  @keyframes nfml-slot-pop {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nfml-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nfml-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes nfml-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .nfml-pop-in { animation: nfml-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nfml-bounce-in { animation: nfml-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .nfml-fade-out { animation: nfml-fade-out 0.5s ease-in both; }
  .nfml-fade-in { animation: nfml-fade-in 0.5s ease-out both; }
  .nfml-drop-success { animation: nfml-drop-success 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .nfml-target-pulse { animation: nfml-target-pulse 1.8s ease-in-out infinite; }
  .nfml-slot-pop { animation: nfml-slot-pop 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nfml-tool-pop { animation: nfml-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nfml-check-pulse { animation: nfml-tool-pulse-green 1.4s ease-out infinite; }
  .nfml-card-reappear { animation: nfml-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }

  .nfml-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .nfml-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
`;

// ─── 📦 TYPES ──────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface SlotState {
  number: string | null;
  isFilled: boolean;
  isPreFilled: boolean;
}

interface HistorySnapshot {
  slotStates: SlotState[];
  options: string[];
  filledCount: number;
}

interface SlotResult {
  slotIndex: number;
  expectedNumber: string | null;
  userNumber: string | null;
  result: "correct" | "wrong" | "missed";
}

interface SessionStats {
  totalDrops: number;
  dropsRemoved: number;
  undoCount: number;
  redoCount: number;
  finalDrops: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalDrops: 0,
    dropsRemoved: 0,
    undoCount: 0,
    redoCount: 0,
    finalDrops: 0,
    timeSec: 0,
  };
}

interface SessionSnapshot {
  totalSlots: number;
  filledSlots: number;
  correctSlots: number;
  slotResults: SlotResult[];
}

type Tool = "drag" | "clear";
type TransitionPhase = "idle" | "fade-out" | "fade-in";

// ─── 📝 SUMMARY BUILDER ──────────────────────────────────────
function buildSummary(
  studentName: string,
  slotResults: SlotResult[],
  completed: boolean,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the Find Missing Number lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Find Missing Number lesson.`;

  // 🔥 Only include EMPTY slot results (missing numbers)
  const lines: string[] = [];
  slotResults.forEach((r) => {
    if (!r.expectedNumber) return;

    let status: string;
    if (r.result === "correct") status = "Correct";
    else if (r.result === "missed") status = "Missed";
    else status = "Wrong";

    lines.push(`Number ${r.expectedNumber} - ${status}`);
  });

  if (lines.length === 0) {
    return header;
  }

  return `${header}\n\n${lines.join("\n")}`;
}

// ─── 🎛️ TOOLBAR ──────────────────────────────────────────────
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
    "nfml-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "nfml-check-pulse" : ""}`}
    >
      {children}
    </button>
  );
});

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onToggleClear: () => void;
  onCheck: () => void;
  canUndo: boolean;
  canRedo: boolean;
  tool: Tool;
  hasDrops: boolean;
  canCheck: boolean;
  isTransitioning: boolean;
}

const Toolbar = React.memo(function Toolbar({
  onUndo,
  onRedo,
  onToggleClear,
  onCheck,
  canUndo,
  canRedo,
  tool,
  hasDrops,
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
          onClick={onToggleClear}
          active={tool === "clear"}
          danger={tool === "clear"}
          disabled={!hasDrops || isTransitioning}
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear drops"}
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

// ══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function NumbersFindMissingNumberBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // ─── STATE ──────────────────────────────────────────────────
  const [slotStates, setSlotStates] = useState<SlotState[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [filledCount, setFilledCount] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");
  const [isGameComplete, setIsGameComplete] = useState(false);

  const [tool, setTool] = useState<Tool>("drag");
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // ─── DRAG STATE ──────────────────────────────────────────────
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    number: string | null;
    position: { x: number; y: number } | null;
  }>({
    isDragging: false,
    number: null,
    position: null,
  });

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  // ─── PROGRESS REFS (SINGLE SESSION) ────────────────────────
  const sessionStatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const timersRef = useRef<{
    [key: string]: ReturnType<typeof setTimeout> | null;
  }>({});
  const finalSnapshotRef = useRef<SessionSnapshot | null>(null);

  // 🎵 Intro audio refs — plays ONCE on lesson start
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // 🔥 Clean numbers (dedup, MAX 4)
  const SESSION_NUMBERS = useMemo(() => {
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const n of letters) {
      if (!n) continue;
      const key = String(n);
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(key);
    }
    return clean.slice(0, 4);
  }, [letters]);

  // ─── 🔥 BUILD SESSION CONFIG FROM NUMBERS ──────────────────
  const buildSessionConfig = useCallback((sessionNumbers: string[]) => {
    const slots: string[] = [];
    const correct: string[] = [];

    for (let i = 0; i < sessionNumbers.length; i++) {
      if (i % 2 === 0) {
        slots.push(sessionNumbers[i]);
      } else {
        slots.push("");
        correct.push(sessionNumbers[i]);
      }
    }

    const sessionSet = new Set(sessionNumbers);
    const distractors: string[] = [];

    correct.forEach((num) => {
      const idx = getSequenceIndex(num);
      if (idx === -1) return;

      const candidates = [
        NUMBER_SEQUENCE[idx - 2],
        NUMBER_SEQUENCE[idx - 1],
        NUMBER_SEQUENCE[idx + 1],
        NUMBER_SEQUENCE[idx + 2],
      ].filter(Boolean);

      candidates.forEach((c) => {
        if (
          !sessionSet.has(c) &&
          !correct.includes(c) &&
          !distractors.includes(c) &&
          distractors.length < 4
        ) {
          distractors.push(c);
        }
      });
    });

    if (distractors.length < 4) {
      for (const ch of NUMBER_SEQUENCE) {
        if (
          !sessionSet.has(ch) &&
          !correct.includes(ch) &&
          !distractors.includes(ch)
        ) {
          distractors.push(ch);
          if (distractors.length >= 4) break;
        }
      }
    }

    return {
      slots,
      correct,
      distractors,
    };
  }, []);

  // ─── SHUFFLE ──────────────────────────────────────────────────
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // ─── FONT SIZE HELPERS ──────────────────────────────────────
  const getSlotFontSize = useCallback((_num: string): string => {
    return "clamp(2.5rem, 11vh, 5.5rem)";
  }, []);

  const getOptionFontSize = useCallback((_num: string): string => {
    return "clamp(2.2rem, 10vh, 5rem)";
  }, []);

  // ─── GRID COLS ──────────────────────────────────────────────
  const getSlotGridCols = useCallback(() => {
    const count = slotStates.length;
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-4";
  }, [slotStates.length]);

  const getOptionGridCols = useCallback(() => {
    const count = options.length;
    if (count === 6) return "grid-cols-6";
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-6";
  }, [options.length]);

  // ══════════════════════════════════════════════════════════════
  //  🎵 INTRO AUDIO — plays ONCE on lesson start (no lock)
  // ══════════════════════════════════════════════════════════════

  const stopIntroAudio = useCallback(() => {
    const audio = introAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
    introAudioRef.current = null;
  }, []);

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;
    if (!introAudio) return;

    introPlayedRef.current = true;
    stopIntroAudio();

    try {
      const audio = new Audio(introAudio);
      audio.preload = "auto";
      introAudioRef.current = audio;

      const cleanup = () => {
        try {
          audio.onended = null;
          audio.onerror = null;
        } catch {}
        if (introAudioRef.current === audio) {
          introAudioRef.current = null;
        }
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      audio.play().catch(() => {
        cleanup();
      });
    } catch {
      introAudioRef.current = null;
    }
  }, [stopIntroAudio]);

  // ─── INITIALIZE GAME ──────────────────────────────────────────
  const initializeGame = useCallback(() => {
    const config = buildSessionConfig(SESSION_NUMBERS);
    const slots = config.slots;
    const correctNumbers = config.correct;
    const distractors = config.distractors;

    const newSlotStates: SlotState[] = slots.map((num: string) => ({
      number: num || null,
      isFilled: !!num,
      isPreFilled: !!num,
    }));

    const preFilledNumbers = slots.filter((s: string) => s !== "");

    let allOptions: string[] = [...correctNumbers];
    const uniqueDistractors = distractors.filter(
      (d: string) => !correctNumbers.includes(d),
    );
    allOptions = [...allOptions, ...uniqueDistractors];
    allOptions = allOptions.filter(
      (num: string) => !preFilledNumbers.includes(num),
    );

    const uniqueOptions = [...new Set(allOptions)];
    let finalOptions = shuffleArray(uniqueOptions);

    if (finalOptions.length < 6) {
      for (const ch of NUMBER_SEQUENCE) {
        if (
          !finalOptions.includes(ch) &&
          !preFilledNumbers.includes(ch)
        ) {
          finalOptions.push(ch);
          if (finalOptions.length >= 6) break;
        }
      }
    }
    finalOptions = finalOptions.slice(0, 6);

    setSlotStates(newSlotStates);
    setOptions(finalOptions);
    setFilledCount(newSlotStates.filter((s) => s.isFilled).length);
    setTotalCorrect(correctNumbers.length);
    setUndoStack([]);
    setRedoStack([]);
    setTool("drag");
    setHoveredSlotIndex(null);
    setDragState({ isDragging: false, number: null, position: null });
    setTransitionPhase("idle");
    setIsGameComplete(false);

    sessionStatsRef.current = emptyStats();
    sessionStartTimeRef.current = Date.now();
  }, [SESSION_NUMBERS, buildSessionConfig, shuffleArray]);

  // ─── INITIALIZE ON MOUNT ────────────────────────────────────
  useEffect(() => {
    initializeGame();

    // 🎵 Play intro ONCE on lesson start (after layout settles)
    const introTimer = setTimeout(() => {
      playIntroAudio();
    }, 300);

    return () => {
      clearTimeout(introTimer);
      stopIntroAudio();
      Object.values(timersRef.current).forEach((t) => clearTimeout(t as any));
      if (!progressSavedRef.current) {
        savePartialProgressRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── HISTORY HELPERS ─────────────────────────────────────────
  const pushUndo = useCallback(
    (
      currentSlots: SlotState[],
      currentOptions: string[],
      currentFilled: number,
    ) => {
      setUndoStack((prev) => [
        ...prev,
        {
          slotStates: currentSlots.map((s) => ({ ...s })),
          options: [...currentOptions],
          filledCount: currentFilled,
        },
      ]);
      setRedoStack([]);
    },
    [],
  );

  // ─── COUNT FILLED EMPTY SLOTS ────────────────────────────────
  const totalEmptySlots = useMemo(() => {
    return slotStates.filter((s) => !s.isPreFilled).length;
  }, [slotStates]);

  const filledEmptySlots = useMemo(() => {
    return slotStates.filter((s) => !s.isPreFilled && s.isFilled).length;
  }, [slotStates]);

  // ─── CAN CHECK ───────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (totalEmptySlots === 0) return false;
    return filledEmptySlots >= totalEmptySlots;
  }, [totalEmptySlots, filledEmptySlots]);

  // ─── CHECK ───────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    stopIntroAudio();

    const stats = sessionStatsRef.current;
    stats.finalDrops = filledEmptySlots;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    // Build slot results
    const config = buildSessionConfig(SESSION_NUMBERS);

    const slotResults: SlotResult[] = slotStates.map((slot, i) => {
      const isPreFilled = slot.isPreFilled;

      let expectedNumber: string | null = null;
      if (!isPreFilled) {
        const emptyIndices: number[] = [];
        config.slots.forEach((s: string, idx: number) => {
          if (s === "") emptyIndices.push(idx);
        });
        const emptyOrder = emptyIndices.indexOf(i);
        if (emptyOrder !== -1 && config.correct[emptyOrder]) {
          expectedNumber = config.correct[emptyOrder];
        }
      }

      const userNumber = slot.isFilled ? slot.number : null;

      let result: SlotResult["result"];
      if (isPreFilled) {
        result = "correct";
      } else if (!userNumber) {
        result = "missed";
      } else if (userNumber === expectedNumber) {
        result = "correct";
      } else {
        result = "wrong";
      }

      return {
        slotIndex: i,
        expectedNumber,
        userNumber,
        result,
      };
    });

    const correctSlots = slotResults.filter(
      (r) => r.result === "correct",
    ).length;

    finalSnapshotRef.current = {
      totalSlots: slotStates.length,
      filledSlots: filledCount,
      correctSlots,
      slotResults,
    };

    setIsGameComplete(true);
    saveFinalProgress();

    timersRef.current["navigate"] = setTimeout(() => {
      navigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    }, 500);
  }, [
    canCheck,
    transitionPhase,
    slotStates,
    filledCount,
    filledEmptySlots,
    buildSessionConfig,
    SESSION_NUMBERS,
    navigate,
    subject,
    level,
    lessonId,
    stopIntroAudio,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s = finalSnapshotRef.current;

      return {
        type: "numbers-find-missing-number-bulk",
        lessonType: "find-missing",
        numbers: SESSION_NUMBERS,
        totalSlots: s?.totalSlots ?? 0,
        filledSlots: s?.filledSlots ?? 0,
        correctSlots: s?.correctSlots ?? 0,
        slotResults: s?.slotResults ?? [],
        stats: { ...sessionStatsRef.current },
        completed,
      };
    },
    [SESSION_NUMBERS],
  );

  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const stats = sessionStatsRef.current;
    const studentName = sessionData.student.studentName || "Student";
    const slotResults = finalSnapshotRef.current?.slotResults ?? [];

    // 🔥 NEW SUMMARY
    const summary = buildSummary(studentName, slotResults, true);

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject,
      level,
      lessonId,
      status: "completed",
      timeSpentSec: stats.timeSec,
      summary,
      gameData: buildGameData(true),
    }).catch((err) => {
      console.error("[FindMissingBulk] Save failed:", err);
    });
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const summary = buildSummary(studentName, [], false);

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
    }).catch(() => {});
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgressRef = useRef<() => void>(() => {});
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── DRAG HANDLERS ───────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, num: string) => {
      if (transitionPhase !== "idle") return;
      if (isGameComplete) return;
      if (tool === "clear") return;
      if (dragState.isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        number: num,
        position: { x: e.clientX - 40, y: e.clientY - 40 },
      });
    },
    [transitionPhase, isGameComplete, tool, dragState.isDragging],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.number) return;

      e.preventDefault();

      setDragState((prev) => ({
        ...prev,
        position: { x: e.clientX - 40, y: e.clientY - 40 },
      }));

      let hovered: number | null = null;
      slotStates.forEach((slot, index) => {
        if (slot.isFilled) return;
        const slotEl = document.querySelector(`[data-slot-index="${index}"]`);
        if (slotEl) {
          const rect = slotEl.getBoundingClientRect();
          const padding = 20;
          if (
            e.clientX >= rect.left - padding &&
            e.clientX <= rect.right + padding &&
            e.clientY >= rect.top - padding &&
            e.clientY <= rect.bottom + padding
          ) {
            hovered = index;
          }
        }
      });
      setHoveredSlotIndex(hovered);
    },
    [dragState.isDragging, dragState.number, slotStates],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.number) {
        setDragState({ isDragging: false, number: null, position: null });
        setHoveredSlotIndex(null);
        return;
      }

      const droppedNumber = dragState.number;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({ isDragging: false, number: null, position: null });
      setHoveredSlotIndex(null);

      let droppedIndex: number | null = null;
      slotStates.forEach((slot, index) => {
        if (slot.isFilled) return;
        const slotEl = document.querySelector(`[data-slot-index="${index}"]`);
        if (slotEl) {
          const rect = slotEl.getBoundingClientRect();
          const padding = 20;
          if (
            clientX >= rect.left - padding &&
            clientX <= rect.right + padding &&
            clientY >= rect.top - padding &&
            clientY <= rect.bottom + padding
          ) {
            droppedIndex = index;
          }
        }
      });

      if (droppedIndex === null) return;

      pushUndo(slotStates, options, filledCount);

      setSlotStates((prev) =>
        prev.map((slot, idx) =>
          idx === droppedIndex
            ? { ...slot, number: droppedNumber, isFilled: true }
            : slot,
        ),
      );

      setOptions((prev) => prev.filter((p) => p !== droppedNumber));
      setFilledCount((c) => c + 1);
      sessionStatsRef.current.totalDrops += 1;
    },
    [dragState, slotStates, options, filledCount, pushUndo],
  );

  // ─── CLEAR ───────────────────────────────────────────────────
  const handleSlotTap = useCallback(
    (slotIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const slot = slotStates[slotIndex];
      if (slot.isPreFilled) return;
      if (!slot.isFilled) return;

      pushUndo(slotStates, options, filledCount);

      const removedNumber = slot.number;

      setSlotStates((prev) =>
        prev.map((s, idx) =>
          idx === slotIndex ? { ...s, number: null, isFilled: false } : s,
        ),
      );

      if (removedNumber) {
        setOptions((prev) => [...prev, removedNumber]);
      }
      setFilledCount((c) => Math.max(0, c - 1));
      sessionStatsRef.current.dropsRemoved += 1;
      setTool("drag");
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      slotStates,
      options,
      filledCount,
      pushUndo,
    ],
  );

  // ─── UNDO / REDO ─────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    sessionStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [
      ...r,
      {
        slotStates: slotStates.map((s) => ({ ...s })),
        options: [...options],
        filledCount,
      },
    ]);
    setSlotStates(prev.slotStates);
    setOptions(prev.options);
    setFilledCount(prev.filledCount);
  }, [undoStack, slotStates, options, filledCount]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    sessionStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [
      ...u,
      {
        slotStates: slotStates.map((s) => ({ ...s })),
        options: [...options],
        filledCount,
      },
    ]);
    setSlotStates(next.slotStates);
    setOptions(next.options);
    setFilledCount(next.filledCount);
  }, [redoStack, slotStates, options, filledCount]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  // ─── RENDER HELPERS ──────────────────────────────────────────
  const getFadeClass = () => {
    if (transitionPhase === "fade-out") return "nfml-fade-out";
    if (transitionPhase === "fade-in") return "nfml-fade-in";
    return "";
  };

  // ─── RENDER SLOT ─────────────────────────────────────────────
  const renderSlot = (slot: SlotState, index: number) => {
    const isHovered = hoveredSlotIndex === index;
    const isFilled = slot.isFilled;
    const isToolClear = tool === "clear";

    const displayNumber = slot.number || "";
    const fontSize = getSlotFontSize(displayNumber || "1");

    if (isFilled) {
      return (
        <div
          key={`slot-${index}`}
          data-slot-index={index}
          onClick={() => handleSlotTap(index)}
          className={`
            nfml-slot-pop clay-sm relative flex flex-col items-center justify-center
            rounded-2xl border-4 border-white
            ${isToolClear && !slot.isPreFilled ? "cursor-crosshair" : "cursor-default"}
          `}
          style={{
            ["--clay-shadow" as string]: "oklch(0.4 0.18 260 / 0.9)",
            width: "100%",
            maxWidth: "160px",
            minWidth: "80px",
            aspectRatio: "1/1",
            padding: "4px",
            backgroundColor: ROYAL_BLUE,
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ overflow: "hidden" }}
          >
            <span
              style={{
                fontFamily:
                  "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: fontSize,
                color: "#FFFFFF",
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.02em",
              }}
            >
              {displayNumber}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`slot-${index}`}
        data-slot-index={index}
        className={`
          nfml-slot-pop relative flex flex-col items-center justify-center
          rounded-2xl border-4
          ${isHovered ? "nfml-target-pulse" : ""}
        `}
        style={{
          borderColor: ROYAL_BLUE,
          width: "100%",
          maxWidth: "160px",
          minWidth: "80px",
          aspectRatio: "1/1",
          padding: "4px",
          backgroundColor: "transparent",
          boxShadow: isHovered ? `0 0 30px ${ROYAL_BLUE}44` : "none",
          borderStyle: "solid",
          animation: isHovered
            ? "none"
            : "nfml-target-pulse 1.8s ease-in-out infinite",
        }}
      />
    );
  };

  // ─── RENDER OPTION ───────────────────────────────────────────
  const renderOption = (num: string, index: number) => {
    const isDraggingThis = dragState.number === num && dragState.isDragging;
    const isDisabled =
      transitionPhase !== "idle" || isGameComplete || tool === "clear";

    const fontSize = getOptionFontSize(num);

    return (
      <div
        key={`option-${index}`}
        className={`
          flex items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : "nfml-card-reappear"}
          ${isDisabled && !isDraggingThis ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDraggingThis ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          width: "100%",
          maxWidth: "130px",
          minWidth: "70px",
          aspectRatio: "1/1",
          padding: "4px",
          touchAction: "none",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onPointerDown={(e) =>
          !isDisabled && !isDraggingThis && handlePointerDown(e, num)
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && (
          <span
            style={{
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: ROYAL_BLUE,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {num}
          </span>
        )}
      </div>
    );
  };

  // ─── MAIN RENDER ────────────────────────────────────────────
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = filledEmptySlots > 0;
  const isTransitioning = transitionPhase !== "idle";

  return (
    <div
      ref={boardRef}
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getFadeClass()}`}
      style={{ touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* ─── TOOLBAR ─────────────────────────────────────── */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleClear={handleToggleClear}
        onCheck={handleCheck}
        canUndo={canUndo}
        canRedo={canRedo}
        tool={tool}
        hasDrops={hasDrops}
        canCheck={canCheck}
        isTransitioning={isTransitioning}
      />

      {/* ─── BOARD (LTR for Math) ─────────────────────────── */}
      <div
        dir="ltr"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
      >
        {/* ─── SLOTS (top) ──────────────────────────────── */}
        <div className="flex w-full flex-1 items-center justify-center px-4">
          <div
            className={`grid ${getSlotGridCols()} gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}
          >
            {slotStates.map((slot, index) => renderSlot(slot, index))}
          </div>
        </div>

        {/* ─── OPTIONS (bottom) ─────────────────────────── */}
        <div className="flex w-full items-center justify-center pb-2">
          <div
            className={`grid ${getOptionGridCols()} gap-2 sm:gap-3 w-full max-w-3xl place-items-center`}
          >
            {options.map((num, index) => renderOption(num, index))}
          </div>
        </div>
      </div>

      {/* ─── FLOATING DRAGGED NUMBER ─────────────────────────── */}
      {dragState.isDragging && dragState.number && dragState.position && (
        <span
          className="fixed pointer-events-none z-[60] select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: getOptionFontSize(dragState.number),
            color: ROYAL_BLUE,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "0.02em",
            transform: "rotate(-5deg) scale(1.15)",
            textShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {dragState.number}
        </span>
      )}
    </div>
  );
}

export default NumbersFindMissingNumberBulkBase;