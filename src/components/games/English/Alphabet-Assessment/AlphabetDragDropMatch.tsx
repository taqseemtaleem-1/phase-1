// src/components/games/English/Alphabet-Assessment/AlphabetDragDropMatch.tsx
// ✅ Silent bulk-style drag-drop gameplay (no correct/wrong feedback)
// ✅ Toolbar: Undo, Redo, Clear, Check
// 🔥 Session-aware distractors — NO duplicate letters in bottom row
// ✅ ALL bottom cards in ONE ROW
// ✅ Cards keep their slot when dropped — no resizing
// 🔥 Boxes use ACTUAL count → same size across sessions
// 🔥 Per-session slot config (box/card size)
// 🔥 Wide letters (M, W, N, m, w, n) scale down so they fit inside boxes
// 🔥 Descenders NOT cut in cards, boxes, OR floating drag
// 🔥 Progress save to IndexedDB — awaiting DB write + no stale closures
// 🔥 Await saveProgress before navigate
// 🔥 Bottom option cards — TRANSPARENT background, ROYAL BLUE letters
// 🔥 Filled boxes turn ROYAL BLUE with WHITE text (no more mustard)
//
// ✅ UPDATED (v2):
//    - 🔥 Intro audio plays ONCE at start (fire-and-forget, no lock)
//      Source: src/assets/English Assessment Audios/Alphabet Drag Drop Match/intro.wav
//    - Board is interactive from frame 1
//    - Session 2 does NOT replay intro audio
//
// ✅ UPDATED (v3): SUMMARY added
//    - Per-letter result: "Letter Aa - Correct" / "Letter Bb - Wrong" / "Letter Cc - Missed"
//    - Uncompleted: "Student did not complete the Drag & Drop Match lesson."

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
const introAudio = "/assets/English Assessment Audios/Alphabet Drag Drop Match/intro.wav";

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = "english") {
  const colors: Record<
    string,
    {
      cardBg: string;
      cardShadow: string;
      selectedBg: string;
      selectedShadow: string;
      selectedText: string;
      emptyBoxBorder: string;
    }
  > = {
    english: {
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
      selectedBg: "#4169E1",
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#4D82F6",
    },
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      selectedBg: "#4169E1",
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#2E8B57",
    },
    urdu: {
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
      selectedBg: "#4169E1",
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#CC6B2C",
    },
  };
  return colors[subject] || colors.english;
}

// 🔥 ROYAL BLUE color for bottom option letters
const ROYAL_BLUE = "#4169E1";

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

// ─── 🎬 ANIMATION CSS ─────────────────────────────────────────
const GAME_CSS = `
  @keyframes add-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes add-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes add-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes add-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes add-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes add-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes add-target-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(77, 130, 246, 0);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(77, 130, 246, 0.15);
      transform: scale(1.02);
    }
  }
  @keyframes add-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .add-pop-in { animation: add-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .add-fade-out { animation: add-fade-out 0.5s ease-in both; }
  .add-fade-in { animation: add-fade-in 0.5s ease-out both; }
  .add-tool-pop { animation: add-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .add-drop-success { animation: add-drop-success 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .add-target-pulse { animation: add-target-pulse 1.8s ease-in-out infinite; }
  .add-card-reappear { animation: add-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }

  .add-check-pulse {
    animation: add-tool-pulse-green 1.4s ease-out infinite;
  }

  .add-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
`;

// ─── 📦 TYPES ──────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface BoxState {
  capital: string;
  matchedSmall: string | null;
  isFilled: boolean;
  filledByCardId: string | null;
}

interface CardData {
  id: string;
  capital: string;
  small: string;
  isCorrect: boolean;
  wasDropped: boolean;
}

interface CardResult {
  id: string;
  capital: string;
  small: string;
  isCorrect: boolean;
  wasSelected: boolean;
  result: "correct" | "wrong" | "missed" | "ignored";
}

type Session = 1 | 2;
type TransitionPhase = "idle" | "fade-out" | "fade-in";
type Tool = "drag" | "clear";
type Point = { x: number; y: number };

const DESCENDER_LETTERS = new Set(["g", "j", "p", "q", "y"]);

const WIDE_CAPITALS = new Set(["M", "W", "N"]);
const WIDE_SMALLS = new Set(["m", "w", "n"]);

function hasDescender(text: string): boolean {
  if (!text) return false;
  for (const ch of text) {
    if (DESCENDER_LETTERS.has(ch.toLowerCase())) return true;
  }
  return false;
}

const LEVEL_LETTERS_MAP: Record<
  number,
  { session1: string[]; session2: string[] }
> = {
  8: { session1: ["A", "B", "C", "D"], session2: ["E", "F", "G"] },
  16: { session1: ["H", "I", "J", "K"], session2: ["L", "M", "N"] },
  23: { session1: ["O", "P", "Q"], session2: ["R", "S", "T"] },
  30: { session1: ["U", "V", "W"], session2: ["X", "Y", "Z"] },
};

// 🔥 PER-SESSION SLOT CONFIG
const SESSION_SLOT_CONFIG: Record<
  number,
  {
    session1: { boxSize: number; cardSize: number };
    session2: { boxSize: number; cardSize: number };
  }
> = {
  8: {
    session1: { boxSize: 200, cardSize: 130 },
    session2: { boxSize: 200, cardSize: 130 },
  },
  16: {
    session1: { boxSize: 200, cardSize: 130 },
    session2: { boxSize: 200, cardSize: 130 },
  },
  23: {
    session1: { boxSize: 220, cardSize: 140 },
    session2: { boxSize: 220, cardSize: 140 },
  },
  30: {
    session1: { boxSize: 220, cardSize: 140 },
    session2: { boxSize: 220, cardSize: 140 },
  },
};

function getSessionSlotConfig(
  level: number,
  session: Session,
): { boxSize: number; cardSize: number } {
  const config = SESSION_SLOT_CONFIG[level];
  if (!config) return { boxSize: 200, cardSize: 130 };
  return session === 1 ? config.session1 : config.session2;
}

// ─── 🔥 PREFERRED DISTRACTORS ────────────────────────────────
const PREFERRED_DISTRACTOR: Record<string, string> = {
  A: "b",  B: "d",  C: "e",  D: "c",  E: "o",  F: "t",  G: "j",
  H: "n",  I: "l",  J: "i",  K: "h",  L: "t",  M: "n",  N: "m",
  O: "e",  P: "b",  Q: "p",  R: "f",  S: "t",  T: "s",
  U: "y",  V: "u",  W: "v",  X: "s",  Y: "v",  Z: "w",
};

function buildFixedDistractorMap(
  sessionLetters: string[],
): Record<string, string> {
  const correctSmalls = new Set(
    sessionLetters.map((c) => c.toLowerCase()),
  );

  const usedDistractors = new Set<string>();
  const map: Record<string, string> = {};
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  sessionLetters.forEach((capital) => {
    const correctSmall = capital.toLowerCase();
    const preferred = PREFERRED_DISTRACTOR[capital];

    if (
      preferred &&
      preferred !== correctSmall &&
      !correctSmalls.has(preferred) &&
      !usedDistractors.has(preferred)
    ) {
      map[capital] = preferred;
      usedDistractors.add(preferred);
      return;
    }

    for (const ch of alphabet) {
      if (
        ch !== correctSmall &&
        !correctSmalls.has(ch) &&
        !usedDistractors.has(ch)
      ) {
        map[capital] = ch;
        usedDistractors.add(ch);
        return;
      }
    }

    map[capital] = "x";
  });

  return map;
}

// ─── 🛠️ STATS ──────────────────────────────────────────────────
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

interface DropRecord {
  boxIndex: number;
  capital: string;
  droppedLetter: string;
}

interface SessionSnapshot {
  totalBoxes: number;
  filledBoxes: number;
  correctDrops: number;
  allCards: Array<{
    id: string;
    capital: string;
    small: string;
    isCorrect: boolean;
  }>;
  cardResults: CardResult[];
  dropHistory: DropRecord[];
}

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1Letters: string[],
  s1Snapshot: SessionSnapshot | null,
  s2Letters: string[],
  s2Snapshot: SessionSnapshot | null,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Drag & Drop Match lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (lettersList: string[], snapshot: SessionSnapshot | null) => {
    for (const capital of lettersList) {
      const small = capital.toLowerCase();
      let status: string;

      if (!snapshot) {
        status = "Missed";
      } else {
        const drop = snapshot.dropHistory.find((d) => d.capital === capital);
        if (!drop) {
          status = "Missed";
        } else if (drop.droppedLetter === small) {
          status = "Correct";
        } else {
          status = "Wrong";
        }
      }

      lines.push(`Letter ${capital}${small} - ${status}`);
    }
  };

  buildLines(s1Letters, s1Snapshot);
  buildLines(s2Letters, s2Snapshot);

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
    "add-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "add-check-pulse" : ""}`}
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

export function AlphabetDragDropMatch({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const subjectColor = getSubjectColor(subject);

  const levelConfig = LEVEL_LETTERS_MAP[level];
  const SESSION_1_LETTERS = levelConfig?.session1 || ["A", "B", "C", "D"];
  const SESSION_2_LETTERS = levelConfig?.session2 || ["E", "F", "G"];

  const [session, setSession] = useState<Session>(1);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");

  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);

  const [undoStack, setUndoStack] = useState<
    Array<{ boxes: BoxState[]; cards: CardData[] }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ boxes: BoxState[]; cards: CardData[] }>
  >([]);
  const [tool, setTool] = useState<Tool>("drag");

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    letter: string | null;
    cardId: string | null;
    position: Point | null;
  }>({
    isDragging: false,
    letter: null,
    cardId: null,
    position: null,
  });

  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);

  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isNavigating] = useState(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const s1StatsRef = useRef<SessionStats>(emptyStats());
  const s2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isCheckingRef = useRef<boolean>(false);

  const s1FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const s2FinalSnapshotRef = useRef<SessionSnapshot | null>(null);

  const activeStatsRef = session === 1 ? s1StatsRef : s2StatsRef;

  const slotConfig = useMemo(
    () => getSessionSlotConfig(level, session),
    [level, session],
  );

  const actualBoxCount = useMemo(() => boxes.length, [boxes.length]);
  const actualCardCount = useMemo(() => cards.length, [cards.length]);

  // ══════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════

  const getSessionLetters = useCallback(
    (sessionNum: Session): string[] => {
      return sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
  );

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const buildCards = useCallback(
    (sessionNum: Session): CardData[] => {
      const sessionLetters = getSessionLetters(sessionNum);
      const distractorMap = buildFixedDistractorMap(sessionLetters);
      const allCards: CardData[] = [];

      sessionLetters.forEach((capital) => {
        allCards.push({
          id: `${capital}${capital.toLowerCase()}`,
          capital,
          small: capital.toLowerCase(),
          isCorrect: true,
          wasDropped: false,
        });

        const distractorSmall = distractorMap[capital];
        allCards.push({
          id: `${capital}${distractorSmall}`,
          capital,
          small: distractorSmall,
          isCorrect: false,
          wasDropped: false,
        });
      });

      return shuffleArray(allCards);
    },
    [getSessionLetters, shuffleArray],
  );

  const buildBoxes = useCallback(
    (sessionNum: Session): BoxState[] => {
      const sessionLetters = getSessionLetters(sessionNum);
      return sessionLetters.map((capital) => ({
        capital,
        matchedSmall: null,
        isFilled: false,
        filledByCardId: null,
      }));
    },
    [getSessionLetters],
  );

  const pushUndo = useCallback(
    (currentBoxes: BoxState[], currentCards: CardData[]) => {
      setUndoStack((prev) => [
        ...prev,
        {
          boxes: currentBoxes.map((b) => ({ ...b })),
          cards: currentCards.map((c) => ({ ...c })),
        },
      ]);
      setRedoStack([]);
    },
    [],
  );

  const filledCount = useMemo(
    () => boxes.filter((b) => b.isFilled).length,
    [boxes],
  );

  const totalBoxSlots = useMemo(() => boxes.length, [boxes]);

  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const newBoxes = buildBoxes(sessionNum);
      const newCards = buildCards(sessionNum);

      setBoxes(newBoxes);
      setCards(newCards);
      setUndoStack([]);
      setRedoStack([]);
      setTool("drag");
      setDragState({
        isDragging: false,
        letter: null,
        cardId: null,
        position: null,
      });
      setHoveredBoxIndex(null);
      setIsGameComplete(false);
      setTransitionPhase("idle");

      if (sessionNum === 1) {
        s1StatsRef.current = emptyStats();
      } else {
        s2StatsRef.current = emptyStats();
      }
      sessionStartTimeRef.current = Date.now();
    },
    [buildBoxes, buildCards],
  );

  const savePartialProgressRef = useRef<() => void>(() => {});

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

  useEffect(() => {
    isMountedRef.current = true;

    introPlayedRef.current = false;
    initializeGame(1);

    const introTimer = setTimeout(() => {
      if (isMountedRef.current) playIntroAudio();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopIntroAudio();
      if (transitionTimerRef.current)
        clearTimeout(transitionTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);

      if (!progressSavedRef.current) {
        savePartialProgressRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════
  //  DRAG HANDLERS
  // ══════════════════════════════════════════════════════════

  const getPointerPosition = useCallback(
    (e: React.PointerEvent | PointerEvent): Point => {
      return { x: e.clientX - 50, y: e.clientY - 50 };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, card: CardData) => {
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;
      if (isNavigating) return;
      if (dragState.isDragging) return;
      if (tool === "clear") return;
      if (card.wasDropped) return;
      if (filledCount >= totalBoxSlots) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        letter: card.small,
        cardId: card.id,
        position: getPointerPosition(e),
      });
    },
    [
      isGameComplete,
      transitionPhase,
      isNavigating,
      dragState.isDragging,
      tool,
      filledCount,
      totalBoxSlots,
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

      let hovered: number | null = null;
      boxes.forEach((box, index) => {
        if (box.isFilled) return;
        const boxEl = document.querySelector(`[data-box-index="${index}"]`);
        if (boxEl) {
          const rect = boxEl.getBoundingClientRect();
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
      setHoveredBoxIndex(hovered);
    },
    [dragState.isDragging, dragState.letter, boxes, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter || !dragState.cardId) {
        setDragState({
          isDragging: false,
          letter: null,
          cardId: null,
          position: null,
        });
        setHoveredBoxIndex(null);
        return;
      }

      const droppedCardId = dragState.cardId;
      const droppedLetter = dragState.letter;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({
        isDragging: false,
        letter: null,
        cardId: null,
        position: null,
      });
      setHoveredBoxIndex(null);

      let droppedIndex: number | null = null;
      boxes.forEach((box, index) => {
        if (box.isFilled) return;
        const boxEl = document.querySelector(`[data-box-index="${index}"]`);
        if (boxEl) {
          const rect = boxEl.getBoundingClientRect();
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

      pushUndo(boxes, cards);

      setBoxes((prev) =>
        prev.map((b, i) =>
          i === droppedIndex
            ? {
                ...b,
                matchedSmall: droppedLetter,
                isFilled: true,
                filledByCardId: droppedCardId,
              }
            : b,
        ),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.id === droppedCardId ? { ...c, wasDropped: true } : c,
        ),
      );

      activeStatsRef.current.totalDrops += 1;
    },
    [dragState, boxes, cards, pushUndo],
  );

  // ══════════════════════════════════════════════════════════
  //  CLEAR
  // ══════════════════════════════════════════════════════════

  const handleBoxTap = useCallback(
    (boxIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const box = boxes[boxIndex];
      if (!box.isFilled) return;

      const removedCardId = box.filledByCardId;
      if (!removedCardId) {
        console.warn(
          `[DragDrop] ⚠️ Box ${boxIndex} is filled but has no filledByCardId`,
        );
        return;
      }

      pushUndo(boxes, cards);

      setBoxes((prev) =>
        prev.map((b, i) =>
          i === boxIndex
            ? {
                ...b,
                matchedSmall: null,
                isFilled: false,
                filledByCardId: null,
              }
            : b,
        ),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.id === removedCardId ? { ...c, wasDropped: false } : c,
        ),
      );

      activeStatsRef.current.dropsRemoved += 1;
      setTool("drag");
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      boxes,
      cards,
      pushUndo,
    ],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [
      ...r,
      {
        boxes: boxes.map((b) => ({ ...b })),
        cards: cards.map((c) => ({ ...c })),
      },
    ]);
    setBoxes(prev.boxes);
    setCards(prev.cards);
  }, [undoStack, boxes, cards]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [
      ...u,
      {
        boxes: boxes.map((b) => ({ ...b })),
        cards: cards.map((c) => ({ ...c })),
      },
    ]);
    setBoxes(next.boxes);
    setCards(next.cards);
  }, [redoStack, boxes, cards]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  // ══════════════════════════════════════════════════════════
  //  CHECK
  // ══════════════════════════════════════════════════════════

  const canCheck = useMemo(() => {
    if (totalBoxSlots === 0) return false;
    return filledCount >= totalBoxSlots;
  }, [totalBoxSlots, filledCount]);

  const buildCardResults = useCallback(
    (allCards: CardData[], allBoxes: BoxState[]): CardResult[] => {
      const dropMap = new Map<string, string>();
      allBoxes.forEach((box) => {
        if (box.isFilled && box.matchedSmall) {
          dropMap.set(box.capital, box.matchedSmall);
        }
      });

      return allCards.map((card) => {
        const dropped = dropMap.get(card.capital);
        const wasSelected = dropped === card.small;

        let result: CardResult["result"];
        if (card.isCorrect && wasSelected) result = "correct";
        else if (!card.isCorrect && wasSelected) result = "wrong";
        else if (card.isCorrect && !wasSelected) result = "missed";
        else result = "ignored";

        return {
          id: card.id,
          capital: card.capital,
          small: card.small,
          isCorrect: card.isCorrect,
          wasSelected,
          result,
        };
      });
    },
    [],
  );

  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;

      return {
        type: "alphabet-drag-drop-match",
        lessonType: "drag-drop",
        sessions: [
          {
            sessionNum: 1,
            letters: SESSION_1_LETTERS,
            totalBoxes: s1?.totalBoxes ?? 0,
            filledBoxes: s1?.filledBoxes ?? 0,
            correctDrops: s1?.correctDrops ?? 0,
            allCards: s1?.allCards ?? [],
            cardResults: s1?.cardResults ?? [],
            dropHistory: s1?.dropHistory ?? [],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            letters: SESSION_2_LETTERS,
            totalBoxes: s2?.totalBoxes ?? 0,
            filledBoxes: s2?.filledBoxes ?? 0,
            correctDrops: s2?.correctDrops ?? 0,
            allCards: s2?.allCards ?? [],
            cardResults: s2?.cardResults ?? [],
            dropHistory: s2?.dropHistory ?? [],
            stats: { ...s2StatsRef.current },
          },
        ],
        completed,
      };
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
  );

  const saveFinalProgress = useCallback(async () => {
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
      s1FinalSnapshotRef.current,
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current,
      true,
    );

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject,
        level,
        lessonId,
        status: "completed",
        timeSpentSec: totalTimeSec,
        summary,
        gameData: buildGameData(true),
      });
      console.log("[DragDrop] ✅ Final progress saved to IndexedDB");
    } catch (err) {
      console.error("[DragDrop] ❌ Final save failed:", err);
    }
  }, [
    SESSION_1_LETTERS,
    SESSION_2_LETTERS,
    subject,
    level,
    lessonId,
    buildGameData,
  ]);

  const savePartialProgress = useCallback(async () => {
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
      s1FinalSnapshotRef.current,
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current,
      false,
    );

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject,
        level,
        lessonId,
        status: "uncompleted",
        timeSpentSec: elapsed,
        summary,
        gameData: buildGameData(false),
      });
      console.log("[DragDrop] 💾 Partial progress saved to IndexedDB");
    } catch (err) {
      console.warn("[DragDrop] ⚠️ Partial save failed:", err);
    }
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

  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    const stats = activeStatsRef.current;
    stats.finalDrops = filledCount;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    const sessionLetters =
      session === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
    const distractorMap = buildFixedDistractorMap(sessionLetters);

    const fullCards: CardData[] = [];
    sessionLetters.forEach((capital) => {
      fullCards.push({
        id: `${capital}${capital.toLowerCase()}`,
        capital,
        small: capital.toLowerCase(),
        isCorrect: true,
        wasDropped: false,
      });
      const dSmall = distractorMap[capital];
      fullCards.push({
        id: `${capital}${dSmall}`,
        capital,
        small: dSmall,
        isCorrect: false,
        wasDropped: false,
      });
    });

    const cardResults = buildCardResults(fullCards, boxes);
    const correctDrops = cardResults.filter(
      (r) => r.result === "correct",
    ).length;

    const dropHistory: DropRecord[] = boxes
      .filter((b) => b.isFilled && b.matchedSmall)
      .map((b, idx) => ({
        boxIndex: idx,
        capital: b.capital,
        droppedLetter: b.matchedSmall!,
      }));

    const snapshot: SessionSnapshot = {
      totalBoxes: boxes.length,
      filledBoxes: filledCount,
      correctDrops,
      allCards: fullCards.map((c) => ({
        id: c.id,
        capital: c.capital,
        small: c.small,
        isCorrect: c.isCorrect,
      })),
      cardResults,
      dropHistory,
    };

    if (session === 1) {
      s1FinalSnapshotRef.current = snapshot;
    } else {
      s2FinalSnapshotRef.current = snapshot;
    }

    if (session === 1) {
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
      setIsGameComplete(true);

      await saveFinalProgress();

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
    filledCount,
    boxes,
    session,
    SESSION_1_LETTERS,
    SESSION_2_LETTERS,
    buildCardResults,
    initializeGame,
    navigate,
    subject,
    level,
    lessonId,
    saveFinalProgress,
  ]);

  // ══════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ══════════════════════════════════════════════════════════

  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "add-fade-out";
    if (transitionPhase === "fade-in") return "add-fade-in";
    return "";
  };

  const getBoxFontSize = useCallback(
    (text: string) => {
      const count = Math.max(actualBoxCount, 1);
      const scale =
        count <= 2 ? 1.5 :
        count === 3 ? 1.3 :
        count === 4 ? 1.15 :
        count === 5 ? 1.0 :
        count === 6 ? 0.9 :
        count === 7 ? 0.82 :
        count === 8 ? 0.75 : 0.7;

      const firstChar = text[0] || "";
      const secondChar = text[1] || "";

      let wideScale = 1;
      if (WIDE_CAPITALS.has(firstChar) || WIDE_SMALLS.has(secondChar)) {
        wideScale = 0.7;
      }

      const isDesc = hasDescender(text);
      const descenderScale = isDesc ? 0.85 : 1;

      const finalScale = scale * wideScale * descenderScale;

      const vh = 18 * finalScale;
      const px = 260 * finalScale;

      return `clamp(1.4rem, ${vh}vh, ${px}px)`;
    },
    [actualBoxCount],
  );

  const getSmallFontSize = useCallback(
    (letter: string) => {
      const count = Math.max(actualCardCount, 1);
      const scale =
        count <= 4 ? 1.5 :
        count === 5 ? 1.4 :
        count === 6 ? 1.25 :
        count === 7 ? 1.1 :
        count === 8 ? 1.0 :
        count === 9 ? 0.9 :
        count === 10 ? 0.8 :
        count === 11 ? 0.72 :
        count === 12 ? 0.65 : 0.6;

      const wideScale = WIDE_SMALLS.has(letter) ? 0.75 : 1;
      const descenderScale = DESCENDER_LETTERS.has(letter) ? 0.85 : 1;

      const finalScale = scale * wideScale * descenderScale;

      const vh = 15 * finalScale;
      const px = 220 * finalScale;

      return `clamp(1.4rem, ${vh}vh, ${px}px)`;
    },
    [actualCardCount],
  );

  const renderBox = (box: BoxState, index: number) => {
    const isFilled = box.isFilled;
    const isHovered = hoveredBoxIndex === index;
    const isToolClear = tool === "clear";
    const displayText =
      isFilled && box.matchedSmall
        ? `${box.capital}${box.matchedSmall}`
        : box.capital;

    const fontSize = getBoxFontSize(displayText);
    const displayHasDescender = hasDescender(displayText);

    const letterStyle: React.CSSProperties = displayHasDescender
      ? { lineHeight: 1.25, transform: "translateY(-8%)" }
      : { lineHeight: 1 };

    let bgColor = "transparent";
    let borderColor = subjectColor.emptyBoxBorder;
    let textColor = subjectColor.cardBg;
    let shadowColor = "rgba(0,0,0,0.05)";
    let scaleClass = "";
    let cursorClass = "cursor-default";

    if (isFilled) {
      bgColor = ROYAL_BLUE;
      borderColor = "#FFFFFF";
      textColor = "#FFFFFF";
      shadowColor = "oklch(0.4 0.18 260 / 0.9)";
      scaleClass = "add-drop-success";
      if (isToolClear) cursorClass = "cursor-crosshair";
    } else if (isHovered && dragState.isDragging) {
      borderColor = subjectColor.cardBg;
      shadowColor = "rgba(77, 130, 246, 0.3)";
      scaleClass = "add-target-pulse";
    }

    const isDisabled = isGameComplete || transitionPhase !== "idle";

    return (
      <div
        key={`box-${index}`}
        data-box-index={index}
        onClick={() => handleBoxTap(index)}
        className={`
          add-pop-in clay-sm relative flex w-full flex-col items-center justify-center
          rounded-2xl border-4 transition-all duration-200
          ${scaleClass} ${cursorClass}
          ${isDisabled ? "opacity-60" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          aspectRatio: "1/1",
          paddingTop: "6px",
          paddingBottom: displayHasDescender ? "12px" : "6px",
          paddingLeft: "6px",
          paddingRight: "6px",
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor: borderColor,
          backgroundColor: bgColor,
          overflow: displayHasDescender ? "visible" : "hidden",
        }}
      >
        <div
          className="flex items-center justify-center w-full h-full"
          style={{
            overflow: displayHasDescender ? "visible" : "hidden",
          }}
        >
          <span
            style={{
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize,
              color: textColor,
              textShadow: isFilled
                ? "0 2px 8px rgba(0,0,0,0.25)"
                : "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease, font-size 0.2s ease",
              maxWidth: "100%",
              maxHeight: displayHasDescender ? "none" : "100%",
              overflow: displayHasDescender ? "visible" : "hidden",
              whiteSpace: "nowrap",
              ...letterStyle,
            }}
          >
            {displayText}
          </span>
        </div>
      </div>
    );
  };

  const renderSmallCard = (card: CardData, index: number) => {
    const isDraggingThis =
      dragState.cardId === card.id && dragState.isDragging;
    const fontSize = getSmallFontSize(card.small);
    const isDescender = DESCENDER_LETTERS.has(card.small);

    const letterStyle: React.CSSProperties = isDescender
      ? { lineHeight: 1.25, transform: "translateY(-8%)" }
      : { lineHeight: 1 };

    const isDisabled =
      isGameComplete || transitionPhase !== "idle" || tool === "clear";

    const isDropped = card.wasDropped;

    return (
      <div
        key={`small-${card.id}-${index}-${isDropped ? "out" : "in"}`}
        className={`
          flex w-full items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : ""}
          ${isDropped ? "add-card-hidden" : "add-card-reappear"}
          ${isDisabled && !isDropped ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDropped ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          aspectRatio: "1 / 1",
          paddingTop: "6px",
          paddingBottom: isDescender ? "10px" : "6px",
          paddingLeft: "4px",
          paddingRight: "4px",
          touchAction: "none",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          opacity: isDropped ? 0 : 1,
          visibility: isDropped ? "hidden" : "visible",
          overflow: isDescender ? "visible" : "hidden",
        }}
        onPointerDown={(e) =>
          !isDisabled && !isDraggingThis && !isDropped && handlePointerDown(e, card)
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && !isDropped && (
          <span
            style={{
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: ROYAL_BLUE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              maxWidth: "100%",
              maxHeight: isDescender ? "none" : "100%",
              overflow: isDescender ? "visible" : "hidden",
              whiteSpace: "nowrap",
              ...letterStyle,
            }}
          >
            {card.small}
          </span>
        )}
      </div>
    );
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = filledCount > 0;
  const isTransitioning = transitionPhase !== "idle";

  const boxesGridWidth = boxes.length * slotConfig.boxSize;
  const cardsGridWidth = cards.length * slotConfig.cardSize;

  const floatingLetterHasDescender = dragState.letter
    ? DESCENDER_LETTERS.has(dragState.letter)
    : false;

  return (
    <div
      ref={boardRef}
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
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
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud px-4 py-6"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full flex-1 items-center justify-center px-6 sm:px-10 md:px-14">
          <div
            className="grid place-items-center gap-3 sm:gap-4 md:gap-5"
            style={{
              gridTemplateColumns: `repeat(${boxes.length}, minmax(0, 1fr))`,
              width: `min(100%, ${boxesGridWidth}px)`,
            }}
          >
            {boxes.map((box, index) => renderBox(box, index))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center pb-4">
          <div
            className="grid place-items-center gap-2 sm:gap-3 md:gap-4"
            style={{
              gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
              width: `min(100%, ${cardsGridWidth}px)`,
            }}
          >
            {cards.map((card, index) => renderSmallCard(card, index))}
          </div>
        </div>
      </div>

      {dragState.isDragging && dragState.letter && dragState.position && (
        <span
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4rem, 15vh, 8rem)",
            color: ROYAL_BLUE,
            lineHeight: floatingLetterHasDescender ? 1.3 : 1,
            letterSpacing: "0.02em",
            transform: `translate(-50%, -50%) scale(1.15) rotate(-3deg)${
              floatingLetterHasDescender ? " translateY(-4%)" : ""
            }`,
            textShadow:
              "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            overflow: "visible",
          }}
        >
          {dragState.letter}
        </span>
      )}
    </div>
  );
}

export default AlphabetDragDropMatch;