// src/components/games/Math/Numbers-Assessment/NumbersMatchingObjectsBulk.tsx
// ✅ BULK matching: Numbers (LEFT) ↔ Ball Groups (RIGHT)
// 🎵 Intro audio plays on lesson start (no lock, fire-and-forget)
// ✅ VERTICAL COLUMNS with GENEROUS gap between them
// ✅ NO distractors — sirf correct ball groups (shuffled)
// ✅ Toolbar: Undo, Redo, Eraser, Check
// ✅ Silent gameplay — no correct/wrong feedback during play
// ✅ On complete (Check) → /levels popup
// 📝 Summary: Simple "Number X - Correct/Wrong/Missed" pattern

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Andika Font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🎵 Intro audio — plays once when lesson starts
const introAudio = "/assets/Math Assets/Math Assessment/Matching Objects Bulk/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

// ═══════════════════════════════════════════════════════════════
//  🎨 CSS
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

const GAME_CSS = `
  @keyframes nmob-pop-in {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    65%  { opacity: 1; transform: scale(1.05) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nmob-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.06); }
    70%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @keyframes nmob-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }
  @keyframes nmob-line-appear {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes nmob-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nmob-tool-pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
  @keyframes nmob-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }

  .nmob-pop-in { animation: nmob-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nmob-pop-smooth { animation: nmob-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .nmob-pulse { animation: nmob-pulse 0.6s ease-in-out infinite alternate; }
  .nmob-line-appear { animation: nmob-line-appear 0.25s ease-out both; }
  .nmob-tool-pop { animation: nmob-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nmob-tool-pulse-red { animation: nmob-tool-pulse-red 1.4s ease-out infinite; }
  .nmob-check-pulse { animation: nmob-tool-pulse-green 1.4s ease-out infinite; }

  /* ═══════════════════════════════════════════════════════════ */
  /*  ⚽ CSS BALL                                                 */
  /* ═══════════════════════════════════════════════════════════ */
  .nmob-ball {
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

  .nmob-ball::before {
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

  .nmob-ball::after {
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

// ═══════════════════════════════════════════════════════════════
//  ⚽ BALLS RENDERER
// ═══════════════════════════════════════════════════════════════

const renderBalls = (count: number): React.ReactNode => {
  if (count === 0) {
    return <div className="w-full h-full" />;
  }

  const PADDING = 8;

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
          className="nmob-ball"
          style={{ width: "62%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
            className="nmob-ball"
            style={{ width: "45%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
              className="nmob-ball"
              style={{ width: "45%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
            className="nmob-ball"
            style={{ width: "45%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
                className="nmob-ball"
                style={{ width: "45%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
              className="nmob-ball"
              style={{ width: "30%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
              className="nmob-ball"
              style={{ width: "30%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
                className="nmob-ball"
                style={{ width: "30%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
                className="nmob-ball"
                style={{ width: "28%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
            className="nmob-ball"
            style={{ width: "28%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
                className="nmob-ball"
                style={{ width: "28%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
              className="nmob-ball"
              style={{ width: "28%", aspectRatio: "1 / 1", maxHeight: "100%" }}
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
                className="nmob-ball"
                style={{ width: "28%", aspectRatio: "1 / 1", maxHeight: "100%" }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return <div className="w-full h-full" />;
};

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
    "nmob-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${
        danger && !disabled ? "nmob-tool-pulse-red" : ""
      } ${pulse ? "nmob-check-pulse" : ""}`}
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
  hasLines: boolean;
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
  hasLines,
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
          disabled={!hasLines}
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear a line"}
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

// ═══════════════════════════════════════════════════════════════
//  📦 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface BallGroupItem {
  id: string;
  ballCount: number;
  targetNumber: string;
}

interface DrawnLine {
  id: string;
  numberValue: string;
  ballCount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface HistorySnapshot {
  lines: DrawnLine[];
}

interface NumberResult {
  number: string;
  expectedBalls: number;
  userMatchedBalls: number | null;
  isCorrect: boolean;
}

type Tool = "draw" | "clear";
type Point = { x: number; y: number };

// ═══════════════════════════════════════════════════════════════
//  📊 STATS
// ═══════════════════════════════════════════════════════════════

interface SessionStats {
  totalDraws: number;
  linesRemoved: number;
  undoCount: number;
  redoCount: number;
  finalLines: number;
  finalCorrect: number;
  finalWrong: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalDraws: 0,
    linesRemoved: 0,
    undoCount: 0,
    redoCount: 0,
    finalLines: 0,
    finalCorrect: 0,
    finalWrong: 0,
    timeSec: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  numberResults: NumberResult[],
  completed: boolean,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the Numbers-Objects Matching lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Numbers-Objects Matching lesson.`;

  // 🔥 Per-number lines
  const lines: string[] = [];
  numberResults.forEach((r) => {
    let status: string;
    if (r.userMatchedBalls === null) status = "Missed";
    else if (r.isCorrect) status = "Correct";
    else status = "Wrong";

    lines.push(`Number ${r.number} - ${status}`);
  });

  return `${header}\n\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function NumbersMatchingObjectsBulk({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);

  // ─── Parse numbers (dedup) ────────────────────────────────
  const numberList: string[] = useMemo(() => {
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const l of letters) {
      if (!l) continue;
      const key = String(l);
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(key);
    }
    return clean;
  }, [letters]);

  const totalNumbers = numberList.length;

  // ─── Ball groups (same count, but shuffled order) ────────
  const ballGroups: BallGroupItem[] = useMemo(() => {
    const groups = numberList.map((numStr, idx) => ({
      id: `bg-${idx}-${numStr}`,
      ballCount: parseInt(numStr, 10) || 0,
      targetNumber: numStr,
    }));

    const shuffled = [...groups];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numberList]);

  // ─── STATE ────────────────────────────────────────────────
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const [tool, setTool] = useState<Tool>("draw");

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragNumber, setDragNumber] = useState<string | null>(null);
  const [hoveredBallGroup, setHoveredBallGroup] = useState<string | null>(null);

  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // ─── Progress refs ────────────────────────────────────────
  const statsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isCheckingRef = useRef<boolean>(false);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🎵 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // ─── DOM refs ─────────────────────────────────────────────
  const numberRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ballGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─── Derived ──────────────────────────────────────────────
  const usedNumbers = useMemo(
    () => new Set(lines.map((l) => l.numberValue)),
    [lines],
  );
  const usedBallGroups = useMemo(() => {
    const set = new Set<number>();
    lines.forEach((l) => set.add(l.ballCount));
    return set;
  }, [lines]);

  // ─── Centers ──────────────────────────────────────────────
  const getNumberCenter = useCallback((num: string): Point | null => {
    const board = boardRef.current;
    const el = numberRefs.current[num];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  const getBallGroupCenter = useCallback(
    (ballCount: number): Point | null => {
      const board = boardRef.current;
      const el = ballGroupRefs.current[String(ballCount)];
      if (!board || !el) return null;
      const b = board.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - b.left,
        y: r.top + r.height / 2 - b.top,
      };
    },
    [],
  );

  // ─── Push Undo ────────────────────────────────────────────
  const pushUndo = useCallback((currentLines: DrawnLine[]) => {
    setUndoStack((prev) => [
      ...prev,
      { lines: currentLines.map((l) => ({ ...l })) },
    ]);
    setRedoStack([]);
  }, []);

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

  // ═══════════════════════════════════════════════════════════
  //  POINTER HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleNumberPointerDown = useCallback(
    (e: React.PointerEvent, numValue: string) => {
      if (isGameComplete || isNavigating) return;
      if (tool === "clear") return;
      if (usedNumbers.has(numValue)) return;

      const board = boardRef.current;
      if (!board) return;

      e.preventDefault();
      e.stopPropagation();

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };

      setIsDragging(true);
      setDragNumber(numValue);
      setDragStart(point);
      setDragEnd(point);

      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [isGameComplete, isNavigating, tool, usedNumbers],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragNumber) return;

      const board = boardRef.current;
      if (!board) return;

      e.preventDefault();

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };
      setDragEnd(point);

      let hit: string | null = null;
      for (const [bcKey, el] of Object.entries(ballGroupRefs.current)) {
        if (!el) continue;
        const bc = Number(bcKey);
        if (usedBallGroups.has(bc)) continue;

        const r = el.getBoundingClientRect();
        const padding = 20;
        if (
          e.clientX >= r.left - padding &&
          e.clientX <= r.right + padding &&
          e.clientY >= r.top - padding &&
          e.clientY <= r.bottom + padding
        ) {
          hit = bcKey;
          break;
        }
      }
      setHoveredBallGroup(hit);
    },
    [isDragging, dragNumber, usedBallGroups],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragNumber) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDragNumber(null);
        setHoveredBallGroup(null);
        return;
      }

      const numValue = dragNumber;
      const targetBallGroupKey = hoveredBallGroup;

      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragNumber(null);
      setHoveredBallGroup(null);

      if (!targetBallGroupKey) return;

      const ballCount = Number(targetBallGroupKey);
      if (usedNumbers.has(numValue)) return;
      if (usedBallGroups.has(ballCount)) return;

      const start = getNumberCenter(numValue);
      const end = getBallGroupCenter(ballCount);
      if (!start || !end) return;

      const newLine: DrawnLine = {
        id: `${numValue}::${ballCount}::${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        numberValue: numValue,
        ballCount,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
      };

      statsRef.current.totalDraws += 1;

      pushUndo(lines);
      setLines((prev) => [...prev, newLine]);
    },
    [
      isDragging,
      dragNumber,
      hoveredBallGroup,
      usedNumbers,
      usedBallGroups,
      getNumberCenter,
      getBallGroupCenter,
      pushUndo,
      lines,
    ],
  );

  // ─── Line hit detection for clear tool ────────────────────
  const findLineAtPoint = useCallback(
    (px: number, py: number): string | null => {
      const TAP_TOLERANCE = 24;

      for (const line of lines) {
        const dx = line.endX - line.startX;
        const dy = line.endY - line.startY;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        let t =
          ((px - line.startX) * dx + (py - line.startY) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = line.startX + t * dx;
        const projY = line.startY + t * dy;

        const dist = Math.hypot(px - projX, py - projY);
        if (dist <= TAP_TOLERANCE) return line.id;
      }
      return null;
    },
    [lines],
  );

  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool !== "clear") return;

      const board = boardRef.current;
      if (!board) return;

      const b = board.getBoundingClientRect();
      const px = e.clientX - b.left;
      const py = e.clientY - b.top;

      const lineId = findLineAtPoint(px, py);
      if (lineId) {
        statsRef.current.linesRemoved += 1;
        pushUndo(lines);
        setLines((prev) => prev.filter((l) => l.id !== lineId));
        setTool("draw");
      }
    },
    [tool, findLineAtPoint, lines, pushUndo],
  );

  // ─── Undo / Redo / Toggle ─────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    statsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, { lines: lines.map((l) => ({ ...l })) }]);
    setLines(prev.lines);
  }, [undoStack, lines]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    statsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [...u, { lines: lines.map((l) => ({ ...l })) }]);
    setLines(next.lines);
  }, [redoStack, lines]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "draw" : "clear"));
  }, []);

  // ─── Can Check ────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (totalNumbers === 0) return false;
    return lines.length === totalNumbers;
  }, [lines.length, totalNumbers]);

  // ═══════════════════════════════════════════════════════════
  //  RESULTS
  // ═══════════════════════════════════════════════════════════

  const buildNumberResults = useCallback(
    (currentLines: DrawnLine[]): NumberResult[] => {
      return numberList.map((numStr) => {
        const expectedBalls = parseInt(numStr, 10) || 0;
        const match = currentLines.find((l) => l.numberValue === numStr);
        const userMatchedBalls = match ? match.ballCount : null;

        return {
          number: numStr,
          expectedBalls,
          userMatchedBalls,
          isCorrect: userMatchedBalls === expectedBalls,
        };
      });
    },
    [numberList],
  );

  // ═══════════════════════════════════════════════════════════
  //  PROGRESS SAVE
  // ═══════════════════════════════════════════════════════════

  const buildGameData = useCallback(
    (completed: boolean) => {
      const stats = statsRef.current;

      return {
        type: "numbers-matching-objects-bulk",
        lessonType: "number-objects-match",
        numbers: numberList,
        totalNumbers,
        finalLines: lines.length,
        numberResults: buildNumberResults(lines),
        stats: { ...stats },
        completed,
      };
    },
    [numberList, totalNumbers, lines, buildNumberResults],
  );

  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const stats = statsRef.current;
    const studentName = sessionData.student.studentName || "Student";
    const results = buildNumberResults(lines);

    // 🔥 NEW SUMMARY
    const summary = buildSummary(studentName, results, true);

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
      console.error("[NumbersMatchingObjectsBulk] Final save failed:", err);
    });
  }, [numberList, subject, level, lessonId, buildGameData, buildNumberResults, lines]);

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
  }, [numberList, subject, level, lessonId, buildGameData]);

  const savePartialProgressRef = useRef(savePartialProgress);
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── Mount / Unmount ──────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();

    // 🎵 Play intro after layout settles
    const introTimer = setTimeout(() => {
      playIntroAudio();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopIntroAudio();
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        savePartialProgressRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Check → save + /levels popup ─────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    stopIntroAudio();

    const stats = statsRef.current;
    stats.finalLines = lines.length;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    const results = buildNumberResults(lines);
    stats.finalCorrect = results.filter((r) => r.isCorrect).length;
    stats.finalWrong = results.filter(
      (r) => r.userMatchedBalls !== null && !r.isCorrect,
    ).length;

    completedRef.current = true;
    setIsGameComplete(true);
    saveFinalProgress();

    navigateTimerRef.current = setTimeout(() => {
      navigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    }, 500);
  }, [
    canCheck,
    lines,
    buildNumberResults,
    saveFinalProgress,
    navigate,
    subject,
    level,
    stopIntroAudio,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ═══════════════════════════════════════════════════════════

  const renderLines = () => {
    const elements: React.ReactElement[] = [];

    lines.forEach((line) => {
      const length = Math.hypot(
        line.endX - line.startX,
        line.endY - line.startY,
      );
      const angle = Math.atan2(
        line.endY - line.startY,
        line.endX - line.startX,
      );

      const isRemoveMode = tool === "clear";
      const lineColor = isRemoveMode ? "#EF4444" : "#000000";
      const glowColor = isRemoveMode
        ? "rgba(239, 68, 68, 0.5)"
        : "rgba(0,0,0,0.2)";

      elements.push(
        <div key={line.id} className="nmob-line-appear">
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
              boxShadow: `0 0 16px ${glowColor}, 0 0 32px ${glowColor}`,
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
              boxShadow: `0 0 20px ${glowColor}`,
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
              boxShadow: `0 0 20px ${glowColor}`,
              zIndex: 25,
              pointerEvents: "none",
            }}
          />
        </div>,
      );
    });

    if (isDragging && dragStart && dragEnd && dragNumber) {
      const start = getNumberCenter(dragNumber);
      if (start) {
        const end = dragEnd;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        elements.push(
          <div key="drag-line">
            <div
              style={{
                position: "absolute",
                left: start.x,
                top: start.y,
                width: length,
                height: "6px",
                backgroundColor: "#000000",
                transformOrigin: "left center",
                transform: `rotate(${angle}rad)`,
                borderRadius: "3px",
                boxShadow: "0 0 16px rgba(0,0,0,0.2)",
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
                backgroundColor: "#000000",
                boxShadow: "0 0 20px rgba(0,0,0,0.3)",
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
                backgroundColor: "#000000",
                boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                zIndex: 30,
                pointerEvents: "none",
              }}
              className="nmob-pulse"
            />
          </div>,
        );
      }
    }

    return elements;
  };

  // ═══════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasLines = lines.length > 0;

  return (
    <div className="relative flex h-full w-full select-none items-stretch gap-2 p-4">
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
        hasLines={hasLines}
        canCheck={canCheck}
      />

      <div
        ref={boardRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* ═══ TWO COLUMNS — FIXED GAP ═══ */}
        <div
          className="flex w-full items-stretch justify-center"
          style={{
            gap: "clamp(180px, 30vw, 480px)",
          }}
        >
          {/* ─── LEFT COLUMN: NUMBERS ─── */}
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-5">
            {numberList.map((numStr) => {
              const isUsed = usedNumbers.has(numStr);
              const isDraggingThis =
                isDragging && dragNumber === numStr;

              return (
                <div
                  key={`num-${numStr}`}
                  ref={(el) => {
                    numberRefs.current[numStr] = el;
                  }}
                  onPointerDown={(e) =>
                    !isUsed && handleNumberPointerDown(e, numStr)
                  }
                  className={`nmob-pop-in relative flex items-center justify-center ${
                    tool === "draw" && !isUsed
                      ? "cursor-grab active:scale-95"
                      : "cursor-default"
                  } ${isDraggingThis ? "nmob-pop-smooth" : ""}`}
                  style={{
                    width: "clamp(96px, 17vh, 140px)",
                    height: "clamp(96px, 17vh, 140px)",
                    opacity: isUsed ? 0.5 : 1,
                    touchAction: "none",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-md transition-all duration-200"
                    style={{
                      border: "5px solid oklch(0.55 0.2 148)",
                      backgroundColor: "transparent",
                    }}
                  />

                  <span
                    style={{
                      fontFamily:
                        "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: "clamp(2.5rem, 10vh, 4.5rem)",
                      background:
                        "linear-gradient(145deg, oklch(0.78 0.18 148), oklch(0.6 0.21 148))",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      color: "transparent",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      letterSpacing: "0.02em",
                      position: "relative",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {numStr}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ─── RIGHT COLUMN: BALL GROUPS ─── */}
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-5">
            {ballGroups.map((group) => {
              const isUsed = usedBallGroups.has(group.ballCount);
              const isHovered =
                hoveredBallGroup === String(group.ballCount) &&
                isDragging;

              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    ballGroupRefs.current[String(group.ballCount)] = el;
                  }}
                  className={`nmob-pop-in relative flex items-center justify-center ${
                    isHovered ? "nmob-pop-smooth" : ""
                  }`}
                  style={{
                    width: "clamp(96px, 17vh, 140px)",
                    height: "clamp(96px, 17vh, 140px)",
                    opacity: isUsed ? 0.5 : 1,
                    touchAction: "none",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-md transition-all duration-200"
                    style={{
                      border: `5px solid ${
                        isHovered ? ROYAL_BLUE : "oklch(0.55 0.2 148)"
                      }`,
                      backgroundColor: isHovered
                        ? "rgba(65, 105, 225, 0.08)"
                        : "transparent",
                      boxShadow: isHovered
                        ? `0 0 24px ${ROYAL_BLUE}55`
                        : "none",
                    }}
                  />

                  <div
                    className="pointer-events-none flex items-center justify-center"
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: "8px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {renderBalls(group.ballCount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ LINES ═══ */}
        {renderLines()}
      </div>
    </div>
  );
}

export default NumbersMatchingObjectsBulk;