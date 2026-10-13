// src/components/games/Math/Numbers-Assessment/CountBallsDrag.tsx
// 🔢 Math version — Count Balls & Drag
// 🎵 Intro audio plays on lesson start (no lock, fire-and-forget)
// ✅ SINGLE SESSION — saare numbers ek hi baar mein
// ✅ Check button ke baad seedha /levels popup pe navigate
// ✅ Number BADA aur CENTER mein (empty box)
// ✅ Dropped balls ke saath number chhota hokar top pe
// ✅ Dropped balls ka size chhota (box ke andar fit ho)
// ✅ Silent bulk-style drag-drop (no correct/wrong feedback during play)
// ✅ Toolbar: Undo, Redo, Clear, Check
// 🔥 FIXED: Summary now correct — direct boxes state se results rebuild
// 📝 Summary: Simple "Number 1 - Correct/Wrong/Missed" pattern

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

// 🎵 Intro audio — plays once when lesson starts
const introAudio = "/assets/Math Assets/Math Assessment/Count Balls Drag/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

// ─── SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = "math") {
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
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#2E8B57",
    },
    english: {
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
      emptyBoxBorder: "#4D82F6",
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
  return colors[subject] || colors.math;
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
  @keyframes cbd-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes cbd-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes cbd-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes cbd-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes cbd-target-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(77, 130, 246, 0);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(77, 130, 246, 0.15);
      transform: scale(1.02);
    }
  }
  @keyframes cbd-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .cbd-pop-in { animation: cbd-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .cbd-tool-pop { animation: cbd-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .cbd-check-pulse { animation: cbd-tool-pulse-green 1.4s ease-out infinite; }
  .cbd-drop-success { animation: cbd-drop-success 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .cbd-target-pulse { animation: cbd-target-pulse 1.8s ease-in-out infinite; }
  .cbd-card-reappear { animation: cbd-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }

  .cbd-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  ⚽ RED BALL                                                 */
  /* ═══════════════════════════════════════════════════════════ */
  .cbd-red-ball {
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

  .cbd-red-ball::before {
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

  .cbd-red-ball::after {
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

// ─── TYPES ────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface BoxState {
  expectedNumber: number;
  droppedCount: number | null;
  droppedCardId: string | null;
}

interface BallCard {
  id: string;
  count: number;
  wasDropped: boolean;
}

type Tool = "drag" | "clear";
type Point = { x: number; y: number };

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
  expectedNumber: number;
  userDroppedCount: number | null;
  result: "correct" | "wrong" | "missed";
}

interface Snapshot {
  totalBoxes: number;
  filledBoxes: number;
  correctBoxes: number;
  allBoxes: Array<{
    boxIndex: number;
    expectedNumber: number;
  }>;
  boxResults: BoxResult[];
}

function parseNumberToCount(num: string): number {
  const n = parseInt(num, 10);
  return isNaN(n) ? 0 : n;
}

// ─── 📝 SUMMARY BUILDER ───────────────────────────────────
function buildSummary(
  studentName: string,
  boxResults: BoxResult[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Count Balls & Drag lesson.`;
  }

  const header = `${studentName} completed the Count Balls & Drag lesson.`;

  const lines: string[] = [];
  boxResults.forEach((r) => {
    let status: string;
    if (r.result === "correct") status = "Correct";
    else if (r.result === "missed") status = "Missed";
    else status = "Wrong";

    lines.push(`Number ${r.expectedNumber} - ${status}`);
  });

  return `${header}\n\n${lines.join("\n")}`;
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
    "cbd-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "cbd-check-pulse" : ""}`}
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
}: ToolbarProps) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center">
      <div className="flex h-full max-h-[500px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-[3px] border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-4 shadow-[0_6px_0_rgba(0,0,0,0.12)]">
        <ToolButton onClick={onUndo} disabled={!canUndo} ariaLabel="Undo">
          <Undo2 className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <ToolButton onClick={onRedo} disabled={!canRedo} ariaLabel="Redo">
          <Redo2 className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <div className="h-px w-10 rounded-full bg-white/40" />

        <ToolButton
          onClick={onToggleClear}
          active={tool === "clear"}
          danger={tool === "clear"}
          disabled={!hasDrops}
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear drops"}
        >
          <Eraser className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <div className="h-px w-10 rounded-full bg-white/40" />

        <ToolButton
          onClick={onCheck}
          active={canCheck}
          pulse={canCheck}
          disabled={!canCheck}
          ariaLabel="Check"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </ToolButton>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════
//  ⚽ BALLS RENDERER
// ══════════════════════════════════════════════════════════

const renderBalls = (
  count: number,
  density: "normal" | "compact" = "normal",
): React.ReactNode => {
  if (count === 0) {
    return <div className="w-full h-full" />;
  }

  const PADDING = density === "compact" ? 18 : 8;
  const scale = density === "compact" ? 0.7 : 1;

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
          className="cbd-red-ball"
          style={{
            width: `${62 * scale}%`,
            aspectRatio: "1 / 1",
            maxHeight: "100%",
          }}
        />
      </div>
    );
  }

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
            className="cbd-red-ball"
            style={{
              width: `${45 * scale}%`,
              aspectRatio: "1 / 1",
              maxHeight: "100%",
            }}
          />
        ))}
      </div>
    );
  }

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
              className="cbd-red-ball"
              style={{
                width: `${45 * scale}%`,
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
            className="cbd-red-ball"
            style={{
              width: `${45 * scale}%`,
              aspectRatio: "1 / 1",
              maxHeight: "100%",
            }}
          />
        </div>
      </div>
    );
  }

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
                className="cbd-red-ball"
                style={{
                  width: `${45 * scale}%`,
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
              className="cbd-red-ball"
              style={{
                width: `${30 * scale}%`,
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
              className="cbd-red-ball"
              style={{
                width: `${30 * scale}%`,
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

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
                className="cbd-red-ball"
                style={{
                  width: `${30 * scale}%`,
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
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="cbd-red-ball"
                style={{
                  width: `${28 * scale}%`,
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        ))}
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
            className="cbd-red-ball"
            style={{
              width: `${28 * scale}%`,
              aspectRatio: "1 / 1",
              maxHeight: "100%",
            }}
          />
        </div>
      </div>
    );
  }

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
              height: "33%",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="cbd-red-ball"
                style={{
                  width: `${28 * scale}%`,
                  aspectRatio: "1 / 1",
                  maxHeight: "100%",
                }}
              />
            ))}
          </div>
        ))}
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
              className="cbd-red-ball"
              style={{
                width: `${28 * scale}%`,
                aspectRatio: "1 / 1",
                maxHeight: "100%",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

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
                className="cbd-red-ball"
                style={{
                  width: `${28 * scale}%`,
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

  return <div className="w-full h-full" />;
};

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export function CountBallsDrag({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const subjectColor = getSubjectColor(subject);

  // 🔥 SINGLE SESSION — saare numbers ek saath
  const ALL_NUMBERS = useMemo(() => {
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const l of letters) {
      if (!l) continue;
      const key = String(l);
      if (seen.has(key)) {
        console.warn(`[CountBallsDrag] Duplicate number filtered: ${l}`);
        continue;
      }
      seen.add(key);
      clean.push(key);
    }
    return clean;
  }, [letters]);

  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [cards, setCards] = useState<BallCard[]>([]);

  const [undoStack, setUndoStack] = useState<
    Array<{ boxes: BoxState[]; cards: BallCard[] }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ boxes: BoxState[]; cards: BallCard[] }>
  >([]);
  const [tool, setTool] = useState<Tool>("drag");

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    count: number | null;
    cardId: string | null;
    position: Point | null;
  }>({
    isDragging: false,
    count: null,
    cardId: null,
    position: null,
  });

  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isNavigating] = useState(false);

  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isCheckingRef = useRef<boolean>(false);

  // 🔥 REF for latest boxes — used during save to avoid stale closures
  const boxesRef = useRef<BoxState[]>([]);

  // Keep boxesRef in sync with boxes state
  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  // 🎵 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // ─── HELPERS ─────────────────────────────────────────────
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const buildCards = useCallback(
    (): BallCard[] => {
      const allCards: BallCard[] = ALL_NUMBERS.map((numStr, idx) => {
        const count = parseNumberToCount(numStr);
        return {
          id: `ball-${idx}-${count}`,
          count,
          wasDropped: false,
        };
      });

      return shuffleArray(allCards);
    },
    [ALL_NUMBERS, shuffleArray],
  );

  const buildBoxes = useCallback((): BoxState[] => {
    return ALL_NUMBERS.map((numStr) => ({
      expectedNumber: parseNumberToCount(numStr),
      droppedCount: null,
      droppedCardId: null,
    }));
  }, [ALL_NUMBERS]);

  const pushUndo = useCallback(
    (currentBoxes: BoxState[], currentCards: BallCard[]) => {
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

  const isBoxFilled = (box: BoxState): boolean =>
    box.droppedCount !== null;

  const filledBoxesCount = useMemo(
    () => boxes.filter((b) => isBoxFilled(b)).length,
    [boxes],
  );

  const totalBoxes = boxes.length;

  // ══════════════════════════════════════════════════════════════
  //  🎵 INTRO AUDIO — plays once on lesson start (no lock)
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

  // ─── BUILD BOX RESULTS ────────────────────────────────────
  // This is the SOURCE OF TRUTH for per-box results
  const buildBoxResults = useCallback(
    (currentBoxes: BoxState[]): BoxResult[] => {
      return currentBoxes.map((box, boxIndex) => {
        const userDroppedCount = box.droppedCount;

        let result: BoxResult["result"];
        if (userDroppedCount === null) result = "missed";
        else if (userDroppedCount === box.expectedNumber) result = "correct";
        else result = "wrong";

        return {
          boxIndex,
          expectedNumber: box.expectedNumber,
          userDroppedCount,
          result,
        };
      });
    },
    [],
  );

  // ─── BUILD GAME DATA ──────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      // 🔥 Use boxesRef.current to avoid stale closure
      const currentBoxes = boxesRef.current;
      const boxResults = buildBoxResults(currentBoxes);
      const correctBoxes = boxResults.filter(
        (r) => r.result === "correct",
      ).length;

      return {
        type: "numbers-count-balls-drag",
        lessonType: "count-balls",
        numbers: ALL_NUMBERS,
        totalBoxes: currentBoxes.length,
        filledBoxes: currentBoxes.filter((b) => b.droppedCount !== null).length,
        correctBoxes,
        allBoxes: currentBoxes.map((b, i) => ({
          boxIndex: i,
          expectedNumber: b.expectedNumber,
        })),
        boxResults,
        stats: { ...statsRef.current },
        completed,
      };
    },
    [ALL_NUMBERS, buildBoxResults],
  );

  // ─── INITIALIZE ──────────────────────────────────────────
  const initializeGame = useCallback(() => {
    const newBoxes = buildBoxes();
    const newCards = buildCards();

    setBoxes(newBoxes);
    setCards(newCards);
    setUndoStack([]);
    setRedoStack([]);
    setTool("drag");
    setDragState({
      isDragging: false,
      count: null,
      cardId: null,
      position: null,
    });
    setHoveredBoxIndex(null);
    setIsGameComplete(false);

    statsRef.current = emptyStats();
    sessionStartTimeRef.current = Date.now();
  }, [buildBoxes, buildCards]);

  // ─── PROGRESS SAVE (moved up so cleanup can reference) ────
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

  useEffect(() => {
    isMountedRef.current = true;
    initializeGame();

    // 🎵 Play intro after layout settles
    const introTimer = setTimeout(() => {
      playIntroAudio();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopIntroAudio();
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      if (!progressSavedRef.current) savePartialProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── DRAG HANDLERS ───────────────────────────────────────
  const getPointerPosition = useCallback(
    (e: React.PointerEvent | PointerEvent): Point => ({
      x: e.clientX - 50,
      y: e.clientY - 50,
    }),
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, card: BallCard) => {
      if (isGameComplete) return;
      if (isNavigating) return;
      if (dragState.isDragging) return;
      if (tool === "clear") return;
      if (card.wasDropped) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        count: card.count,
        cardId: card.id,
        position: getPointerPosition(e),
      });
    },
    [
      isGameComplete,
      isNavigating,
      dragState.isDragging,
      tool,
      getPointerPosition,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || dragState.count === null) return;
      e.preventDefault();

      setDragState((prev) => ({
        ...prev,
        position: getPointerPosition(e),
      }));

      let hovered: number | null = null;
      boxes.forEach((box, index) => {
        if (isBoxFilled(box)) return;

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
    [dragState.isDragging, dragState.count, boxes, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dragState.isDragging ||
        dragState.count === null ||
        !dragState.cardId
      ) {
        setDragState({
          isDragging: false,
          count: null,
          cardId: null,
          position: null,
        });
        setHoveredBoxIndex(null);
        return;
      }

      const droppedCardId = dragState.cardId;
      const droppedCount = dragState.count;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({
        isDragging: false,
        count: null,
        cardId: null,
        position: null,
      });
      setHoveredBoxIndex(null);

      let droppedIndex: number | null = null;
      boxes.forEach((box, index) => {
        if (isBoxFilled(box)) return;

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
                droppedCount,
                droppedCardId,
              }
            : b,
        ),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.id === droppedCardId ? { ...c, wasDropped: true } : c,
        ),
      );

      statsRef.current.totalDrops += 1;
    },
    [dragState, boxes, cards, pushUndo],
  );

  // ─── CLEAR ───────────────────────────────────────────────
  const handleBoxTap = useCallback(
    (boxIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;

      const box = boxes[boxIndex];
      if (!isBoxFilled(box)) return;

      const restoredCardId = box.droppedCardId;
      if (!restoredCardId) return;

      pushUndo(boxes, cards);

      setBoxes((prev) =>
        prev.map((b, i) =>
          i === boxIndex
            ? {
                ...b,
                droppedCount: null,
                droppedCardId: null,
              }
            : b,
        ),
      );

      setCards((prev) =>
        prev.map((c) =>
          c.id === restoredCardId ? { ...c, wasDropped: false } : c,
        ),
      );

      statsRef.current.dropsRemoved += 1;
      setTool("drag");
    },
    [tool, isGameComplete, boxes, cards, pushUndo],
  );

  // ─── UNDO / REDO ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    statsRef.current.undoCount += 1;

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
    statsRef.current.redoCount += 1;

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

  // ─── CAN CHECK? ──────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (totalBoxes === 0) return false;
    return filledBoxesCount >= totalBoxes;
  }, [totalBoxes, filledBoxesCount]);

  // ─── SAVE FINAL PROGRESS ─────────────────────────────────
  // 🔥 CRITICAL FIX: reads from boxesRef.current (always latest)
  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const stats = statsRef.current;
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 Read CURRENT boxes from ref (avoid stale closure)
    const currentBoxes = boxesRef.current;
    const boxResults = buildBoxResults(currentBoxes);

    const summary = buildSummary(studentName, boxResults, true);

    console.log(
      "[CountBallsDrag] Saving with boxResults:",
      boxResults.map((r) => ({
        expected: r.expectedNumber,
        dropped: r.userDroppedCount,
        result: r.result,
      })),
    );

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
      console.error("[CountBallsDrag] Save failed:", err);
    });
  }, [subject, level, lessonId, buildGameData, buildBoxResults]);

  // ─── CHECK → SAVE + /levels POPUP ────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    stopIntroAudio();

    const stats = statsRef.current;
    stats.finalDrops = filledBoxesCount;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    // 🔥 Sync boxesRef with current boxes BEFORE save
    boxesRef.current = boxes;

    setIsGameComplete(true);

    // 🔥 CRITICAL: delay save so state updates flush
    //    and boxesRef gets the final state
    setTimeout(() => {
      saveFinalProgress();
    }, 50);

    navigateTimerRef.current = setTimeout(() => {
      navigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    }, 600);
  }, [
    canCheck,
    filledBoxesCount,
    boxes,
    navigate,
    subject,
    level,
    stopIntroAudio,
    saveFinalProgress,
  ]);

  // ─── RENDER HELPERS ──────────────────────────────────────
  const getNumberFontSize = (isFilled: boolean) => {
    if (isFilled) {
      return "clamp(1.4rem, 4.5vh, 2.2rem)";
    }
    return "clamp(3rem, 12vh, 5.5rem)";
  };

  const getGridCols = () => {
    const c = boxes.length;
    if (c === 4) return "grid-cols-4";
    if (c === 3) return "grid-cols-3";
    if (c === 2) return "grid-cols-2";
    return "grid-cols-4";
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

  // ─── RENDER BOX ──────────────────────────────────────────
  const renderBox = (box: BoxState, index: number) => {
    const isHovered = hoveredBoxIndex === index;
    const isFilled = isBoxFilled(box);
    const isToolClear = tool === "clear";

    let bgColor = "transparent";
    let borderColor = subjectColor.emptyBoxBorder;
    let shadowColor = "rgba(0,0,0,0.05)";
    let scaleClass = "";
    let cursorClass = "cursor-default";

    if (isFilled) {
      bgColor = "rgba(65, 105, 225, 0.08)";
      borderColor = ROYAL_BLUE;
      shadowColor = "oklch(0.4 0.18 260 / 0.9)";
      scaleClass = "cbd-drop-success";
      if (isToolClear) cursorClass = "cursor-crosshair";
    } else if (isHovered && dragState.isDragging) {
      borderColor = subjectColor.cardBg;
      shadowColor = "rgba(77, 130, 246, 0.3)";
      scaleClass = "cbd-target-pulse";
    }

    const isDisabled = isGameComplete;

    return (
      <div
        key={`box-${index}`}
        data-box-index={index}
        onClick={() => handleBoxTap(index)}
        className={`
          cbd-pop-in clay-sm relative flex flex-col items-center justify-center
          rounded-2xl border-4 transition-all duration-200
          ${scaleClass} ${cursorClass}
          ${isDisabled ? "opacity-60" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "100%",
          maxWidth: "180px",
          minWidth: "90px",
          aspectRatio: "1/1",
          padding: isFilled ? "4px" : "6px",
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor,
          backgroundColor: bgColor,
          overflow: "hidden",
        }}
      >
        {!isFilled && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: "none" }}
          >
            <span
              style={{
                fontFamily:
                  "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: getNumberFontSize(false),
                color: subjectColor.cardBg,
                textShadow: "0 2px 8px rgba(46, 139, 87, 0.15)",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}
            >
              {box.expectedNumber}
            </span>
          </div>
        )}

        {isFilled && (
          <>
            <div
              className="flex items-center justify-center w-full"
              style={{
                flexShrink: 0,
                paddingTop: "1px",
                paddingBottom: "1px",
                minHeight: "22%",
              }}
            >
              <span
                style={{
                  fontFamily:
                    "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: getNumberFontSize(true),
                  color: ROYAL_BLUE,
                  textShadow: "0 1px 4px rgba(65, 105, 225, 0.15)",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                {box.expectedNumber}
              </span>
            </div>

            <div
              className="flex items-center justify-center w-full"
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {box.droppedCount !== null && (
                <div
                  className="flex items-center justify-center w-full h-full"
                  style={{ pointerEvents: "none" }}
                >
                  {renderBalls(box.droppedCount, "compact")}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── RENDER CARD — RED BALLS ────────────────────────────
  const renderCard = (card: BallCard) => {
    const isDraggingThis =
      dragState.cardId === card.id && dragState.isDragging;
    const isDropped = card.wasDropped;

    const isDisabled =
      isGameComplete || tool === "clear" || isDropped;

    return (
      <div
        key={`${card.id}-${isDropped ? "out" : "in"}`}
        className={`
          flex w-full items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : ""}
          ${isDropped ? "cbd-card-hidden" : "cbd-card-reappear"}
          ${isDisabled && !isDropped ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDropped ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          padding: "4px",
          touchAction: "none",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          opacity: isDropped ? 0 : 1,
          visibility: isDropped ? "hidden" : "visible",
          overflow: "visible",
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
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ pointerEvents: "none" }}
          >
            {renderBalls(card.count, "normal")}
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────
  const gridCols = getGridCols();
  const cardsGridCols = getCardsGridCols();
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = filledBoxesCount > 0;

  return (
    <div
      ref={boardRef}
      className="relative flex h-full w-full select-none items-stretch gap-2 p-4"
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
      />

      <div
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full flex-1 items-center justify-center px-4">
          <div
            className={`grid ${gridCols} gap-3 sm:gap-5 w-full max-w-3xl place-items-center`}
          >
            {boxes.map((box, index) => renderBox(box, index))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center pb-2">
          <div
            className={`grid ${cardsGridCols} gap-2 sm:gap-3 w-full place-items-center`}
          >
            {cards.map((card) => (
              <div
                key={`card-wrap-${card.id}`}
                className="flex items-center justify-center w-full"
                style={{ maxWidth: "120px" }}
              >
                {renderCard(card)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {dragState.isDragging && dragState.count !== null && dragState.position && (
        <div
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            width: "clamp(80px, 16vh, 140px)",
            height: "clamp(80px, 16vh, 140px)",
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.25))",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {renderBalls(dragState.count, "normal")}
        </div>
      )}
    </div>
  );
}

export default CountBallsDrag;