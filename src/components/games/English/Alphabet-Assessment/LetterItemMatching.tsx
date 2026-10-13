// src/components/games/English/LetterItemMatching.tsx
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check
// 🔥 FREE MATCHING — koi bhi letter kisi bhi item se match ho sakta hai
// 🔥 Ek letter sirf EK match kar sakta hai (max 1 line per letter)
// 🔥 Ek item bhi sirf EK match le sakta hai (max 1 line per item)
// 🔥 Eraser tool ON → sirf lines RED ho jati hain (NO cross button)
// 🔥 Red line pe tap → woh unmatch ho jata hai, tool auto drag mode
// ✅ Royal Blue theme throughout
// 🔥 Progress saved with per-match results for dashboard
//
// ✅ UPDATED (v2):
//    - 🔥 Intro audio plays ONCE at start (fire-and-forget, no lock)
//      Source: src/assets/English Assessment Audios/Letter Item Matching/intro.wav
//    - Board is interactive from frame 1
//    - Session 2 does NOT replay intro audio
//
// ✅ UPDATED (v3): SUMMARY added
//    - Per-letter result: "Letter A - Correct" / "Letter B - Wrong" / "Letter C - Missed"
//    - Uncompleted: "Student did not complete the Letter-Item Matching lesson."

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
const introAudio = "/assets/English Assessment Audios/Letter Item Matching/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";
const ERASER_RED = "#EF4444";

// ─── 🔥 ITEM SVG MAP - Only 1 item per letter ─────────────────
const ITEM_SVG_MAP: Record<string, string> = {
  A: "apple", B: "ball", C: "cat", D: "dog", E: "egg",
  F: "fish", G: "gift", H: "hat", I: "ice", J: "jar",
  K: "kite", L: "lion", M: "moon", N: "nose", O: "owl",
  P: "pencil", Q: "queen", R: "rose", S: "star", T: "tree",
  U: "umbrella", V: "vase", W: "window", X: "x-ray", Y: "yak",
  Z: "zebra",
};

// ─── 🔥 ITEM SVG MODULES ──────────────────────────────────────
const ITEM_SVG_MODULES = import.meta.glob<string>(
  "@/assets/A2Z Items SVG/*/*.svg",
  { eager: true, query: "?url", import: "default" }
);

function getItemSvgUrl(letter: string): string {
  const itemName = ITEM_SVG_MAP[letter];
  if (!itemName) {
    console.warn(`[LetterItemMatching] No item mapped for letter: ${letter}`);
    return "";
  }
  const key = `/src/assets/A2Z Items SVG/${letter} For/${itemName}.svg`;
  const url = ITEM_SVG_MODULES[key];
  if (!url) {
    console.warn(`[LetterItemMatching] Missing SVG for: ${key}`);
  }
  return url ?? "";
}

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = "english") {
  const colors: Record<
    string,
    { cardBg: string; cardShadow: string; selectedColor: string }
  > = {
    english: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedColor: ROYAL_BLUE,
    },
    math: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedColor: ROYAL_BLUE,
    },
    urdu: {
      cardBg: ROYAL_BLUE,
      cardShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedColor: ROYAL_BLUE,
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
  @keyframes lim-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lim-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }
  @keyframes lim-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes lim-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes lim-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lim-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes lim-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }

  .lim-pop-in { animation: lim-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .lim-pulse { animation: lim-pulse 0.6s ease-in-out infinite alternate; }
  .lim-pop-smooth { animation: lim-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .lim-fade-out { animation: lim-fade-out 0.5s ease-in both; }
  .lim-fade-in { animation: lim-fade-in 0.5s ease-out both; }
  .lim-tool-pop { animation: lim-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .lim-check-pulse { animation: lim-tool-pulse-green 1.4s ease-out infinite; }
`;

// ─── Types ──────────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

type Session = 1 | 2;
type TransitionPhase = "idle" | "fade-out" | "fade-in";
type Tool = "drag" | "clear";

interface LetterPair {
  capital: string;
  small: string;
  itemName: string;
  matched: boolean;
}

interface MatchedLine {
  capital: string;
  item: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

type Point = { x: number; y: number };

// 🔥 History snapshot
interface HistorySnapshot {
  pairs: LetterPair[];
  itemList: Array<{ letter: string; item: string; svgUrl: string }>;
  matchedLines: MatchedLine[];
  matchedCount: number;
}

// 🔥 Per-match result for dashboard
interface MatchResult {
  capital: string;
  expectedItem: string;
  userItem: string | null;
  result: "correct" | "wrong" | "missed";
}

// 🔥 Session stats
interface SessionStats {
  totalMatches: number;
  matchesRemoved: number;
  undoCount: number;
  redoCount: number;
  finalMatches: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalMatches: 0,
    matchesRemoved: 0,
    undoCount: 0,
    redoCount: 0,
    finalMatches: 0,
    timeSec: 0,
  };
}

interface SessionSnapshot {
  totalPairs: number;
  matchedCount: number;
  correctMatches: number;
  matchResults: MatchResult[];
}

// ─── LEVEL CONFIG ──────────────────────────────────────────────
const LEVEL_LETTERS_MAP: Record<
  number,
  { session1: string[]; session2: string[] }
> = {
  8: {
    session1: ["A", "B", "C", "D"],
    session2: ["E", "F", "G"],
  },
  16: {
    session1: ["H", "I", "J", "K"],
    session2: ["L", "M", "N"],
  },
  23: {
    session1: ["O", "P", "Q"],
    session2: ["R", "S", "T"],
  },
  30: {
    session1: ["U", "V", "W"],
    session2: ["X", "Y", "Z"],
  },
};

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1Letters: string[],
  s1Results: MatchResult[],
  s2Letters: string[],
  s2Results: MatchResult[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Letter-Item Matching lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (lettersList: string[], results: MatchResult[]) => {
    for (const capital of lettersList) {
      const match = results.find((m) => m.capital === capital);
      let status: string;
      if (!match || match.result === "missed") status = "Missed";
      else if (match.result === "correct") status = "Correct";
      else status = "Wrong";
      lines.push(`Letter ${capital} - ${status}`);
    }
  };

  buildLines(s1Letters, s1Results);
  buildLines(s2Letters, s2Results);

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
    "lim-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "lim-check-pulse" : ""}`}
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
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear matches"}
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
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function LetterItemMatching({ subject, level, lessonId }: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const levelConfig = LEVEL_LETTERS_MAP[level];
  const SESSION_1_LETTERS = levelConfig?.session1 || ["A", "B", "C", "D"];
  const SESSION_2_LETTERS = levelConfig?.session2 || ["E", "F", "G"];

  // ─── State ────────────────────────────────────────────────────
  const [session, setSession] = useState<Session>(1);
  const [pairs, setPairs] = useState<LetterPair[]>([]);
  const [itemList, setItemList] = useState<
    Array<{ letter: string; item: string; svgUrl: string }>
  >([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");

  const [tool, setTool] = useState<Tool>("drag");
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  const [matchedLines, setMatchedLines] = useState<MatchedLine[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragCapital, setDragCapital] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ─── Progress Refs ──────────────────────────────────────────
  const s1StatsRef = useRef<SessionStats>(emptyStats());
  const s2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const s1FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const s2FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const activeStatsRef = session === 1 ? s1StatsRef : s2StatsRef;
  const savePartialProgressRef = useRef<() => void>(() => {});

  const boardRef = useRef<HTMLDivElement | null>(null);
  const capitalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔥 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // ─── Get Item for Letter ────────────────────────────────────
  const getItemForLetter = useCallback((letter: string): string => {
    return ITEM_SVG_MAP[letter] || letter.toLowerCase();
  }, []);

  // ─── Shuffle Array ───────────────────────────────────────────
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // ─── Shuffle with No Same Row ────────────────────────────────
  const shuffleWithNoSameRow = useCallback(
    (
      items: Array<{ letter: string; item: string; svgUrl: string }>,
    ): Array<{ letter: string; item: string; svgUrl: string }> => {
      const total = items.length;
      let attempts = 0;
      const maxAttempts = 100;
      const originalLetters = items.map((i) => i.letter);

      while (attempts < maxAttempts) {
        attempts++;
        const shuffled = shuffleArray(items);

        let hasSameRow = false;
        for (let i = 0; i < total; i++) {
          if (shuffled[i].letter === originalLetters[i]) {
            hasSameRow = true;
            break;
          }
        }

        if (!hasSameRow) {
          return shuffled;
        }
      }

      const fallback = [...items];
      for (let i = 0; i < total; i++) {
        if (fallback[i].letter === originalLetters[i]) {
          const swapIndex = (i + 1) % total;
          if (swapIndex !== i) {
            [fallback[i], fallback[swapIndex]] = [
              fallback[swapIndex],
              fallback[i],
            ];
          }
        }
      }
      return fallback;
    },
    [shuffleArray],
  );

  // ─── Get Session Letters ─────────────────────────────────────
  const getSessionLetters = useCallback(
    (sessionNum: Session): string[] => {
      return sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
  );

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
  //  🔥 PLAY INTRO AUDIO (fire-and-forget, no lock)
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

  // ─── Initialize Game ─────────────────────────────────────────
  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const sessionLetters = getSessionLetters(sessionNum);

      const newPairs: LetterPair[] = sessionLetters.map((capital) => {
        const itemName = getItemForLetter(capital);
        return {
          capital: capital.toUpperCase(),
          small: capital.toLowerCase(),
          itemName: itemName,
          matched: false,
        };
      });

      const items = sessionLetters.map((capital) => {
        const itemName = getItemForLetter(capital);
        return {
          letter: capital,
          item: itemName,
          svgUrl: getItemSvgUrl(capital),
        };
      });

      const shuffledItems = shuffleWithNoSameRow(items);

      setPairs(newPairs);
      setItemList(shuffledItems);
      setMatchedCount(0);
      setMatchedLines([]);
      setUndoStack([]);
      setRedoStack([]);
      setTool("drag");
      setDragCapital(null);
      setDragStart(null);
      setDragEnd(null);
      setHoveredItem(null);
      setIsDragging(false);
      setTransitionPhase("idle");
      setIsGameComplete(false);

      if (sessionNum === 1) {
        s1StatsRef.current = emptyStats();
      } else {
        s2StatsRef.current = emptyStats();
      }
      sessionStartTimeRef.current = Date.now();
    },
    [getSessionLetters, getItemForLetter, shuffleWithNoSameRow],
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
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      if (!progressSavedRef.current) {
        savePartialProgressRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Get Center Positions ────────────────────────────────────
  const getCapitalCenter = useCallback((capital: string): Point | null => {
    const board = boardRef.current;
    const el = capitalRefs.current[capital];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  const getItemCenter = useCallback((itemKey: string): Point | null => {
    const board = boardRef.current;
    const el = itemRefs.current[itemKey];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  // ─── History Helpers ─────────────────────────────────────────
  const pushUndo = useCallback(
    (
      currentPairs: LetterPair[],
      currentItemList: Array<{ letter: string; item: string; svgUrl: string }>,
      currentMatchedLines: MatchedLine[],
      currentMatchedCount: number,
    ) => {
      setUndoStack((prev) => [
        ...prev,
        {
          pairs: currentPairs.map((p) => ({ ...p })),
          itemList: currentItemList.map((i) => ({ ...i })),
          matchedLines: currentMatchedLines.map((l) => ({ ...l })),
          matchedCount: currentMatchedCount,
        },
      ]);
      setRedoStack([]);
    },
    [],
  );

  // ─── Pointer Handlers ────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, capital: string) => {
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;
      if (tool === "clear") return;
      if (isDragging) return;

      const pair = pairs.find((p) => p.capital === capital);
      if (pair?.matched) return;

      const board = boardRef.current;
      if (!board) return;

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };

      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      setDragCapital(capital);
      setDragStart(point);
      setDragEnd(point);
    },
    [isGameComplete, transitionPhase, tool, isDragging, pairs],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragCapital) return;
      if (isGameComplete || transitionPhase !== "idle") return;

      const board = boardRef.current;
      if (!board) return;

      e.preventDefault();

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };
      setDragEnd(point);

      let hit: string | null = null;
      for (const [itemKey, el] of Object.entries(itemRefs.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const padding = 20;
        if (
          e.clientX >= r.left - padding &&
          e.clientX <= r.right + padding &&
          e.clientY >= r.top - padding &&
          e.clientY <= r.bottom + padding
        ) {
          const matched = matchedLines.some((l) => l.item === itemKey);
          if (!matched) {
            hit = itemKey;
            break;
          }
        }
      }
      setHoveredItem(hit);
    },
    [isDragging, dragCapital, isGameComplete, transitionPhase, matchedLines],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragCapital) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDragCapital(null);
        setHoveredItem(null);
        return;
      }

      const droppedCapital = dragCapital;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);

      const targetItem = hoveredItem;
      setHoveredItem(null);

      if (targetItem) {
        const capitalAlreadyMatched = pairs.find(
          (p) => p.capital === droppedCapital,
        )?.matched;
        const itemAlreadyMatched = matchedLines.some(
          (l) => l.item === targetItem,
        );

        if (capitalAlreadyMatched || itemAlreadyMatched) {
          setDragCapital(null);
          return;
        }

        pushUndo(pairs, itemList, matchedLines, matchedCount);

        const start = getCapitalCenter(droppedCapital);
        const end = getItemCenter(targetItem);

        if (start && end) {
          setMatchedLines((prev) => [
            ...prev,
            {
              capital: droppedCapital,
              item: targetItem,
              startX: start.x,
              startY: start.y,
              endX: end.x,
              endY: end.y,
            },
          ]);
        }

        setPairs((prev) =>
          prev.map((p) =>
            p.capital === droppedCapital ? { ...p, matched: true } : p,
          ),
        );

        setMatchedCount((c) => c + 1);
        activeStatsRef.current.totalMatches += 1;
      }

      setDragCapital(null);
    },
    [
      isDragging,
      dragCapital,
      hoveredItem,
      pairs,
      itemList,
      matchedLines,
      matchedCount,
      pushUndo,
      getCapitalCenter,
      getItemCenter,
    ],
  );

  // ─── 🔥 UNMATCH VIA LINE TAP (eraser mode) ──────────────────
  const handleLineTap = useCallback(
    (capital: string) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const line = matchedLines.find((l) => l.capital === capital);
      if (!line) return;

      pushUndo(pairs, itemList, matchedLines, matchedCount);

      setMatchedLines((prev) =>
        prev.filter((l) => l.capital !== capital),
      );

      setPairs((prev) =>
        prev.map((p) =>
          p.capital === capital ? { ...p, matched: false } : p,
        ),
      );

      setMatchedCount((c) => Math.max(0, c - 1));
      activeStatsRef.current.matchesRemoved += 1;

      setTool("drag");
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      matchedLines,
      pairs,
      itemList,
      matchedCount,
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
        pairs: pairs.map((p) => ({ ...p })),
        itemList: itemList.map((i) => ({ ...i })),
        matchedLines: matchedLines.map((l) => ({ ...l })),
        matchedCount,
      },
    ]);
    setPairs(prev.pairs);
    setItemList(prev.itemList);
    setMatchedLines(prev.matchedLines);
    setMatchedCount(prev.matchedCount);
  }, [undoStack, pairs, itemList, matchedLines, matchedCount]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [
      ...u,
      {
        pairs: pairs.map((p) => ({ ...p })),
        itemList: itemList.map((i) => ({ ...i })),
        matchedLines: matchedLines.map((l) => ({ ...l })),
        matchedCount,
      },
    ]);
    setPairs(next.pairs);
    setItemList(next.itemList);
    setMatchedLines(next.matchedLines);
    setMatchedCount(next.matchedCount);
  }, [redoStack, pairs, itemList, matchedLines, matchedCount]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  // ─── CAN CHECK ───────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (pairs.length === 0) return false;
    return matchedCount >= pairs.length;
  }, [pairs.length, matchedCount]);

  // ─── BUILD MATCH RESULTS ─────────────────────────────────────
  const buildMatchResults = useCallback(
    (
      currentPairs: LetterPair[],
      currentMatchedLines: MatchedLine[],
    ): MatchResult[] => {
      return currentPairs.map((pair) => {
        const line = currentMatchedLines.find(
          (l) => l.capital === pair.capital,
        );
        const userItem = line?.item ?? null;

        let result: MatchResult["result"];
        if (!userItem) {
          result = "missed";
        } else if (userItem === pair.itemName) {
          result = "correct";
        } else {
          result = "wrong";
        }

        return {
          capital: pair.capital,
          expectedItem: pair.itemName,
          userItem,
          result,
        };
      });
    },
    [],
  );

  // ─── CHECK ───────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const stats = activeStatsRef.current;
    stats.finalMatches = matchedCount;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    const matchResults = buildMatchResults(pairs, matchedLines);
    const correctMatches = matchResults.filter(
      (r) => r.result === "correct",
    ).length;

    const snapshot: SessionSnapshot = {
      totalPairs: pairs.length,
      matchedCount,
      correctMatches,
      matchResults,
    };

    if (session === 1) {
      s1FinalSnapshotRef.current = snapshot;
      setTransitionPhase("fade-out");
      transitionTimerRef.current = setTimeout(() => {
        setSession(2);
        initializeGame(2);
        setTransitionPhase("fade-in");
        transitionTimerRef.current = setTimeout(() => {
          setTransitionPhase("idle");
          isCheckingRef.current = false;
        }, 500);
      }, 500);
    } else {
      s2FinalSnapshotRef.current = snapshot;
      setIsGameComplete(true);
      saveFinalProgress();

      navigateTimerRef.current = setTimeout(() => {
        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      }, 500);
    }
  }, [
    canCheck,
    transitionPhase,
    matchedCount,
    pairs,
    matchedLines,
    session,
    buildMatchResults,
    initializeGame,
    navigate,
    subject,
    level,
    lessonId,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;

      return {
        type: "letter-item-matching",
        lessonType: "match",
        sessions: [
          {
            sessionNum: 1,
            letters: SESSION_1_LETTERS,
            totalPairs: s1?.totalPairs ?? 0,
            matchedCount: s1?.matchedCount ?? 0,
            correctMatches: s1?.correctMatches ?? 0,
            matchResults: s1?.matchResults ?? [],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            letters: SESSION_2_LETTERS,
            totalPairs: s2?.totalPairs ?? 0,
            matchedCount: s2?.matchedCount ?? 0,
            correctMatches: s2?.correctMatches ?? 0,
            matchResults: s2?.matchResults ?? [],
            stats: { ...s2StatsRef.current },
          },
        ],
        completed,
      };
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
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
      SESSION_1_LETTERS,
      s1FinalSnapshotRef.current?.matchResults ?? [],
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current?.matchResults ?? [],
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
      console.error("[LetterItemMatching] Save failed:", err);
    });
  }, [
    SESSION_1_LETTERS,
    SESSION_2_LETTERS,
    subject,
    level,
    lessonId,
    buildGameData,
  ]);

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
      SESSION_1_LETTERS,
      s1FinalSnapshotRef.current?.matchResults ?? [],
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current?.matchResults ?? [],
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
  }, [
    SESSION_1_LETTERS,
    SESSION_2_LETTERS,
    subject,
    level,
    lessonId,
    buildGameData,
  ]);

  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── Get Container Class ─────────────────────────────────────
  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "lim-fade-out";
    if (transitionPhase === "fade-in") return "lim-fade-in";
    return "";
  };

  // ─── Render Capital + Small Letter ──────────────────────────
  const renderCapital = (pair: LetterPair) => {
    const isMatched = pair.matched;
    const displayText = `${pair.capital}${pair.small}`;

    const isWideLetter = pair.capital === "W" || pair.capital === "M";
    const fontSize = isWideLetter
      ? "clamp(2.8rem, 10vh, 5.5rem)"
      : "clamp(3.5rem, 12vh, 6.5rem)";

    const letterSpacing = isWideLetter ? "0.01em" : "0.02em";

    const bgColor = ROYAL_BLUE;
    const cardShadow = "oklch(0.4 0.18 260 / 0.9)";
    const borderColor = "white";

    let cursor = "grab";
    if (isMatched) cursor = "default";
    if (tool === "clear") cursor = "default";

    const isDisabled =
      isGameComplete ||
      transitionPhase !== "idle" ||
      tool === "clear" ||
      isMatched;

    return (
      <div
        key={pair.capital}
        ref={(el) => {
          capitalRefs.current[pair.capital] = el;
        }}
        onPointerDown={(e) =>
          !isDisabled && !isMatched && handlePointerDown(e, pair.capital)
        }
        className={`relative flex items-center justify-center transition-all duration-200 ${
          !isDisabled && !isMatched ? "hover:scale-105" : ""
        }`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "105px",
          cursor,
          opacity: isMatched ? 0.85 : 1,
          padding: "5px",
          touchAction: "none",
        }}
      >
        <div
          className="absolute rounded-2xl border-4 transition-all duration-200"
          style={{
            width: "clamp(80px, 18vh, 145px)",
            height: "clamp(80px, 18vh, 145px)",
            backgroundColor: bgColor,
            borderColor: borderColor,
            boxShadow: `0 4px 0 0 ${cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
          }}
        />

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
            letterSpacing: letterSpacing,
            transition: "color 0.2s ease, transform 0.2s ease",
            userSelect: "none",
            position: "relative",
            zIndex: 1,
          }}
        >
          {displayText}
        </span>
      </div>
    );
  };

  // ─── Render Item (SVG) ───────────────────────────────────────
  const renderItem = (itemData: {
    letter: string;
    item: string;
    svgUrl: string;
  }) => {
    const itemKey = itemData.item;
    const isMatched = matchedLines.some((l) => l.item === itemKey);
    const isHovered = hoveredItem === itemKey;

    const bgColor = ROYAL_BLUE;
    const cardShadow = "oklch(0.4 0.18 260 / 0.9)";
    const borderColor = "white";
    let scaleClass = "";
    let glow = "none";
    let cursor = "pointer";

    if (isMatched) {
      cursor = "default";
    } else if (isHovered && isDragging) {
      glow = "0 0 40px rgba(65, 105, 225, 0.4)";
      scaleClass = "scale-105";
    }

    const isDisabled =
      isMatched || isGameComplete || transitionPhase !== "idle";

    return (
      <div
        key={`item-${itemKey}`}
        ref={(el) => {
          itemRefs.current[itemKey] = el;
        }}
        className={`relative flex items-center justify-center transition-all duration-200 ${scaleClass}`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "105px",
          cursor: isDisabled ? "default" : cursor,
          opacity: isMatched ? 0.85 : 1,
          padding: "5px",
        }}
      >
        <div
          className="absolute rounded-2xl border-4 transition-all duration-200"
          style={{
            width: "clamp(80px, 18vh, 145px)",
            height: "clamp(80px, 18vh, 145px)",
            backgroundColor: bgColor,
            borderColor: borderColor,
            boxShadow: `0 4px 0 0 ${cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
          }}
        />

        <div
          className="relative z-1 flex items-center justify-center pointer-events-none"
          style={{
            width: "100px",
            height: "100px",
            flexShrink: 0,
          }}
        >
          <img
            src={itemData.svgUrl}
            alt={itemData.item}
            className="w-full h-full object-contain select-none"
            style={{
              filter: glow !== "none" ? `drop-shadow(${glow})` : "none",
              transition: "filter 0.2s ease",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  🔥 RENDER LINES
  // ══════════════════════════════════════════════════════════════
  const renderLines = () => {
    const allLines: React.ReactElement[] = [];
    const isEraserMode = tool === "clear";

    const lineColor = isEraserMode ? ERASER_RED : ROYAL_BLUE;
    const lineShadow = isEraserMode
      ? "0 0 16px rgba(239, 68, 68, 0.5), 0 0 32px rgba(239, 68, 68, 0.25)"
      : "0 0 16px rgba(65, 105, 225, 0.5), 0 0 32px rgba(65, 105, 225, 0.25)";
    const dotShadow = isEraserMode
      ? "0 0 20px rgba(239, 68, 68, 0.6)"
      : "0 0 20px rgba(65, 105, 225, 0.6)";

    matchedLines.forEach((line, index) => {
      const length = Math.hypot(
        line.endX - line.startX,
        line.endY - line.startY,
      );
      const angle = Math.atan2(
        line.endY - line.startY,
        line.endX - line.startX,
      );

      allLines.push(
        <div key={`matched-${index}`}>
          {isEraserMode && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleLineTap(line.capital);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleLineTap(line.capital);
              }}
              style={{
                position: "absolute",
                left: line.startX,
                top: line.startY,
                width: length,
                height: "44px",
                transformOrigin: "left center",
                transform: `rotate(${angle}rad) translateY(-19px)`,
                cursor: "crosshair",
                zIndex: 35,
                background: "transparent",
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              left: line.startX,
              top: line.startY,
              width: length,
              height: "6px",
              backgroundColor: lineColor,
              transformOrigin: "left center",
              transform: `rotate(${angle}rad)`,
              borderRadius: "3px",
              boxShadow: lineShadow,
              zIndex: 25,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: line.startX - 10,
              top: line.startY - 10,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: lineColor,
              boxShadow: dotShadow,
              zIndex: 25,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: line.endX - 10,
              top: line.endY - 10,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: lineColor,
              boxShadow: dotShadow,
              zIndex: 25,
              pointerEvents: "none",
            }}
          />
        </div>,
      );
    });

    if (isDragging && dragStart && dragEnd && dragCapital) {
      const start = getCapitalCenter(dragCapital);
      if (start) {
        const end = dragEnd;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        allLines.push(
          <div key="drag-line">
            <div
              style={{
                position: "absolute",
                left: start.x,
                top: start.y,
                width: length,
                height: "6px",
                backgroundColor: ROYAL_BLUE,
                transformOrigin: "left center",
                transform: `rotate(${angle}rad)`,
                borderRadius: "3px",
                boxShadow: `0 0 16px rgba(65, 105, 225, 0.4), 0 0 32px rgba(65, 105, 225, 0.2)`,
                zIndex: 30,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: start.x - 12,
                top: start.y - 12,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: ROYAL_BLUE,
                boxShadow: `0 0 20px rgba(65, 105, 225, 0.5)`,
                zIndex: 30,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: end.x - 12,
                top: end.y - 12,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: ROYAL_BLUE,
                boxShadow: `0 0 20px rgba(65, 105, 225, 0.5)`,
                zIndex: 30,
                pointerEvents: "none",
              }}
              className="lim-pulse"
            />
          </div>,
        );
      }
    }

    return allLines;
  };

  // ─── Main Render ─────────────────────────────────────────────
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = matchedCount > 0;
  const isTransitioning = transitionPhase !== "idle";
  const totalPairs = pairs.length;

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
      style={{ touchAction: "none" }}
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
        ref={boardRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex w-full max-w-4xl items-stretch gap-14 sm:gap-18 md:gap-22 lg:gap-26">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className="flex flex-col items-center justify-center gap-5 w-full max-w-[200px]"
              style={{
                minHeight: `${Math.max(105, totalPairs * 115)}px`,
              }}
            >
              {pairs.map((pair) => renderCapital(pair))}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className="flex flex-col items-center justify-center gap-5 w-full max-w-[200px]"
              style={{
                minHeight: `${Math.max(105, totalPairs * 115)}px`,
              }}
            >
              {itemList.map((itemData) => renderItem(itemData))}
            </div>
          </div>
        </div>

        {renderLines()}
      </div>
    </div>
  );
}

export default LetterItemMatching;