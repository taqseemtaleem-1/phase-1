// src/components/games/Math/Numbers-Assessment/NumbersMatchingBulk.tsx
// ✅ Math version of AlphabetMatchingBulkBase
// 🎵 Intro audio plays on lesson start (no lock, fire-and-forget)
// ✅ SINGLE SESSION ONLY — no session 1 / session 2 split
// ✅ All numbers passed via `letters` prop shown in one board
// ✅ Undo / Redo / Eraser / Check tools
// ✅ Final matches with isCorrect
// 🔥 No same-row matching — left & right same position never have same number
// 🔥 Left column: FIXED order (numbers stay in sequence)
// 🔥 Right column: shuffled avoiding same-row pairs
// 🎨 Math green theme
// 📝 Summary: Simple "Number X - Correct/Wrong/Missed" pattern

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🎵 Intro audio — plays once when lesson starts
const introAudio = "/assets/Math Assets/Math Assessment/Numbers Matching Bulk/intro.wav";

// ─── SUBJECT COLORS ─────────────────────────────────────────
function getSubjectColor(subject: string = "math") {
  const colors: Record<
    string,
    { cardBg: string; cardShadow: string; selectedColor: string }
  > = {
    english: {
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
      selectedColor: "#3a6fd4",
    },
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      selectedColor: "#267a4b",
    },
    urdu: {
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
      selectedColor: "#b85e27",
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
  @keyframes nmb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nmb-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }
  @keyframes nmb-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes nmb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nmb-tool-pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
  @keyframes nmb-line-appear {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }

  .nmb-pop-in { animation: nmb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nmb-pulse { animation: nmb-pulse 0.6s ease-in-out infinite alternate; }
  .nmb-pop-smooth { animation: nmb-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .nmb-tool-pop { animation: nmb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nmb-tool-pulse-red { animation: nmb-tool-pulse-red 1.4s ease-out infinite; }
  .nmb-line-appear { animation: nmb-line-appear 0.25s ease-out both; }
`;

const StyleInjector = React.memo(function StyleInjector() {
  return (
    <>
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>
    </>
  );
});

// ─── Types ──────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

type Tool = "draw" | "remove";

interface DrawnLine {
  id: string;
  number: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isCorrect: boolean;
  rightNumber: string;
}

type Point = { x: number; y: number };

// ══════════════════════════════════════════════════════════════
//  🔥 SHUFFLE: no same-row matching
// ══════════════════════════════════════════════════════════════

function shuffleAvoidSameRow(numbers: string[]): string[] {
  const n = numbers.length;
  if (n <= 1) return [...numbers];

  const correctOrder = [...numbers];

  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = [...numbers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let sameRow = false;
    for (let i = 0; i < n; i++) {
      if (shuffled[i] === correctOrder[i]) {
        sameRow = true;
        break;
      }
    }

    if (!sameRow) return shuffled;
  }

  return [...correctOrder.slice(1), correctOrder[0]];
}

// ══════════════════════════════════════════════════════════════
//  STATS + EVENTS
// ══════════════════════════════════════════════════════════════

interface LineEvent {
  seq: number;
  type: "draw" | "remove" | "undo" | "redo";
  number?: string;
  isCorrect?: boolean;
  atMs: number;
}

interface SessionStats {
  totalDraws: number;
  correctDraws: number;
  wrongDraws: number;
  undoCount: number;
  redoCount: number;
  eraserActivations: number;
  linesRemoved: number;
  finalLines: number;
  finalCorrect: number;
  finalWrong: number;
  timeSec: number;
  events: LineEvent[];
}

function emptyStats(): SessionStats {
  return {
    totalDraws: 0,
    correctDraws: 0,
    wrongDraws: 0,
    undoCount: 0,
    redoCount: 0,
    eraserActivations: 0,
    linesRemoved: 0,
    finalLines: 0,
    finalCorrect: 0,
    finalWrong: 0,
    timeSec: 0,
    events: [],
  };
}

// ══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

interface MatchResult {
  leftNumber: string;
  rightNumber: string;
  isCorrect: boolean;
}

function buildSummary(
  studentName: string,
  sessionNumbers: string[],
  matchResults: MatchResult[],
  completed: boolean,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the Numbers Matching lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Numbers Matching lesson.`;

  // 🔥 Per-number lines (left numbers)
  const lines: string[] = [];
  sessionNumbers.forEach((num) => {
    const match = matchResults.find((m) => m.leftNumber === num);

    let status: string;
    if (!match) {
      status = "Missed";
    } else if (match.isCorrect) {
      status = "Correct";
    } else {
      status = "Wrong";
    }

    lines.push(`Number ${num} - ${status}`);
  });

  return `${header}\n\n${lines.join("\n")}`;
}

// ══════════════════════════════════════════════════════════════
//  TOOLBAR
// ══════════════════════════════════════════════════════════════

interface ToolButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

const ToolButton = React.memo(function ToolButton({
  onClick,
  disabled,
  active,
  danger,
  ariaLabel,
  children,
}: ToolButtonProps) {
  const base =
    "nmb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
        danger && !disabled ? "nmb-tool-pulse-red" : ""
      }`}
    >
      {children}
    </button>
  );
});

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onToggleRemove: () => void;
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
  onToggleRemove,
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
          onClick={onToggleRemove}
          active={tool === "remove"}
          danger={tool === "remove"}
          disabled={!hasLines}
          ariaLabel={tool === "remove" ? "Cancel remove mode" : "Remove a line"}
        >
          <Eraser className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>

        <div className="h-px w-10 rounded-full bg-white/40" />

        <ToolButton
          onClick={onCheck}
          active={canCheck}
          disabled={!canCheck}
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

export function NumbersMatchingBulk({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const SESSION_NUMBERS = useMemo(() => letters.filter(Boolean), [letters]);

  // ─── State ────────────────────────────────────────────────
  const [leftNumbers, setLeftNumbers] = useState<string[]>([]);
  const [rightNumbers, setRightNumbers] = useState<string[]>([]);

  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [undoStack, setUndoStack] = useState<DrawnLine[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawnLine[][]>([]);
  const [tool, setTool] = useState<Tool>("draw");

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragNumber, setDragNumber] = useState<string | null>(null);
  const [hoveredRight, setHoveredRight] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sessionStatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const eventSeqRef = useRef<number>(1);

  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const activeStatsRef = sessionStatsRef;

  // 🎵 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // ─── Derived ──────────────────────────────────────────────
  const usedLeftNumbers = useMemo(
    () => new Set(lines.map((l) => l.number)),
    [lines]
  );
  const usedRightNumbers = useMemo(() => {
    const set = new Set<string>();
    lines.forEach((l) => {
      set.add(l.rightNumber);
    });
    return set;
  }, [lines]);

  // ─── Build match list ─────────────────────────────────────
  const buildMatchList = useCallback((finalLines: DrawnLine[]): MatchResult[] => {
    return finalLines.map((l) => ({
      leftNumber: l.number,
      rightNumber: l.rightNumber,
      isCorrect: l.isCorrect,
    }));
  }, []);

  // ─── Build game data ──────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const stats = sessionStatsRef.current;

      return {
        type: "numbers-matching-bulk",
        lessonType: "matching",
        session: {
          numbers: SESSION_NUMBERS,
          finalMatches: buildMatchList(lines),
          stats: {
            totalDraws: stats.totalDraws,
            correctDraws: stats.correctDraws,
            wrongDraws: stats.wrongDraws,
            undoCount: stats.undoCount,
            redoCount: stats.redoCount,
            eraserActivations: stats.eraserActivations,
            linesRemoved: stats.linesRemoved,
            finalLines: stats.finalLines,
            finalCorrect: stats.finalCorrect,
            finalWrong: stats.finalWrong,
            timeSec: stats.timeSec,
          },
          events: stats.events,
        },
        completed,
      };
    },
    [SESSION_NUMBERS, lines, buildMatchList]
  );

  // ══════════════════════════════════════════════════════════════
  //  💾 SAVE FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const stats = sessionStatsRef.current;
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const summary = buildSummary(
      studentName,
      SESSION_NUMBERS,
      buildMatchList(lines),
      true,
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
    })
      .then(() => {
        console.log("[NumbersMatchingBulk] ✅ Progress saved");
      })
      .catch((err) => {
        console.error("[NumbersMatchingBulk] ❌ Save failed:", err);
      });
  }, [subject, level, lessonId, buildGameData, SESSION_NUMBERS, buildMatchList, lines]);

  const savePartialProgress = useCallback(() => {
    if (progressSavedRef.current) return;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000
    );
    if (elapsed < 1) return;

    progressSavedRef.current = true;

    const stats = sessionStatsRef.current;
    const studentName = sessionData.student.studentName || "Student";

    if (stats.timeSec === 0) {
      stats.timeSec = elapsed;
      stats.finalLines = lines.length;
      stats.finalCorrect = lines.filter((l) => l.isCorrect).length;
      stats.finalWrong = lines.filter((l) => !l.isCorrect).length;
    }

    // 🔥 NEW SUMMARY — partial
    const summary = buildSummary(studentName, [], [], false);

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject,
      level,
      lessonId,
      status: "uncompleted",
      timeSpentSec: stats.timeSec,
      summary,
      gameData: buildGameData(false),
    }).catch((err) => {
      console.warn("[NumbersMatchingBulk] ⚠️ Partial save failed:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, level, lessonId, lines, buildGameData]);

  // ══════════════════════════════════════════════════════════════
  //  🎵 INTRO AUDIO
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

  // ─── Initialize ───────────────────────────────────────────
  const initializeGame = useCallback(() => {
    const sessionNumbers = SESSION_NUMBERS;

    setLeftNumbers(sessionNumbers);

    const shuffled = shuffleAvoidSameRow(sessionNumbers);
    setRightNumbers(shuffled);

    setLines([]);
    setUndoStack([]);
    setRedoStack([]);
    setTool("draw");
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragNumber(null);
    setHoveredRight(null);

    eventSeqRef.current = 1;
    sessionStatsRef.current = emptyStats();
    sessionStartTimeRef.current = Date.now();
  }, [SESSION_NUMBERS]);

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
      if (!progressSavedRef.current) savePartialProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Center helpers ───────────────────────────────────────
  const getLeftCenter = useCallback((num: string): Point | null => {
    const board = boardRef.current;
    const el = leftRefs.current[num];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  const getRightCenter = useCallback((num: string): Point | null => {
    const board = boardRef.current;
    const el = rightRefs.current[num];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - b.left,
      y: r.top + r.height / 2 - b.top,
    };
  }, []);

  // ─── Push Undo ────────────────────────────────────────────
  const pushUndo = useCallback((currentLines: DrawnLine[]) => {
    setUndoStack((prev) => [...prev, currentLines]);
    setRedoStack([]);
  }, []);

  // ─── Log Event ────────────────────────────────────────────
  const logEvent = useCallback((event: Omit<LineEvent, "seq" | "atMs">) => {
    const stats = activeStatsRef.current;
    const evt: LineEvent = {
      ...event,
      seq: eventSeqRef.current++,
      atMs: Date.now() - sessionStartTimeRef.current,
    };
    stats.events.push(evt);
  }, []);

  // ─── LEFT: Pointer Down ──────────────────────────────────
  const handleLeftPointerDown = useCallback(
    (e: React.PointerEvent, num: string) => {
      if (tool !== "draw") return;
      if (usedLeftNumbers.has(num)) return;

      const board = boardRef.current;
      if (!board) return;

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };

      setIsDragging(true);
      setDragNumber(num);
      setDragStart(point);
      setDragEnd(point);

      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [tool, usedLeftNumbers]
  );

  // ─── BOARD: Pointer Move ─────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragNumber) return;

      const board = boardRef.current;
      if (!board) return;

      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };
      setDragEnd(point);

      let hit: string | null = null;
      for (const [rightNum, el] of Object.entries(rightRefs.current)) {
        if (!el) continue;
        if (usedRightNumbers.has(rightNum)) continue;

        const r = el.getBoundingClientRect();
        const padding = 20;
        if (
          e.clientX >= r.left - padding &&
          e.clientX <= r.right + padding &&
          e.clientY >= r.top - padding &&
          e.clientY <= r.bottom + padding
        ) {
          hit = rightNum;
          break;
        }
      }
      setHoveredRight(hit);
    },
    [isDragging, dragNumber, usedRightNumbers]
  );

  // ─── BOARD: Pointer Up ───────────────────────────────────
  const handlePointerUp = useCallback(() => {
    if (!isDragging || !dragNumber) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragNumber(null);
      setHoveredRight(null);
      return;
    }

    const leftNum = dragNumber;
    const rightNum = hoveredRight;

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragNumber(null);
    setHoveredRight(null);

    if (!rightNum) return;
    if (usedLeftNumbers.has(leftNum)) return;
    if (usedRightNumbers.has(rightNum)) return;

    const start = getLeftCenter(leftNum);
    const end = getRightCenter(rightNum);
    if (!start || !end) return;

    const isCorrect = leftNum === rightNum;

    const newLine: DrawnLine = {
      id: `${leftNum}::${rightNum}::${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      number: leftNum,
      rightNumber: rightNum,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      isCorrect,
    };

    const stats = activeStatsRef.current;
    stats.totalDraws += 1;
    if (isCorrect) stats.correctDraws += 1;
    else stats.wrongDraws += 1;

    logEvent({ type: "draw", number: leftNum, isCorrect });

    pushUndo(lines);
    setLines((prev) => [...prev, newLine]);
  }, [
    isDragging,
    dragNumber,
    hoveredRight,
    lines,
    getLeftCenter,
    getRightCenter,
    pushUndo,
    usedLeftNumbers,
    usedRightNumbers,
    logEvent,
  ]);

  // ─── Line hit detection ───────────────────────────────────
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
    [lines]
  );

  // ─── BOARD: Pointer Down (eraser mode) ───────────────────
  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool !== "remove") return;

      const board = boardRef.current;
      if (!board) return;

      const b = board.getBoundingClientRect();
      const px = e.clientX - b.left;
      const py = e.clientY - b.top;

      const lineId = findLineAtPoint(px, py);
      if (lineId) {
        const removed = lines.find((l) => l.id === lineId);
        const stats = activeStatsRef.current;
        stats.linesRemoved += 1;

        logEvent({
          type: "remove",
          number: removed?.number,
          isCorrect: removed?.isCorrect,
        });

        pushUndo(lines);
        setLines((prev) => prev.filter((l) => l.id !== lineId));
        setTool("draw");
      }
    },
    [tool, findLineAtPoint, lines, pushUndo, logEvent]
  );

  // ─── Undo / Redo ─────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;
    logEvent({ type: "undo" });
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, lines]);
    setLines(prev);
  }, [undoStack, lines, logEvent]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;
    logEvent({ type: "redo" });
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, lines]);
    setLines(next);
  }, [redoStack, lines, logEvent]);

  const handleToolToggle = useCallback(() => {
    setTool((prev) => {
      const next = prev === "draw" ? "remove" : "draw";
      if (next === "remove") activeStatsRef.current.eraserActivations += 1;
      return next;
    });
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragNumber(null);
    setHoveredRight(null);
  }, []);

  // ─── Can Check ────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (leftNumbers.length === 0) return false;
    return lines.length === leftNumbers.length;
  }, [lines.length, leftNumbers.length]);

  // ─── Finalize ─────────────────────────────────────────────
  const finalizeStats = useCallback(() => {
    const stats = activeStatsRef.current;
    stats.finalLines = lines.length;
    stats.finalCorrect = lines.filter((l) => l.isCorrect).length;
    stats.finalWrong = lines.filter((l) => !l.isCorrect).length;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000
    );
  }, [lines]);

  // ─── Check → Save + Navigate ──────────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;

    stopIntroAudio();
    finalizeStats();
    saveFinalProgress();

    navigate({
      to: "/levels",
      search: { subject, level, openPopup: "true" },
    });
  }, [
    canCheck,
    finalizeStats,
    saveFinalProgress,
    navigate,
    subject,
    level,
    lessonId,
    stopIntroAudio,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  RENDER HELPERS
  // ══════════════════════════════════════════════════════════════

  const renderLeft = (num: string) => {
    const isDraggingThis = isDragging && dragNumber === num;
    const isUsed = usedLeftNumbers.has(num);

    return (
      <div
        key={`left-${num}`}
        ref={(el) => {
          leftRefs.current[num] = el;
        }}
        onPointerDown={(e) => handleLeftPointerDown(e, num)}
        className={`relative flex items-center justify-center transition-all duration-200 ${
          tool === "draw" && !isUsed ? "cursor-grab" : "cursor-default"
        } ${isDraggingThis ? "nmb-pop-smooth" : ""}`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100px",
          padding: "8px 6px",
          touchAction: "none",
          opacity: isUsed ? 0.55 : 1,
        }}
      >
        <div
          className="absolute rounded-2xl border-4 transition-all duration-200"
          style={{
            width: "clamp(80px, 18vh, 140px)",
            height: "clamp(80px, 18vh, 140px)",
            backgroundColor: subjectColor.cardBg,
            borderColor: "white",
            boxShadow: `0 4px 0 0 ${subjectColor.cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
          }}
        />
        <span
          style={{
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4.5rem, 14vh, 7rem)",
            color: "#FFFFFF",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "0.02em",
            userSelect: "none",
            position: "relative",
            zIndex: 1,
          }}
        >
          {num}
        </span>
      </div>
    );
  };

  const renderRight = (num: string) => {
    const isHovered = hoveredRight === num && isDragging;
    const isUsed = usedRightNumbers.has(num);

    return (
      <div
        key={`right-${num}`}
        ref={(el) => {
          rightRefs.current[num] = el;
        }}
        className={`relative flex items-center justify-center transition-all duration-200 ${
          isHovered ? "nmb-pop-smooth scale-105" : ""
        }`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100px",
          padding: "8px 6px",
          cursor: "default",
          opacity: isUsed ? 0.55 : 1,
        }}
      >
        <div
          className="absolute rounded-2xl border-4 transition-all duration-200"
          style={{
            width: "clamp(80px, 18vh, 140px)",
            height: "clamp(80px, 18vh, 140px)",
            backgroundColor: isHovered
              ? subjectColor.selectedColor
              : subjectColor.cardBg,
            borderColor: "white",
            boxShadow: `0 4px 0 0 ${subjectColor.cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
          }}
        />
        <span
          style={{
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4.5rem, 14vh, 7rem)",
            color: "#FFFFFF",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: "0.02em",
            userSelect: "none",
            position: "relative",
            zIndex: 1,
          }}
        >
          {num}
        </span>
      </div>
    );
  };

  const renderLines = () => {
    const elements: React.ReactElement[] = [];

    lines.forEach((line) => {
      const length = Math.hypot(
        line.endX - line.startX,
        line.endY - line.startY
      );
      const angle = Math.atan2(
        line.endY - line.startY,
        line.endX - line.startX
      );

      const isRemoveMode = tool === "remove";
      const lineColor = isRemoveMode ? "#EF4444" : "#000000";
      const glowColor = isRemoveMode
        ? "rgba(239, 68, 68, 0.5)"
        : "rgba(0,0,0,0.2)";

      elements.push(
        <div key={line.id} className="nmb-line-appear">
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
            }}
          />
        </div>
      );
    });

    if (isDragging && dragStart && dragEnd && dragNumber && tool === "draw") {
      const start = getLeftCenter(dragNumber);
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
              }}
              className="nmb-pulse"
            />
          </div>
        );
      }
    }

    return elements;
  };

  const totalPairs = leftNumbers.length;
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasLines = lines.length > 0;

  return (
    <div className="relative flex h-full w-full select-none items-stretch gap-2 p-4">
      <StyleInjector />

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleRemove={handleToolToggle}
        onCheck={handleCheck}
        canUndo={canUndo}
        canRedo={canRedo}
        tool={tool}
        hasLines={hasLines}
        canCheck={canCheck}
      />

      <div
        ref={boardRef}
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud"
        style={{ touchAction: "none" }}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex w-full max-w-5xl items-stretch gap-8 px-6 sm:gap-12 md:gap-16">
          {/* LEFT COLUMN — FIXED order */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <div
              className="flex w-full max-w-[260px] flex-col items-center justify-center gap-4"
              style={{ minHeight: `${Math.max(100, totalPairs * 105)}px` }}
            >
              {leftNumbers.map((num) => renderLeft(num))}
            </div>
          </div>

          {/* RIGHT COLUMN — Shuffled order */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <div
              className="flex w-full max-w-[260px] flex-col items-center justify-center gap-4"
              style={{ minHeight: `${Math.max(100, totalPairs * 105)}px` }}
            >
              {rightNumbers.map((num) => renderRight(num))}
            </div>
          </div>
        </div>

        {renderLines()}
      </div>
    </div>
  );
}

export default NumbersMatchingBulk;