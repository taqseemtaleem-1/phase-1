// src/components/games/English/Alphabet-Assessment/AlphabetFindMissingLetter.tsx
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Koi celebration SVG nahi, koi correct/wrong audio nahi
// ✅ Koi green/red slot colors nahi — sab slots royal blue theme
// ✅ Toolbar: Undo, Redo, Clear, Check
// ✅ User drop kare, Check dabaye, next session/lesson
// 🔥 Per-drop history + results saved for dashboard
//
// ✅ UPDATED (v2):
//    - 🔥 Intro audio plays ONCE at start (fire-and-forget, no lock)
//      Source: src/assets/English Assessment Audios/Alphabet Find Missing Letter/intro.wav
//    - Board is interactive from frame 1
//    - Session 2 does NOT replay intro audio
//
// ✅ UPDATED (v3): SUMMARY added
//    - Per-slot result: "Letter Bb - Correct" / "Letter Dd - Wrong" / "Letter Ee - Missed"
//    - Only EMPTY slots (missing letters) appear in summary
//    - Uncompleted: "Student did not complete the Find Missing Letter lesson."

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
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

// 🔥 Intro audio — plays once at the very start
const introAudio = "/assets/English Assessment Audios/Alphabet Find Missing Letter/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

// ─── 🔥 DESCENDER LETTERS ──────────────────────────────────────
const DESCENDER_LETTERS = new Set(["g", "j", "p", "q", "y"]);

// ─── 🔥 COMPLETE ALPHABET SEQUENCE ────────────────────────────
const ALPHABET_SEQUENCE = [
  "Aa", "Bb", "Cc", "Dd", "Ee", "Ff", "Gg",
  "Hh", "Ii", "Jj", "Kk", "Ll", "Mm", "Nn",
  "Oo", "Pp", "Qq", "Rr", "Ss", "Tt",
  "Uu", "Vv", "Ww", "Xx", "Yy", "Zz",
];

const getSequenceIndex = (pair: string): number => {
  return ALPHABET_SEQUENCE.indexOf(pair);
};

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────────
function getSubjectColor(subject: string = "english") {
  const colors: Record<
    string,
    { cardBg: string; cardShadow: string; textColor: string; outlineColor: string }
  > = {
    english: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      textColor: ROYAL_BLUE,
      outlineColor: ROYAL_BLUE,
    },
    math: {
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
  return colors[subject] || colors.english;
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
  @keyframes fml-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes fml-bounce-in {
    0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes fml-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes fml-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes fml-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes fml-target-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(65, 105, 225, 0);
    }
    50% {
      transform: scale(1.03);
      box-shadow: 0 0 30px 8px rgba(65, 105, 225, 0.18);
    }
  }
  @keyframes fml-slot-pop {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes fml-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes fml-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes fml-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .fml-pop-in { animation: fml-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .fml-bounce-in { animation: fml-bounce-in 0.55s cubic-bezier(.34,1.4,.64,1) both; }
  .fml-fade-out { animation: fml-fade-out 0.5s ease-in both; }
  .fml-fade-in { animation: fml-fade-in 0.5s ease-out both; }
  .fml-drop-success { animation: fml-drop-success 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .fml-target-pulse { animation: fml-target-pulse 1.8s ease-in-out infinite; }
  .fml-slot-pop { animation: fml-slot-pop 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .fml-tool-pop { animation: fml-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .fml-check-pulse { animation: fml-tool-pulse-green 1.4s ease-out infinite; }
  .fml-card-reappear { animation: fml-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }

  .fml-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .fml-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
`;

// ─── 🔥 GAME CONFIGURATION ─────────────────────────────────────
const LEVEL_CONFIGS: Record<number, any> = {
  8: {
    1: {
      slots: ["Aa", "", "Cc", ""],
      correct: ["Bb", "Dd"],
      distractors: ["Ee", "Ff", "Gg"],
    },
    2: {
      slots: ["", "Ff", "", "Hh"],
      correct: ["Ee", "Gg"],
      distractors: ["Dd", "Ii", "Jj"],
    },
  },
  16: {
    1: {
      slots: ["Hh", "", "Jj", ""],
      correct: ["Ii", "Kk"],
      distractors: ["Gg", "Ll", "Mm"],
    },
    2: {
      slots: ["Ll", "", ""],
      correct: ["Mm", "Nn"],
      distractors: ["Kk", "Oo", "Pp"],
    },
  },
  23: {
    1: {
      slots: ["Oo", "", "Qq"],
      correct: ["Pp"],
      distractors: ["Nn", "Rr", "Ss"],
    },
    2: {
      slots: ["Rr", "", "Tt"],
      correct: ["Ss"],
      distractors: ["Pp", "Qq", "Uu"],
    },
  },
  30: {
    1: {
      slots: ["Uu", "", "Ww"],
      correct: ["Vv"],
      distractors: ["Tt", "Xx", "Yy"],
    },
    2: {
      slots: ["Xx", "", "Zz"],
      correct: ["Yy"],
      distractors: ["Vv", "Ww", "Aa"],
    },
  },
};

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface SlotState {
  pair: string | null;
  isFilled: boolean;
}

// 🔥 History snapshot for undo/redo
interface HistorySnapshot {
  slotStates: SlotState[];
  options: string[];
  filledCount: number;
}

// 🔥 Per-slot result for dashboard
interface SlotResult {
  slotIndex: number;
  expectedPair: string | null;
  userPair: string | null;
  result: "correct" | "wrong" | "missed";
}

// 🔥 Session stats
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

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1Snapshot: SessionSnapshot | null,
  s2Snapshot: SessionSnapshot | null,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Find Missing Letter lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (snapshot: SessionSnapshot | null) => {
    if (!snapshot) return;
    // Only include EMPTY slots (missing letters) — skip pre-filled ones
    for (const r of snapshot.slotResults) {
      // Skip pre-filled slots (those with expectedPair where expectedPair === userPair AND it wasn't a missing slot)
      // We identify missing slots by: result is "correct" | "wrong" | "missed" AND expectedPair exists
      // The buildSlotResults already skips pre-filled with result="correct" but we want to filter them out
      // Better: only include results where the slot was originally empty (we can check by marker)
      // For simplicity: our snapshot.slotResults only contains EMPTY slot results (we'll build it that way)
      if (!r.expectedPair) continue;

      const tag = `Letter ${r.expectedPair}`;
      let status: string;
      if (r.result === "correct") status = "Correct";
      else if (r.result === "missed") status = "Missed";
      else status = "Wrong";

      lines.push(`${tag} - ${status}`);
    }
  };

  buildLines(s1Snapshot);
  buildLines(s2Snapshot);

  return lines.join("\n");
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
    "fml-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "fml-check-pulse" : ""}`}
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

// ─── 🔥 MAIN COMPONENT ─────────────────────────────────────────
export function AlphabetFindMissingLetter({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // ─── STATE ──────────────────────────────────────────────────
  const [currentSession, setCurrentSession] = useState<1 | 2>(1);
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
    pair: string | null;
    position: { x: number; y: number } | null;
  }>({
    isDragging: false,
    pair: null,
    position: null,
  });

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  // ─── PROGRESS REFS ──────────────────────────────────────────
  const s1StatsRef = useRef<SessionStats>(emptyStats());
  const s2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const timersRef = useRef<{
    [key: string]: ReturnType<typeof setTimeout> | null;
  }>({});
  const s1FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const s2FinalSnapshotRef = useRef<SessionSnapshot | null>(null);

  // 🔥 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const activeStatsRef = currentSession === 1 ? s1StatsRef : s2StatsRef;

  // ─── GET CORRECT PAIR FOR SLOT ──────────────────────────────
  const getCorrectPairForSlot = useCallback(
    (slotIndex: number, slots: string[]): string | null => {
      const slotValue = slots[slotIndex];
      if (slotValue !== "") return null;

      let prevFilled: string | null = null;
      let prevFilledIndex: number = -1;
      for (let i = slotIndex - 1; i >= 0; i--) {
        if (slots[i] !== "") {
          prevFilled = slots[i];
          prevFilledIndex = i;
          break;
        }
      }

      let nextFilled: string | null = null;
      let nextFilledIndex: number = -1;
      for (let i = slotIndex + 1; i < slots.length; i++) {
        if (slots[i] !== "") {
          nextFilled = slots[i];
          nextFilledIndex = i;
          break;
        }
      }

      let emptyPosition = 1;
      if (prevFilledIndex !== -1) {
        for (let i = prevFilledIndex + 1; i < slotIndex; i++) {
          if (slots[i] === "") {
            emptyPosition++;
          }
        }
      } else if (nextFilledIndex !== -1) {
        for (let i = 0; i < slotIndex; i++) {
          if (slots[i] === "") {
            emptyPosition++;
          }
        }
      }

      if (prevFilled) {
        const prevIndex = getSequenceIndex(prevFilled);
        const correctIndex = prevIndex + emptyPosition;
        if (correctIndex >= ALPHABET_SEQUENCE.length) return null;
        return ALPHABET_SEQUENCE[correctIndex];
      }

      if (nextFilled) {
        const nextIndex = getSequenceIndex(nextFilled);
        let totalEmpties = 0;
        for (let i = 0; i < nextFilledIndex; i++) {
          if (slots[i] === "") {
            totalEmpties++;
          }
        }
        const correctIndex = nextIndex - (totalEmpties - emptyPosition + 1);
        if (correctIndex < 0) return null;
        return ALPHABET_SEQUENCE[correctIndex];
      }

      return null;
    },
    [],
  );

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
  const getSlotFontSize = useCallback((pair: string): string => {
    if (pair === "Ww" || pair === "Mm") {
      return "clamp(2.5rem, 10vh, 5rem)";
    }
    return "clamp(3rem, 12vh, 6rem)";
  }, []);

  const getOptionFontSize = useCallback((pair: string): string => {
    if (pair === "Ww" || pair === "Mm") {
      return "clamp(2rem, 8vh, 4rem)";
    }
    return "clamp(2.5rem, 10vh, 5rem)";
  }, []);

  // ─── GRID COLS ──────────────────────────────────────────────
  const getSlotGridCols = useCallback(() => {
    const count = slotStates.length;
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
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

  // ══════════════════════════════════════════════════════════
  //  🔥 STOP INTRO AUDIO
  // ══════════════════════════════════════════════════════════
  const stopIntroAudio = useCallback(() => {
    if (!introAudioRef.current) return;
    try {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
      introAudioRef.current.onended = null;
      introAudioRef.current.onerror = null;
    } catch {}
    introAudioRef.current = null;
  }, []);

  // ══════════════════════════════════════════════════════════
  //  🔥 PLAY INTRO AUDIO
  // ══════════════════════════════════════════════════════════
  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;

    try {
      const audio = new Audio(introAudio);
      introAudioRef.current = audio;

      const finish = () => {
        introAudioRef.current = null;
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => {
        introAudioRef.current = null;
      });
    } catch {
      introAudioRef.current = null;
    }
  }, []);

  // ─── INITIALIZE GAME ──────────────────────────────────────────
  const initializeGame = useCallback(
    (sessionNum: 1 | 2) => {
      const config = LEVEL_CONFIGS[level]?.[sessionNum];
      if (!config) {
        console.error("❌ No config for session:", sessionNum);
        return;
      }

      const slots = config.slots;
      const correctLetters = config.correct;
      const distractors = config.distractors;

      const newSlotStates: SlotState[] = slots.map((pair: string) => ({
        pair: pair || null,
        isFilled: !!pair,
      }));

      const preFilledLetters = slots.filter((s: string) => s !== "");

      let allOptions: string[] = [...correctLetters];
      const uniqueDistractors = distractors.filter(
        (d: string) => !correctLetters.includes(d),
      );
      allOptions = [...allOptions, ...uniqueDistractors];
      allOptions = allOptions.filter(
        (pair: string) => !preFilledLetters.includes(pair),
      );

      const uniqueOptions = [...new Set(allOptions)];
      let finalOptions = shuffleArray(uniqueOptions);

      if (finalOptions.length < 6) {
        const extra = [
          "Zz", "Yy", "Xx", "Ww", "Vv", "Uu",
          "Tt", "Ss", "Rr", "Qq", "Pp", "Oo",
        ];
        for (const e of extra) {
          if (!finalOptions.includes(e) && !preFilledLetters.includes(e)) {
            finalOptions.push(e);
            if (finalOptions.length >= 6) break;
          }
        }
      }
      finalOptions = finalOptions.slice(0, 6);

      setSlotStates(newSlotStates);
      setOptions(finalOptions);
      setFilledCount(newSlotStates.filter((s) => s.isFilled).length);
      setTotalCorrect(correctLetters.length);
      setUndoStack([]);
      setRedoStack([]);
      setTool("drag");
      setHoveredSlotIndex(null);
      setDragState({ isDragging: false, pair: null, position: null });
      setTransitionPhase("idle");
      setIsGameComplete(false);

      if (sessionNum === 1) {
        s1StatsRef.current = emptyStats();
      } else {
        s2StatsRef.current = emptyStats();
      }
      sessionStartTimeRef.current = Date.now();
    },
    [level, shuffleArray],
  );

  // ══════════════════════════════════════════════════════════
  //  MOUNT — initialize game + play intro audio
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    introPlayedRef.current = false;
    initializeGame(1);

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
    (currentSlots: SlotState[], currentOptions: string[], currentFilled: number) => {
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
    const config = LEVEL_CONFIGS[level]?.[currentSession];
    if (!config) return 0;
    return config.slots.filter((s: string) => s === "").length;
  }, [level, currentSession]);

  const filledEmptySlots = useMemo(() => {
    const config = LEVEL_CONFIGS[level]?.[currentSession];
    if (!config) return 0;
    let count = 0;
    config.slots.forEach((s: string, i: number) => {
      if (s === "" && slotStates[i]?.isFilled) count++;
    });
    return count;
  }, [level, currentSession, slotStates]);

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

    const config = LEVEL_CONFIGS[level]?.[currentSession];
    if (!config) {
      isCheckingRef.current = false;
      return;
    }

    const stats = activeStatsRef.current;
    stats.finalDrops = filledEmptySlots;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    // 🔥 Build slot results — ONLY for EMPTY slots (missing letters)
    const slotResults: SlotResult[] = [];

    config.slots.forEach((expectedSlot: string, i: number) => {
      const isEmptySlot = expectedSlot === "";
      if (!isEmptySlot) return; // skip pre-filled

      const expectedPair = getCorrectPairForSlot(i, config.slots);
      const userPair = slotStates[i]?.pair ?? null;

      let result: SlotResult["result"];
      if (!userPair) {
        result = "missed";
      } else if (userPair === expectedPair) {
        result = "correct";
      } else {
        result = "wrong";
      }

      slotResults.push({
        slotIndex: i,
        expectedPair,
        userPair,
        result,
      });
    });

    const correctSlots = slotResults.filter(
      (r) => r.result === "correct",
    ).length;

    const snapshot: SessionSnapshot = {
      totalSlots: config.slots.length,
      filledSlots: filledCount,
      correctSlots,
      slotResults,
    };

    if (currentSession === 1) {
      s1FinalSnapshotRef.current = snapshot;
      setTransitionPhase("fade-out");
      timersRef.current["session2"] = setTimeout(() => {
        setCurrentSession(2);
        initializeGame(2);
        setTransitionPhase("fade-in");
        timersRef.current["session2in"] = setTimeout(() => {
          setTransitionPhase("idle");
          isCheckingRef.current = false;
        }, 500);
      }, 500);
    } else {
      s2FinalSnapshotRef.current = snapshot;
      setIsGameComplete(true);
      saveFinalProgress();

      timersRef.current["navigate"] = setTimeout(() => {
        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      }, 500);
    }
  }, [
    canCheck,
    transitionPhase,
    level,
    currentSession,
    getCorrectPairForSlot,
    slotStates,
    filledCount,
    filledEmptySlots,
    initializeGame,
    navigate,
    subject,
    lessonId,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;

      return {
        type: "alphabet-find-missing-letter",
        lessonType: "find-missing",
        sessions: [
          {
            sessionNum: 1,
            totalSlots: s1?.totalSlots ?? 0,
            filledSlots: s1?.filledSlots ?? 0,
            correctSlots: s1?.correctSlots ?? 0,
            slotResults: s1?.slotResults ?? [],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            totalSlots: s2?.totalSlots ?? 0,
            filledSlots: s2?.filledSlots ?? 0,
            correctSlots: s2?.correctSlots ?? 0,
            slotResults: s2?.slotResults ?? [],
            stats: { ...s2StatsRef.current },
          },
        ],
        completed,
      };
    },
    [],
  );

  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const totalTimeSec =
      s1StatsRef.current.timeSec + s2StatsRef.current.timeSec;
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const summary = buildFullSummary(
      studentName,
      s1FinalSnapshotRef.current,
      s2FinalSnapshotRef.current,
      true,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject,
      level,
      lessonId,
      status: "completed",
      timeSpentSec: totalTimeSec,
      summary,
      gameData: buildGameData(true),
    }).catch((err) => {
      console.error("[FindMissing] Save failed:", err);
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
    const summary = buildFullSummary(
      studentName,
      s1FinalSnapshotRef.current,
      s2FinalSnapshotRef.current,
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
    }).catch(() => {});
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgressRef = useRef<() => void>(() => {});
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── DRAG HANDLERS ───────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pair: string) => {
      if (transitionPhase !== "idle") return;
      if (isGameComplete) return;
      if (tool === "clear") return;
      if (dragState.isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        pair,
        position: { x: e.clientX - 40, y: e.clientY - 40 },
      });
    },
    [transitionPhase, isGameComplete, tool, dragState.isDragging],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.pair) return;

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
    [dragState.isDragging, dragState.pair, slotStates],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.pair) {
        setDragState({ isDragging: false, pair: null, position: null });
        setHoveredSlotIndex(null);
        return;
      }

      const droppedPair = dragState.pair;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({ isDragging: false, pair: null, position: null });
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
            ? { ...slot, pair: droppedPair, isFilled: true }
            : slot,
        ),
      );

      setOptions((prev) => prev.filter((p) => p !== droppedPair));
      setFilledCount((c) => c + 1);
      activeStatsRef.current.totalDrops += 1;
    },
    [dragState, slotStates, options, filledCount, pushUndo],
  );

  // ─── CLEAR ───────────────────────────────────────────────────
  const handleSlotTap = useCallback(
    (slotIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const config = LEVEL_CONFIGS[level]?.[currentSession];
      if (!config) return;

      const isPreFilled = config.slots[slotIndex] !== "";
      if (isPreFilled) return;

      const slot = slotStates[slotIndex];
      if (!slot.isFilled) return;

      pushUndo(slotStates, options, filledCount);

      const removedPair = slot.pair;

      setSlotStates((prev) =>
        prev.map((s, idx) =>
          idx === slotIndex ? { ...s, pair: null, isFilled: false } : s,
        ),
      );

      if (removedPair) {
        setOptions((prev) => [...prev, removedPair]);
      }
      setFilledCount((c) => Math.max(0, c - 1));
      activeStatsRef.current.dropsRemoved += 1;
      setTool("drag");
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      level,
      currentSession,
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
    activeStatsRef.current.undoCount += 1;

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
    activeStatsRef.current.redoCount += 1;

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
    if (transitionPhase === "fade-out") return "fml-fade-out";
    if (transitionPhase === "fade-in") return "fml-fade-in";
    return "";
  };

  // ─── RENDER SLOT ─────────────────────────────────────────────
  const renderSlot = (slot: SlotState, index: number) => {
    const isHovered = hoveredSlotIndex === index;
    const isFilled = slot.isFilled;
    const isToolClear = tool === "clear";

    const displayPair = slot.pair || "";
    const smallLetter =
      displayPair.length > 1 ? displayPair.charAt(1).toLowerCase() : "";
    const isDescender = DESCENDER_LETTERS.has(smallLetter);
    const descenderStyle =
      isDescender && isFilled ? { transform: "translateY(-8%)" } : {};

    const fontSize = getSlotFontSize(displayPair);

    if (isFilled) {
      return (
        <div
          key={`slot-${index}`}
          data-slot-index={index}
          onClick={() => handleSlotTap(index)}
          className={`
            fml-slot-pop clay-sm relative flex flex-col items-center justify-center
            rounded-2xl border-4 border-white
            ${isToolClear ? "cursor-crosshair" : "cursor-default"}
          `}
          style={{
            ["--clay-shadow" as string]: "oklch(0.4 0.18 260 / 0.9)",
            width: "100%",
            maxWidth: "160px",
            minWidth: "80px",
            aspectRatio: "1/1",
            padding: "4px",
            backgroundColor: ROYAL_BLUE,
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
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
                ...descenderStyle,
              }}
            >
              {displayPair}
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
          fml-slot-pop relative flex flex-col items-center justify-center
          rounded-2xl border-4
          ${isHovered ? "fml-target-pulse" : ""}
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
            : "fml-target-pulse 1.8s ease-in-out infinite",
        }}
      />
    );
  };

  // ─── RENDER OPTION ───────────────────────────────────────────
  const renderOption = (pair: string, index: number) => {
    const isDraggingThis = dragState.pair === pair && dragState.isDragging;
    const isDisabled =
      transitionPhase !== "idle" || isGameComplete || tool === "clear";

    const smallLetter =
      pair.length > 1 ? pair.charAt(1).toLowerCase() : "";
    const isDescender = DESCENDER_LETTERS.has(smallLetter);
    const descenderStyle = isDescender ? { transform: "translateY(-8%)" } : {};

    const fontSize = getOptionFontSize(pair);

    return (
      <div
        key={`option-${index}`}
        className={`
          flex items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : "fml-card-reappear"}
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
          !isDisabled && !isDraggingThis && handlePointerDown(e, pair)
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
              ...descenderStyle,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {pair}
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

      <div
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full flex-1 items-center justify-center px-4">
          <div
            className={`grid ${getSlotGridCols()} gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}
          >
            {slotStates.map((slot, index) => renderSlot(slot, index))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center pb-2">
          <div
            className={`grid ${getOptionGridCols()} gap-2 sm:gap-3 w-full max-w-3xl place-items-center`}
          >
            {options.map((pair, index) => renderOption(pair, index))}
          </div>
        </div>
      </div>

      {dragState.isDragging && dragState.pair && dragState.position && (
        <span
          className="fixed pointer-events-none z-[60] select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: getOptionFontSize(dragState.pair),
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
          {dragState.pair}
        </span>
      )}
    </div>
  );
}

export default AlphabetFindMissingLetter;