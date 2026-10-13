// src/components/games/English/Alphabet-Assessment/AlphabetMakeCorrectPairs.tsx
// ✅ ONE BOX AT A TIME — center stage flow
// 🔥 Flow:
//    1. Show ONLY current box in center + ALL cards in bottom row
//    2. Audio plays automatically when box appears
//    3. Drag ANY 2 cards into the box → pair forms
//    4. Check button pulses green once box has 2 cards
//    5. Click Check → advance to next box (audio plays for next box)
//    6. Both cards disappear from box, next box appears
//    7. Last box → save + navigate next lesson
//
// 🔥 AUDIO per box: plays AUTOMATICALLY when box appears
//    Source: src/assets/English Assessment Audios/Alphabet Make Correct Pairs/{Letter}.wav
//
// ✅ Silent bulk-style drag-drop (no correct/wrong feedback during play)
// ✅ Toolbar: Undo, Redo, Clear, Check
// ✅ Descenders NOT cut (cards + boxes both)
// ✅ Bottom option cards — TRANSPARENT bg + ROYAL BLUE letters
// ✅ Filled box — ROYAL BLUE bg + WHITE text
// ✅ Progress saved with per-box results (correct/wrong/missed)
// ✅ NO progress dots — clean center stage
// ✅ ALL cards reset/shown for every new box (full distractors)
//
// ✅ UPDATED (v2): SUMMARY added
//    - Per-letter result: "Letter Aa - Correct" / "Letter Bb - Wrong" / "Letter Cc - Missed"
//    - Uncompleted: "Student did not complete the Make Correct Pairs lesson."

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

// ══════════════════════════════════════════════════════════════
//  🔥 PER-LETTER AUDIO MODULES
// ══════════════════════════════════════════════════════════════

const LETTER_AUDIO_MODULES = import.meta.glob<string>(
  "@/assets/English Assessment Audios/Alphabet Make Correct Pairs/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildLetterAudioMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(LETTER_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^([A-Za-z])\.wav$/);
    if (match) {
      map[match[1].toUpperCase()] = url;
    }
  }
  console.log(
    `[MakeCorrectPairs] Loaded ${Object.keys(map).length} letter audios:`,
    Object.keys(map).sort().join(", "),
  );
  return map;
}

const LETTER_AUDIO: Record<string, string> = buildLetterAudioMap();

function getLetterAudioUrl(letter: string): string | null {
  const url = LETTER_AUDIO[letter.toUpperCase()];
  if (!url) {
    console.warn(`[MakeCorrectPairs] No audio for letter: ${letter}`);
    return null;
  }
  return url;
}

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

// ─── SUBJECT COLORS ──────────────────────────────────────
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
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#4D82F6",
    },
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#2E8B57",
    },
    urdu: {
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#CC6B2C",
    },
  };
  return colors[subject] || colors.english;
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
  @keyframes mcp-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mcp-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes mcp-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mcp-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mcp-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes mcp-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes mcp-target-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(77, 130, 246, 0);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(77, 130, 246, 0.15);
      transform: scale(1.02);
    }
  }
  @keyframes mcp-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes mcp-box-slide-in {
    0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.08) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mcp-box-celebrate {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.12); }
    60%  { transform: scale(0.98); }
    100% { transform: scale(1); }
  }

  .mcp-pop-in { animation: mcp-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .mcp-fade-out { animation: mcp-fade-out 0.5s ease-in both; }
  .mcp-fade-in { animation: mcp-fade-in 0.5s ease-out both; }
  .mcp-tool-pop { animation: mcp-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .mcp-check-pulse { animation: mcp-tool-pulse-green 1.4s ease-out infinite; }
  .mcp-drop-success { animation: mcp-drop-success 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .mcp-target-pulse { animation: mcp-target-pulse 1.8s ease-in-out infinite; }
  .mcp-card-reappear { animation: mcp-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }
  .mcp-box-slide-in { animation: mcp-box-slide-in 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .mcp-box-celebrate { animation: mcp-box-celebrate 0.5s cubic-bezier(.34,1.4,.64,1) both; }

  .mcp-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
`;

// ─── TYPES ────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface Slot {
  letter: string;
  cardId: string;
  type: "capital" | "small";
}

interface BoxState {
  slots: [Slot | null, Slot | null];
}

interface CardData {
  id: string;
  letter: string;
  type: "capital" | "small";
  wasDropped: boolean;
  sourceLetter: string;
}

type Session = 1 | 2;
type TransitionPhase = "idle" | "fade-out" | "fade-in";
type Tool = "drag" | "clear";
type Point = { x: number; y: number };

const DESCENDER_LETTERS = new Set(["g", "j", "p", "q", "y"]);

function hasDescender(text: string): boolean {
  if (!text) return false;
  for (const ch of text) {
    if (DESCENDER_LETTERS.has(ch.toLowerCase())) return true;
  }
  return false;
}

// ─── STATS + SNAPSHOT ─────────────────────────────────────
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

interface BoxResult {
  boxIndex: number;
  expectedCapital: string;
  expectedSmall: string;
  userSlot1: string | null;
  userSlot2: string | null;
  userSlot1Type: "capital" | "small" | null;
  userSlot2Type: "capital" | "small" | null;
  result: "correct" | "wrong" | "partial" | "missed";
  audioPlayed: boolean;
  checkedAtSec: number;
}

interface SessionSnapshot {
  totalBoxes: number;
  filledBoxes: number;
  correctBoxes: number;
  allBoxes: Array<{
    boxIndex: number;
    expectedCapital: string;
    expectedSmall: string;
  }>;
  boxResults: BoxResult[];
}

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1BoxResults: BoxResult[],
  s2BoxResults: BoxResult[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Make Correct Pairs lesson.`;
  }

  const lines: string[] = [];
  const allResults = [...s1BoxResults, ...s2BoxResults];

  for (const r of allResults) {
    const tag = `Letter ${r.expectedCapital}${r.expectedSmall}`;
    let status: string;
    if (r.result === "correct") status = "Correct";
    else if (r.result === "missed") status = "Missed";
    else status = "Wrong"; // partial + wrong both → Wrong
    lines.push(`${tag} - ${status}`);
  }

  return lines.join("\n");
}

// ─── TOOLBAR ──────────────────────────────────────────────
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
    "mcp-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "mcp-check-pulse" : ""}`}
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
        <ToolButton onClick={onUndo} disabled={!canUndo || isTransitioning} ariaLabel="Undo">
          <Undo2 className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <ToolButton onClick={onRedo} disabled={!canRedo || isTransitioning} ariaLabel="Redo">
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

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export function AlphabetMakeCorrectPairs({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const subjectColor = getSubjectColor(subject);

  // ─── SESSION LETTERS — dedup from `letters` prop ─────────
  const sessionLetters = useMemo(() => {
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const l of letters) {
      if (!l) continue;
      const key = l.toUpperCase();
      if (seen.has(key)) {
        console.warn(`[MakeCorrectPairs] Duplicate letter filtered: ${l}`);
        continue;
      }
      seen.add(key);
      clean.push(key);
    }

    if (level === 23 || level === 30) {
      return {
        session1: clean.slice(0, 3),
        session2: clean.slice(3, 6),
      };
    }
    return {
      session1: clean.slice(0, 4),
      session2: clean.slice(4, 7),
    };
  }, [letters, level]);

  const SESSION_1_LETTERS = sessionLetters.session1;
  const SESSION_2_LETTERS = sessionLetters.session2;

  const [session, setSession] = useState<Session>(1);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");

  const [currentBoxIndex, setCurrentBoxIndex] = useState(0);

  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);

  const [undoStack, setUndoStack] = useState<
    Array<{ boxes: BoxState[]; cards: CardData[]; currentBoxIndex: number }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ boxes: BoxState[]; cards: CardData[]; currentBoxIndex: number }>
  >([]);
  const [tool, setTool] = useState<Tool>("drag");

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    letter: string | null;
    cardId: string | null;
    cardType: "capital" | "small" | null;
    position: Point | null;
  }>({
    isDragging: false,
    letter: null,
    cardId: null,
    cardType: null,
    position: null,
  });

  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isNavigating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioLockRef = useRef<boolean>(false);

  const s1StatsRef = useRef<SessionStats>(emptyStats());
  const s2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isCheckingRef = useRef<boolean>(false);

  const s1FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const s2FinalSnapshotRef = useRef<SessionSnapshot | null>(null);

  const s1BoxResultsRef = useRef<BoxResult[]>([]);
  const s2BoxResultsRef = useRef<BoxResult[]>([]);

  const activeStatsRef = session === 1 ? s1StatsRef : s2StatsRef;
  const activeBoxResultsRef = session === 1 ? s1BoxResultsRef : s2BoxResultsRef;

  // ─── HELPERS ─────────────────────────────────────────────
  const getSessionLetters = useCallback(
    (sessionNum: Session): string[] =>
      sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS,
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
      const sessionLettersList = getSessionLetters(sessionNum);
      const allCards: CardData[] = [];

      sessionLettersList.forEach((cap, idx) => {
        const capital = cap.toUpperCase();
        const small = cap.toLowerCase();

        allCards.push({
          id: `cap-${idx}-${capital}`,
          letter: capital,
          type: "capital",
          wasDropped: false,
          sourceLetter: capital,
        });

        allCards.push({
          id: `sml-${idx}-${small}`,
          letter: small,
          type: "small",
          wasDropped: false,
          sourceLetter: capital,
        });
      });

      return shuffleArray(allCards);
    },
    [getSessionLetters, shuffleArray],
  );

  const buildBoxes = useCallback(
    (sessionNum: Session): BoxState[] => {
      const sessionLettersList = getSessionLetters(sessionNum);
      return sessionLettersList.map(() => ({
        slots: [null, null] as [Slot | null, Slot | null],
      }));
    },
    [getSessionLetters],
  );

  const pushUndo = useCallback(
    (
      currentBoxes: BoxState[],
      currentCards: CardData[],
      currentBoxIdx: number,
    ) => {
      setUndoStack((prev) => [
        ...prev,
        {
          boxes: currentBoxes.map((b) => ({
            slots: [
              b.slots[0] ? { ...b.slots[0] } : null,
              b.slots[1] ? { ...b.slots[1] } : null,
            ] as [Slot | null, Slot | null],
          })),
          cards: currentCards.map((c) => ({ ...c })),
          currentBoxIndex: currentBoxIdx,
        },
      ]);
      setRedoStack([]);
    },
    [],
  );

  const getBoxFilledCount = (box: BoxState): number =>
    (box.slots[0] ? 1 : 0) + (box.slots[1] ? 1 : 0);

  const currentBox = useMemo(
    () => boxes[currentBoxIndex] ?? { slots: [null, null] },
    [boxes, currentBoxIndex],
  );

  const currentBoxFilledCount = useMemo(
    () => getBoxFilledCount(currentBox),
    [currentBox],
  );

  const totalBoxes = boxes.length;

  // ─── AUDIO PLAYER ────────────────────────────────────────
  const playLetterAudio = useCallback(
    (letter: string): Promise<void> => {
      return new Promise((resolve) => {
        const url = getLetterAudioUrl(letter);
        if (!url) {
          resolve();
          return;
        }

        try {
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.onended = null;
              audioRef.current.onerror = null;
            } catch {}
            audioRef.current = null;
          }

          const audio = new Audio(url);
          audioRef.current = audio;
          setIsPlayingAudio(true);

          const finish = () => {
            setIsPlayingAudio(false);
            if (audioRef.current === audio) {
              audioRef.current = null;
            }
            resolve();
          };

          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        } catch {
          setIsPlayingAudio(false);
          resolve();
        }
      });
    },
    [],
  );

  const playAudioForBox = useCallback(
    (boxIndex: number, sessionNum: Session) => {
      const list =
        sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
      const letter = (list[boxIndex] ?? "").toUpperCase();
      if (!letter) return;

      if (audioLockRef.current) return;
      audioLockRef.current = true;

      playLetterAudio(letter).finally(() => {
        audioLockRef.current = false;
      });
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS, playLetterAudio],
  );

  // ─── INITIALIZE ──────────────────────────────────────────
  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const newBoxes = buildBoxes(sessionNum);
      const newCards = buildCards(sessionNum);

      setBoxes(newBoxes);
      setCards(newCards);
      setCurrentBoxIndex(0);
      setUndoStack([]);
      setRedoStack([]);
      setTool("drag");
      setDragState({
        isDragging: false,
        letter: null,
        cardId: null,
        cardType: null,
        position: null,
      });
      setHoveredBoxIndex(null);
      setIsGameComplete(false);
      setTransitionPhase("idle");

      if (sessionNum === 1) {
        s1StatsRef.current = emptyStats();
        s1BoxResultsRef.current = [];
      } else {
        s2StatsRef.current = emptyStats();
        s2BoxResultsRef.current = [];
      }

      sessionStartTimeRef.current = Date.now();
    },
    [buildBoxes, buildCards],
  );

  useEffect(() => {
    isMountedRef.current = true;
    initializeGame(1);

    const t = setTimeout(() => {
      if (isMountedRef.current) {
        playAudioForBox(0, 1);
      }
    }, 400);

    return () => {
      clearTimeout(t);
      isMountedRef.current = false;
      if (transitionTimerRef.current)
        clearTimeout(transitionTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
        } catch {}
        audioRef.current = null;
      }
      if (!progressSavedRef.current) savePartialProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevBoxIndexRef = useRef<number>(-1);
  const prevSessionRef = useRef<Session>(1);

  useEffect(() => {
    if (boxes.length === 0) return;
    if (transitionPhase !== "idle") return;
    if (isGameComplete) return;

    const boxChanged = prevBoxIndexRef.current !== currentBoxIndex;
    const sessionChanged = prevSessionRef.current !== session;

    if (boxChanged || sessionChanged) {
      prevBoxIndexRef.current = currentBoxIndex;
      prevSessionRef.current = session;

      const t = setTimeout(() => {
        if (isMountedRef.current) {
          playAudioForBox(currentBoxIndex, session);
        }
      }, 300);

      return () => clearTimeout(t);
    }
  }, [
    currentBoxIndex,
    session,
    boxes.length,
    transitionPhase,
    isGameComplete,
    playAudioForBox,
  ]);

  // ─── DRAG HANDLERS ───────────────────────────────────────
  const getPointerPosition = useCallback(
    (e: React.PointerEvent | PointerEvent): Point => ({
      x: e.clientX - 50,
      y: e.clientY - 50,
    }),
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
      if (currentBoxFilledCount >= 2) return;
      if (isPlayingAudio) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        letter: card.letter,
        cardId: card.id,
        cardType: card.type,
        position: getPointerPosition(e),
      });
    },
    [
      isGameComplete,
      transitionPhase,
      isNavigating,
      dragState.isDragging,
      tool,
      currentBoxFilledCount,
      isPlayingAudio,
      getPointerPosition,
    ],
  );

  const findFirstEmptySlot = (box: BoxState): 0 | 1 | null => {
    if (box.slots[0] === null) return 0;
    if (box.slots[1] === null) return 1;
    return null;
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter) return;
      e.preventDefault();

      setDragState((prev) => ({
        ...prev,
        position: getPointerPosition(e),
      }));

      const boxEl = document.querySelector(
        `[data-box-index="${currentBoxIndex}"]`,
      );
      if (boxEl) {
        const rect = boxEl.getBoundingClientRect();
        const padding = 20;
        const isOver =
          e.clientX >= rect.left - padding &&
          e.clientX <= rect.right + padding &&
          e.clientY >= rect.top - padding &&
          e.clientY <= rect.bottom + padding;
        setHoveredBoxIndex(isOver ? currentBoxIndex : null);
      } else {
        setHoveredBoxIndex(null);
      }
    },
    [
      dragState.isDragging,
      dragState.letter,
      currentBoxIndex,
      getPointerPosition,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dragState.isDragging ||
        !dragState.letter ||
        !dragState.cardId ||
        !dragState.cardType
      ) {
        setDragState({
          isDragging: false,
          letter: null,
          cardId: null,
          cardType: null,
          position: null,
        });
        setHoveredBoxIndex(null);
        return;
      }

      const droppedCardId = dragState.cardId;
      const droppedLetter = dragState.letter;
      const droppedType = dragState.cardType;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({
        isDragging: false,
        letter: null,
        cardId: null,
        cardType: null,
        position: null,
      });
      setHoveredBoxIndex(null);

      const boxEl = document.querySelector(
        `[data-box-index="${currentBoxIndex}"]`,
      );
      if (!boxEl) return;

      const rect = boxEl.getBoundingClientRect();
      const padding = 20;
      const isOver =
        clientX >= rect.left - padding &&
        clientX <= rect.right + padding &&
        clientY >= rect.top - padding &&
        clientY <= rect.bottom + padding;

      if (!isOver) return;

      const box = boxes[currentBoxIndex];
      const emptySlot = findFirstEmptySlot(box);
      if (emptySlot === null) return;

      pushUndo(boxes, cards, currentBoxIndex);

      setBoxes((prev) =>
        prev.map((b, i) => {
          if (i !== currentBoxIndex) return b;
          const slot = findFirstEmptySlot(b);
          if (slot === null) return b;

          const newSlots: [Slot | null, Slot | null] = [
            b.slots[0] ? { ...b.slots[0] } : null,
            b.slots[1] ? { ...b.slots[1] } : null,
          ];
          newSlots[slot] = {
            letter: droppedLetter,
            cardId: droppedCardId,
            type: droppedType,
          };
          return { slots: newSlots };
        }),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.id === droppedCardId ? { ...c, wasDropped: true } : c,
        ),
      );

      activeStatsRef.current.totalDrops += 1;
    },
    [
      dragState,
      boxes,
      cards,
      currentBoxIndex,
      pushUndo,
    ],
  );

  // ─── CLEAR ───────────────────────────────────────────────
  const handleBoxTap = useCallback(
    (boxIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;
      if (boxIndex !== currentBoxIndex) return;

      const box = boxes[boxIndex];
      if (getBoxFilledCount(box) === 0) return;

      pushUndo(boxes, cards, currentBoxIndex);

      const idsToRestore: string[] = [];
      if (box.slots[0]) idsToRestore.push(box.slots[0].cardId);
      if (box.slots[1]) idsToRestore.push(box.slots[1].cardId);

      setBoxes((prev) =>
        prev.map((b, i) =>
          i === boxIndex
            ? { slots: [null, null] as [Slot | null, Slot | null] }
            : b,
        ),
      );

      setCards((prev) =>
        prev.map((c) => {
          if (idsToRestore.includes(c.id)) {
            return { ...c, wasDropped: false };
          }
          return c;
        }),
      );

      activeStatsRef.current.dropsRemoved += idsToRestore.length;
      setTool("drag");
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      boxes,
      cards,
      currentBoxIndex,
      pushUndo,
    ],
  );

  // ─── UNDO / REDO ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [
      ...r,
      {
        boxes: boxes.map((b) => ({
          slots: [
            b.slots[0] ? { ...b.slots[0] } : null,
            b.slots[1] ? { ...b.slots[1] } : null,
          ] as [Slot | null, Slot | null],
        })),
        cards: cards.map((c) => ({ ...c })),
        currentBoxIndex,
      },
    ]);
    setBoxes(prev.boxes);
    setCards(prev.cards);
    setCurrentBoxIndex(prev.currentBoxIndex);
  }, [undoStack, boxes, cards, currentBoxIndex]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [
      ...u,
      {
        boxes: boxes.map((b) => ({
          slots: [
            b.slots[0] ? { ...b.slots[0] } : null,
            b.slots[1] ? { ...b.slots[1] } : null,
          ] as [Slot | null, Slot | null],
        })),
        cards: cards.map((c) => ({ ...c })),
        currentBoxIndex,
      },
    ]);
    setBoxes(next.boxes);
    setCards(next.cards);
    setCurrentBoxIndex(next.currentBoxIndex);
  }, [redoStack, boxes, cards, currentBoxIndex]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  // ─── CAN CHECK? ──────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (totalBoxes === 0) return false;
    return currentBoxFilledCount >= 2;
  }, [totalBoxes, currentBoxFilledCount]);

  // ─── BUILD RESULTS ───────────────────────────────────────
  const buildSingleBoxResult = useCallback(
    (boxIndex: number, box: BoxState, audioPlayed: boolean): BoxResult => {
      const sessionLettersList = getSessionLetters(session);
      const expectedCap = sessionLettersList[boxIndex] ?? "";
      const expectedCapital = expectedCap.toUpperCase();
      const expectedSmall = expectedCap.toLowerCase();

      const slot0 = box.slots[0];
      const slot1 = box.slots[1];

      const userSlot1 = slot0?.letter ?? null;
      const userSlot2 = slot1?.letter ?? null;
      const userSlot1Type = slot0?.type ?? null;
      const userSlot2Type = slot1?.type ?? null;

      const letters = [userSlot1, userSlot2].filter(Boolean) as string[];
      const hasCapital = letters.includes(expectedCapital);
      const hasSmall = letters.includes(expectedSmall);

      let result: BoxResult["result"];
      if (hasCapital && hasSmall) result = "correct";
      else if (letters.length === 0) result = "missed";
      else if (letters.length === 1) result = "partial";
      else result = "wrong";

      return {
        boxIndex,
        expectedCapital,
        expectedSmall,
        userSlot1,
        userSlot2,
        userSlot1Type,
        userSlot2Type,
        result,
        audioPlayed,
        checkedAtSec: Math.floor(
          (Date.now() - sessionStartTimeRef.current) / 1000,
        ),
      };
    },
    [session, getSessionLetters],
  );

  // ─── RESET CARDS FOR NEW BOX ─────────────────────────────
  const resetAllCards = useCallback(() => {
    setCards((prev) =>
      prev.map((c) => (c.wasDropped ? { ...c, wasDropped: false } : c)),
    );
  }, []);

  // ─── CHECK — advance to next box ─────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const boxIndex = currentBoxIndex;
    const box = boxes[boxIndex];

    const result = buildSingleBoxResult(boxIndex, box, true);
    activeBoxResultsRef.current = [...activeBoxResultsRef.current, result];

    const isLastBox = boxIndex >= totalBoxes - 1;

    if (!isLastBox) {
      resetAllCards();
      setCurrentBoxIndex((prev) => prev + 1);
      isCheckingRef.current = false;
    } else {
      const stats = activeStatsRef.current;
      stats.finalDrops = activeBoxResultsRef.current.length;
      stats.timeSec = Math.floor(
        (Date.now() - sessionStartTimeRef.current) / 1000,
      );

      const allResults = activeBoxResultsRef.current;
      const correctBoxes = allResults.filter(
        (r) => r.result === "correct",
      ).length;

      const sessionLettersList = getSessionLetters(session);
      const snapshot: SessionSnapshot = {
        totalBoxes: totalBoxes,
        filledBoxes: allResults.length,
        correctBoxes,
        allBoxes: sessionLettersList.map((cap, i) => ({
          boxIndex: i,
          expectedCapital: cap.toUpperCase(),
          expectedSmall: cap.toLowerCase(),
        })),
        boxResults: allResults,
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
    }
  }, [
    canCheck,
    transitionPhase,
    currentBoxIndex,
    boxes,
    session,
    getSessionLetters,
    totalBoxes,
    buildSingleBoxResult,
    resetAllCards,
    initializeGame,
    navigate,
    subject,
    level,
    lessonId,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;

      return {
        type: "alphabet-make-correct-pairs",
        lessonType: "make-pairs",
        sessions: [
          {
            sessionNum: 1,
            letters: SESSION_1_LETTERS,
            totalBoxes: s1?.totalBoxes ?? 0,
            filledBoxes: s1?.filledBoxes ?? 0,
            correctBoxes: s1?.correctBoxes ?? 0,
            allBoxes: s1?.allBoxes ?? [],
            boxResults:
              s1?.boxResults ?? [...s1BoxResultsRef.current],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            letters: SESSION_2_LETTERS,
            totalBoxes: s2?.totalBoxes ?? 0,
            filledBoxes: s2?.filledBoxes ?? 0,
            correctBoxes: s2?.correctBoxes ?? 0,
            allBoxes: s2?.allBoxes ?? [],
            boxResults:
              s2?.boxResults ?? [...s2BoxResultsRef.current],
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
      s1FinalSnapshotRef.current?.boxResults ?? s1BoxResultsRef.current,
      s2FinalSnapshotRef.current?.boxResults ?? s2BoxResultsRef.current,
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
      console.error("[MakeCorrectPairs] Save failed:", err);
    });
  }, [
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
      s1FinalSnapshotRef.current?.boxResults ?? s1BoxResultsRef.current,
      s2FinalSnapshotRef.current?.boxResults ?? s2BoxResultsRef.current,
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
    subject,
    level,
    lessonId,
    buildGameData,
  ]);

  // ─── RENDER HELPERS ──────────────────────────────────────
  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "mcp-fade-out";
    if (transitionPhase === "fade-in") return "mcp-fade-in";
    return "";
  };

  const getBoxFontSize = (text: string) => {
    if (text.length >= 2) {
      if (text === "Ww" || text === "Mm") return "clamp(4.5rem, 16vh, 9rem)";
      if (hasDescender(text)) return "clamp(5rem, 18vh, 9.5rem)";
      return "clamp(5.5rem, 20vh, 10rem)";
    }
    if (hasDescender(text)) return "clamp(5rem, 18vh, 9.5rem)";
    return "clamp(5.5rem, 20vh, 10rem)";
  };

  const getCardFontSize = (letter: string) => {
    const isDescender =
      letter === letter.toLowerCase() && DESCENDER_LETTERS.has(letter);
    if (letter === "W" || letter === "w" || letter === "M" || letter === "m")
      return "clamp(2.5rem, 9vh, 5rem)";
    if (isDescender) return "clamp(2.8rem, 11vh, 5.5rem)";
    return "clamp(3.5rem, 13vh, 6.5rem)";
  };

  const getCardsGridCols = () => {
    const totalCards = cards.length;
    if (totalCards >= 8) return "grid-cols-8";
    if (totalCards === 7) return "grid-cols-7";
    if (totalCards === 6) return "grid-cols-6";
    if (totalCards === 5) return "grid-cols-5";
    if (totalCards === 4) return "grid-cols-4";
    return "grid-cols-8";
  };

  // ─── RENDER SINGLE BOX ───────────────────────────────────
  const renderSingleBox = () => {
    if (totalBoxes === 0) return null;

    const box = currentBox;
    const isHovered = hoveredBoxIndex === currentBoxIndex;
    const filledCount = currentBoxFilledCount;
    const isFilled = filledCount === 2;
    const isPartial = filledCount === 1;
    const isToolClear = tool === "clear";

    const slot0 = box.slots[0];
    const slot1 = box.slots[1];

    const displayText = (slot0?.letter ?? "") + (slot1?.letter ?? "");
    const displayHasDescender = hasDescender(displayText);
    const fontSize = getBoxFontSize(displayText || "A");

    const letterStyle: React.CSSProperties = displayHasDescender
      ? { lineHeight: 1.25, transform: "translateY(-8%)" }
      : { lineHeight: 1 };

    let bgColor = "transparent";
    let borderColor = subjectColor.emptyBoxBorder;
    let textColor = ROYAL_BLUE;
    let shadowColor = "rgba(0,0,0,0.05)";
    let scaleClass = "mcp-box-slide-in";
    let cursorClass = "cursor-default";

    if (isFilled) {
      bgColor = ROYAL_BLUE;
      borderColor = "#FFFFFF";
      textColor = "#FFFFFF";
      shadowColor = "oklch(0.4 0.18 260 / 0.9)";
      scaleClass = "mcp-box-celebrate";
      if (isToolClear) cursorClass = "cursor-crosshair";
    } else if (isPartial) {
      bgColor = "rgba(65, 105, 225, 0.12)";
      borderColor = ROYAL_BLUE;
      textColor = ROYAL_BLUE;
      shadowColor = "rgba(65, 105, 225, 0.15)";
      if (isToolClear) cursorClass = "cursor-crosshair";
    } else if (isHovered && dragState.isDragging) {
      borderColor = subjectColor.cardBg;
      shadowColor = "rgba(77, 130, 246, 0.3)";
      scaleClass = "mcp-target-pulse";
    }

    const isDisabled = isGameComplete || transitionPhase !== "idle";

    return (
      <div
        key={`box-${currentBoxIndex}`}
        data-box-index={currentBoxIndex}
        onClick={() => handleBoxTap(currentBoxIndex)}
        className={`
          ${scaleClass} clay-sm relative flex flex-col items-center justify-center
          rounded-3xl border-4 transition-all duration-200
          ${cursorClass}
          ${isDisabled ? "opacity-60" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "min(50vh, 420px)",
          height: "min(50vh, 420px)",
          maxWidth: "100%",
          paddingTop: "6px",
          paddingBottom: displayHasDescender ? "12px" : "6px",
          paddingLeft: "6px",
          paddingRight: "6px",
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor,
          backgroundColor: bgColor,
          overflow: displayHasDescender ? "visible" : "hidden",
        }}
      >
        <div
          className="flex items-center justify-center w-full h-full"
          style={{ overflow: displayHasDescender ? "visible" : "hidden" }}
        >
          {displayText ? (
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
                maxWidth: "100%",
                maxHeight: displayHasDescender ? "none" : "100%",
                overflow: displayHasDescender ? "visible" : "hidden",
                whiteSpace: "nowrap",
                ...letterStyle,
              }}
            >
              {displayText}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  // ─── RENDER CARD ─────────────────────────────────────────
  const renderCard = (card: CardData) => {
    const isDraggingThis =
      dragState.cardId === card.id && dragState.isDragging;
    const isDropped = card.wasDropped;
    const isToolClear = tool === "clear";

    const isDescender =
      card.type === "small" && DESCENDER_LETTERS.has(card.letter);

    const letterStyle: React.CSSProperties = isDescender
      ? { lineHeight: 1.25, transform: "translateY(-8%)" }
      : { lineHeight: 1 };

    const fontSize = getCardFontSize(card.letter);

    const isDisabled =
      isGameComplete ||
      transitionPhase !== "idle" ||
      tool === "clear" ||
      isDropped ||
      isPlayingAudio;

    return (
      <div
        key={`${card.id}-${isDropped ? "out" : "in"}`}
        className={`
          flex w-full items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : ""}
          ${isDropped ? "mcp-card-hidden" : "mcp-card-reappear"}
          ${isDisabled && !isDropped ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDropped ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          width: "100%",
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
          !isDisabled &&
          !isDraggingThis &&
          !isDropped &&
          handlePointerDown(e, card)
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
              fontSize,
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
            {card.letter}
          </span>
        )}
      </div>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────
  const cardsGridCols = getCardsGridCols();
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = currentBoxFilledCount > 0;
  const isTransitioning = transitionPhase !== "idle";

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
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {renderSingleBox()}
        </div>

        <div className="flex w-full items-center justify-center pb-2">
          <div
            className={`grid ${cardsGridCols} gap-2 sm:gap-3 w-full max-w-4xl place-items-center`}
          >
            {cards.map((card) => (
              <div
                key={`card-wrap-${card.id}`}
                className="flex items-center justify-center w-full"
              >
                {renderCard(card)}
              </div>
            ))}
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
            lineHeight: 1,
            letterSpacing: "0.02em",
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            textShadow:
              "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
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

export default AlphabetMakeCorrectPairs;