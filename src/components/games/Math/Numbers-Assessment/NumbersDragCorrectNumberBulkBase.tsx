// src/components/games/Math/Numbers-Assessment/NumbersDragCorrectNumberBulkBase.tsx
// ✅ Math version — Drag Correct Number (MULTI-SESSION, one number per session)
// 🎵 Per-session intro audio from: src/assets/Math Assets/Drag Correct Number/{0-9}.wav
// 🔥 SAME UI as original bulk — box on top, cards at bottom
// 🔥 ONE number per session, sessions run in order
// ✅ LEFT TOOLBAR: Undo / Redo / Eraser / Check (4 buttons)
// ✅ NO correct/wrong feedback — silent drag-drop
// ✅ HAR drop par box fill (correct ya wrong — same blue)
// ✅ Check button HAR drop ke baad enable
// ✅ Check dabane par next number
// 🔓 NO LOCK — board interactive from frame 1
// ✅ On last session complete → /levels popup
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

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎵 INTRO AUDIOS — same source as MathNumbersDragCorrectNumberBase
//  Folder: src/assets/Math Assets/Drag Correct Number/{0-9}.wav
// ═══════════════════════════════════════════════════════════════

const MATH_DRAG_INTRO_MODULES = import.meta.glob<string>(
  "@/assets/Math Assets/Drag Correct Number/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildMathDragIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(MATH_DRAG_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^(\d+)\.wav$/);
    if (match) {
      map[match[1]] = url;
    }
  }
  return map;
}

const MATH_DRAG_INTRO: Record<string, string> = buildMathDragIntroMap();

// ═══════════════════════════════════════════════════════════════
//  🔥 DISTRACTORS MAP (fixed per number)
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

const ROYAL_BLUE = "#4169E1";

// ═══════════════════════════════════════════════════════════════
//  🎨 SUBJECT COLORS — same as original bulk
// ═══════════════════════════════════════════════════════════════
function getSubjectColor(subject: string = "math") {
  const colors: Record<
    string,
    {
      cardBg: string;
      cardShadow: string;
      emptyBoxBorder: string;
    }
  > = {
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      emptyBoxBorder: "#2E8B57",
    },
    english: {
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
      emptyBoxBorder: "#4D82F6",
    },
    urdu: {
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
      emptyBoxBorder: "#CC6B2C",
    },
  };
  return colors[subject] || colors.math;
}

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT + CSS
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
  @keyframes ndb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ndb-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes ndb-target-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(46, 139, 87, 0);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(46, 139, 87, 0.15);
      transform: scale(1.02);
    }
  }
  @keyframes ndb-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ndb-session-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ndb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ndb-tool-pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }

  .ndb-pop-in { animation: ndb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .ndb-drop-success { animation: ndb-drop-success 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .ndb-target-pulse { animation: ndb-target-pulse 1.8s ease-in-out infinite; }
  .ndb-card-reappear { animation: ndb-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }
  .ndb-session-fade-in { animation: ndb-session-fade-in 0.3s ease-out both; }
  .ndb-tool-pop { animation: ndb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .ndb-tool-pulse-red { animation: ndb-tool-pulse-red 1.4s ease-out infinite; }

  .ndb-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  📦 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface SessionAttempt {
  attemptNumber: number;
  number: string;
  correct: boolean;
}

interface SessionResult {
  sessionIndex: number;
  targetNumber: string;
  attempts: SessionAttempt[];
  completed: boolean;
  totalAttempts: number;
  wrongAttempts: number;
  finalCorrect: boolean;
  finalWrong: boolean;
  isMissed: boolean;
}

type Point = { x: number; y: number };

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  totalAttempts: number;
  correctDrops: number;
  wrongDrops: number;
  undoCount: number;
  redoCount: number;
  eraserActivations: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalSessions: 0,
    completedSessions: 0,
    totalAttempts: 0,
    correctDrops: 0,
    wrongDrops: 0,
    undoCount: 0,
    redoCount: 0,
    eraserActivations: 0,
    timeSec: 0,
  };
}

// ─── Box drop snapshot (for Undo/Redo) ──────────────────────
interface BoxSnapshot {
  matchedNumber: string | null;
  matchedCardId: string | null;
  isCorrect: boolean;
  cards: Array<{ id: string; number: string; wasDropped: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER — Simple per-number Correct/Wrong/Missed
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  sessionResults: SessionResult[],
  allCompleted: boolean,
): string {
  // 🔥 Uncompleted
  if (!allCompleted) {
    return `${studentName} did not complete the Drag Correct Number lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Drag Correct Number lesson.`;

  // 🔥 Per-number lines
  const lines: string[] = [];
  sessionResults.forEach((r) => {
    let status: string;
    if (r.finalCorrect) status = "Correct";
    else if (r.isMissed) status = "Missed";
    else status = "Wrong";

    lines.push(`Number ${r.targetNumber} - ${status}`);
  });

  return `${header}\n\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════════
//  🧰 TOOLBAR COMPONENTS
// ═══════════════════════════════════════════════════════════════

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
    "ndb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
        danger && !disabled ? "ndb-tool-pulse-red" : ""
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
  tool: "draw" | "remove";
  hasBoxContent: boolean;
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
  hasBoxContent,
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
          disabled={!hasBoxContent}
          ariaLabel={tool === "remove" ? "Cancel erase mode" : "Erase box"}
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

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function NumbersDragCorrectNumberBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const subjectColor = getSubjectColor(subject);

  // 🔥 SESSION NUMBERS — ordered, deduped
  const SESSION_NUMBERS = useMemo(() => {
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

  // ─── STATE ─────────────────────────────────────────────────
  const [sessionIndex, setSessionIndex] = useState(0);
  const [transitionKey, setTransitionKey] = useState(0);

  const [cards, setCards] = useState<
    Array<{ id: string; number: string; wasDropped: boolean }>
  >([]);

  // 🔥 Box state — SILENT, no color feedback, no icons
  const [boxState, setBoxState] = useState<{
    matched: boolean;
    isCorrect: boolean;
    matchedNumber: string | null;
    matchedCardId: string | null;
  }>({
    matched: false,
    isCorrect: false,
    matchedNumber: null,
    matchedCardId: null,
  });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    number: string | null;
    cardId: string | null;
    position: Point | null;
  }>({
    isDragging: false,
    number: null,
    cardId: null,
    position: null,
  });

  const [hoveredBox, setHoveredBox] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 🔥 Toolbar state
  const [tool, setTool] = useState<"draw" | "remove">("draw");
  const [undoStack, setUndoStack] = useState<BoxSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BoxSnapshot[]>([]);

  const currentTarget = SESSION_NUMBERS[sessionIndex] || "";

  // 🔥 Check button — HAR drop ke baad enable
  const canCheck = boxState.matched;
  const hasBoxContent =
    boxState.matched && boxState.matchedNumber !== null;

  // ─── REFS ──────────────────────────────────────────────────
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const sessionResultsRef = useRef<SessionResult[]>([]);
  const currentAttemptsRef = useRef<SessionAttempt[]>([]);
  const attemptNumRef = useRef<number>(0);

  const statsRef = useRef<SessionStats>(emptyStats());

  // 🎵 Intro audio
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const introPlayedForSessionRef = useRef<number>(-1);

  // ─── TIMERS ────────────────────────────────────────────────
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ══════════════════════════════════════════════════════════════
  //  🎵 AUDIO HELPERS
  // ══════════════════════════════════════════════════════════════

  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
  }, []);

  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => stopAudio(audio));
    audioRefs.current = [];
  }, [stopAudio]);

  const playIntroAudio = useCallback(
    (targetNum: string) => {
      stopAllAudio();

      const src = MATH_DRAG_INTRO[targetNum];
      if (!src) {
        console.warn(
          `[NumbersDragBulk] No intro audio for number: ${targetNum}`,
        );
        return;
      }

      try {
        const audio = new Audio(src);
        audioRefs.current.push(audio);

        const cleanup = () => {
          const idx = audioRefs.current.indexOf(audio);
          if (idx !== -1) audioRefs.current.splice(idx, 1);
          try {
            audio.onended = null;
            audio.onerror = null;
          } catch {}
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        audio.play().catch(cleanup);
      } catch {}
    },
    [stopAllAudio],
  );

  // ══════════════════════════════════════════════════════════════
  //  🔧 BUILD HELPERS
  // ══════════════════════════════════════════════════════════════

  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, []);

  const buildCards = useCallback(
    (targetNum: string) => {
      const distractors = MATH_DISTRACTORS_MAP[targetNum] || ["1", "2", "3"];
      const picks = [
        targetNum,
        distractors[0],
        distractors[1],
        distractors[2],
      ];
      const shuffled = shuffleArray(picks);
      return shuffled.map((n, idx) => ({
        id: `card-${idx}-${n}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        number: n,
        wasDropped: false,
      }));
    },
    [shuffleArray],
  );

  // ══════════════════════════════════════════════════════════════
  //  🎬 START SESSION
  // ══════════════════════════════════════════════════════════════

  const startSession = useCallback(
    (index: number) => {
      const targetNum = SESSION_NUMBERS[index];
      if (!targetNum) return;

      setSessionIndex(index);
      setCards(buildCards(targetNum));

      setBoxState({
        matched: false,
        isCorrect: false,
        matchedNumber: null,
        matchedCardId: null,
      });

      setHoveredBox(false);
      setDragState({
        isDragging: false,
        number: null,
        cardId: null,
        position: null,
      });

      // 🔥 Reset toolbar history for new session
      setTool("draw");
      setUndoStack([]);
      setRedoStack([]);

      currentAttemptsRef.current = [];
      attemptNumRef.current = 0;

      setTransitionKey((k) => k + 1);

      if (introPlayedForSessionRef.current !== index) {
        introPlayedForSessionRef.current = index;
        setTimeout(() => {
          if (isMountedRef.current) playIntroAudio(targetNum);
        }, 300);
      }
    },
    [SESSION_NUMBERS, buildCards, playIntroAudio],
  );

  // ══════════════════════════════════════════════════════════════
  //  🚀 INIT / UNMOUNT
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    progressSavedRef.current = false;
    completedRef.current = false;
    sessionResultsRef.current = [];
    statsRef.current = emptyStats();
    statsRef.current.totalSessions = SESSION_NUMBERS.length;
    introPlayedForSessionRef.current = -1;

    startSession(0);

    return () => {
      isMountedRef.current = false;
      stopAllAudio();

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);

      if (!completedRef.current && !progressSavedRef.current) {
        savePartialProgressRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  💾 PROGRESS SAVE
  // ══════════════════════════════════════════════════════════════

  const buildGameData = useCallback(
    (completed: boolean) => {
      const stats = statsRef.current;
      return {
        type: "numbers-drag-correct-number-bulk-sessions",
        lessonType: "drag-drop",
        sessionNumbers: SESSION_NUMBERS,
        totalSessions: SESSION_NUMBERS.length,
        completedSessions: stats.completedSessions,
        sessionResults: sessionResultsRef.current,
        stats: { ...stats },
        completed,
      };
    },
    [SESSION_NUMBERS],
  );

  const saveFinalProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    statsRef.current.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const summary = buildSummary(
      studentName,
      sessionResultsRef.current,
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
        timeSpentSec: statsRef.current.timeSec,
        summary,
        gameData: buildGameData(true),
      });
      console.log("[NumbersDragBulk] ✅ Final progress saved");
    } catch (err) {
      console.error("[NumbersDragBulk] ❌ Final save failed:", err);
    }
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );
    if (elapsed < 1) return;

    progressSavedRef.current = true;
    statsRef.current.timeSec = elapsed;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const summary = buildSummary(
      studentName,
      sessionResultsRef.current,
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
      console.log("[NumbersDragBulk] 💾 Partial progress saved");
    } catch (err) {
      console.warn("[NumbersDragBulk] ⚠️ Partial save failed:", err);
    }
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgressRef = useRef(savePartialProgress);
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ══════════════════════════════════════════════════════════════
  //  ✅ CHECK BUTTON HANDLER — next number
  // ══════════════════════════════════════════════════════════════

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (isTransitioning) return;

    const finalCorrect = boxState.isCorrect;
    const finalWrong = !boxState.isCorrect;

    const sessionResult: SessionResult = {
      sessionIndex,
      targetNumber: currentTarget,
      attempts: [...currentAttemptsRef.current],
      completed: true,
      totalAttempts: currentAttemptsRef.current.length,
      wrongAttempts: currentAttemptsRef.current.filter(
        (a) => !a.correct,
      ).length,
      finalCorrect,
      finalWrong,
      isMissed: false,
    };
    sessionResultsRef.current = [
      ...sessionResultsRef.current,
      sessionResult,
    ];
    statsRef.current.completedSessions += 1;

    setIsTransitioning(true);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      const nextIndex = sessionIndex + 1;

      if (nextIndex >= SESSION_NUMBERS.length) {
        completedRef.current = true;
        saveFinalProgress().then(() => {
          navigateTimerRef.current = setTimeout(() => {
            navigate({
              to: "/levels",
              search: { subject, level, openPopup: "true" },
            });
          }, 500);
        });
      } else {
        startSession(nextIndex);
      }
    }, 400);
  }, [
    canCheck,
    isTransitioning,
    boxState.isCorrect,
    sessionIndex,
    currentTarget,
    SESSION_NUMBERS.length,
    startSession,
    saveFinalProgress,
    navigate,
    subject,
    level,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  ↩️ UNDO / REDO
  // ══════════════════════════════════════════════════════════════

  const captureSnapshot = useCallback((): BoxSnapshot => {
    return {
      matchedNumber: boxState.matchedNumber,
      matchedCardId: boxState.matchedCardId,
      isCorrect: boxState.isCorrect,
      cards: cards.map((c) => ({ ...c })),
    };
  }, [boxState, cards]);

  const applySnapshot = useCallback((snap: BoxSnapshot) => {
    setBoxState({
      matched: snap.matchedNumber !== null,
      isCorrect: snap.isCorrect,
      matchedNumber: snap.matchedNumber,
      matchedCardId: snap.matchedCardId,
    });
    setCards(snap.cards);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];

    statsRef.current.undoCount += 1;

    const currentSnap = captureSnapshot();
    setRedoStack((s) => [...s, currentSnap]);
    setUndoStack((s) => s.slice(0, -1));
    applySnapshot(prev);
    setTool("draw");

    if (currentAttemptsRef.current.length > 0) {
      currentAttemptsRef.current = currentAttemptsRef.current.slice(0, -1);
      attemptNumRef.current = Math.max(0, attemptNumRef.current - 1);
    }
  }, [undoStack, captureSnapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    statsRef.current.redoCount += 1;

    const currentSnap = captureSnapshot();
    setUndoStack((s) => [...s, currentSnap]);
    setRedoStack((s) => s.slice(0, -1));
    applySnapshot(next);
  }, [redoStack, captureSnapshot, applySnapshot]);

  // ══════════════════════════════════════════════════════════════
  //  🧽 ERASER
  // ══════════════════════════════════════════════════════════════

  const handleEraser = useCallback(() => {
    if (!hasBoxContent) return;

    statsRef.current.eraserActivations += 1;

    const snap = captureSnapshot();
    setUndoStack((s) => [...s, snap]);
    setRedoStack([]);

    setBoxState({
      matched: false,
      isCorrect: false,
      matchedNumber: null,
      matchedCardId: null,
    });

    setCards((prev) =>
      prev.map((c) =>
        c.id === boxState.matchedCardId ? { ...c, wasDropped: false } : c,
      ),
    );

    setTool("draw");
  }, [hasBoxContent, captureSnapshot, boxState.matchedCardId]);

  const handleToggleRemove = useCallback(() => {
    handleEraser();
  }, [handleEraser]);

  // ══════════════════════════════════════════════════════════════
  //  🎯 POINTER HANDLERS
  // ══════════════════════════════════════════════════════════════

  const getPointerPosition = useCallback(
    (e: React.PointerEvent | PointerEvent): Point => {
      return { x: e.clientX - 50, y: e.clientY - 50 };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      card: { id: string; number: string; wasDropped: boolean },
    ) => {
      if (isTransitioning) return;
      if (boxState.matched) return;
      if (dragState.isDragging) return;
      if (card.wasDropped) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        number: card.number,
        cardId: card.id,
        position: getPointerPosition(e),
      });
    },
    [
      isTransitioning,
      boxState.matched,
      dragState.isDragging,
      getPointerPosition,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.number) return;

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
        setHoveredBox(isOver && !boxState.matched);
      }
    },
    [
      dragState.isDragging,
      dragState.number,
      boxState.matched,
      getPointerPosition,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dragState.isDragging ||
        !dragState.number ||
        !dragState.cardId
      ) {
        setDragState({
          isDragging: false,
          number: null,
          cardId: null,
          position: null,
        });
        setHoveredBox(false);
        return;
      }

      const droppedCardId = dragState.cardId;
      const droppedNumber = dragState.number;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const target = currentTarget;

      setDragState({
        isDragging: false,
        number: null,
        cardId: null,
        position: null,
      });
      setHoveredBox(false);

      if (!target) return;

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

      if (!dropped) return;
      if (boxState.matched) return;

      // Snapshot for undo BEFORE any change
      const preSnap = captureSnapshot();
      setUndoStack((s) => [...s, preSnap]);
      setRedoStack([]);

      const isCorrect = droppedNumber === target;

      attemptNumRef.current += 1;
      currentAttemptsRef.current.push({
        attemptNumber: attemptNumRef.current,
        number: droppedNumber,
        correct: isCorrect,
      });
      statsRef.current.totalAttempts += 1;

      if (isCorrect) {
        statsRef.current.correctDrops += 1;
      } else {
        statsRef.current.wrongDrops += 1;
      }

      // ✅ SILENT — chahe correct ho ya wrong, box fill karo (same blue)
      setBoxState({
        matched: true,
        isCorrect,
        matchedNumber: droppedNumber,
        matchedCardId: droppedCardId,
      });

      setCards((prev) =>
        prev.map((c) =>
          c.id === droppedCardId ? { ...c, wasDropped: true } : c,
        ),
      );
    },
    [
      dragState,
      currentTarget,
      boxState.matched,
      captureSnapshot,
    ],
  );

  // ══════════════════════════════════════════════════════════════
  //  🎨 RENDER HELPERS
  // ══════════════════════════════════════════════════════════════

  const actualBoxCount = 1;
  const actualCardCount = useMemo(() => cards.length, [cards.length]);

  const getBoxFontSize = useCallback(() => {
    const count = Math.max(actualBoxCount, 1);
    const scale = count <= 2 ? 1.35 : 1.0;
    const vh = 16 * scale;
    const px = 230 * scale;
    return `clamp(1.6rem, ${vh}vh, ${px}px)`;
  }, [actualBoxCount]);

  const getSmallFontSize = useCallback(() => {
    const count = Math.max(actualCardCount, 1);
    const scale =
      count <= 4 ? 1.25 :
      count === 5 ? 1.15 :
      count === 6 ? 1.05 :
      count === 7 ? 0.95 :
      count === 8 ? 0.88 :
      count === 9 ? 0.8 :
      count === 10 ? 0.72 : 0.66;

    const vh = 13 * scale;
    const px = 190 * scale;
    return `clamp(1.5rem, ${vh}vh, ${px}px)`;
  }, [actualCardCount]);

  // ─── RENDER BOX — SILENT ──────────────────────────────────
  const renderBox = () => {
    const isFilled = boxState.matched;
    const isHovered = hoveredBox && dragState.isDragging && !isFilled;

    const displayNumber = boxState.matchedNumber || "";
    const fontSize = getBoxFontSize();

    let bgColor = "transparent";
    let borderColor = subjectColor.emptyBoxBorder;
    let textColor = "#FFFFFF";
    let shadowColor = "rgba(0,0,0,0.05)";
    let scaleClass = "";

    if (isFilled) {
      bgColor = ROYAL_BLUE;
      borderColor = "#FFFFFF";
      textColor = "#FFFFFF";
      shadowColor = "oklch(0.4 0.18 260 / 0.9)";
      scaleClass = "ndb-drop-success";
    } else if (isHovered) {
      borderColor = subjectColor.cardBg;
      shadowColor = "rgba(46, 139, 87, 0.3)";
      scaleClass = "ndb-target-pulse";
    } else {
      scaleClass = "ndb-target-pulse";
      shadowColor = "rgba(46, 139, 87, 0.15)";
    }

    return (
      <div
        data-box
        className={`
          ndb-pop-in clay-sm relative flex w-full flex-col items-center justify-center
          rounded-2xl border-4 transition-all duration-200
          ${scaleClass}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          aspectRatio: "1/1",
          padding: "4px",
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor: borderColor,
          backgroundColor: bgColor,
          overflow: "hidden",
          maxWidth: "220px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {displayNumber && (
          <span
            style={{
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize,
              color: textColor,
              textShadow: "0 2px 8px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {displayNumber}
          </span>
        )}
      </div>
    );
  };

  // ─── RENDER SMALL CARD ────────────────────────────────────
  const renderSmallCard = (
    card: { id: string; number: string; wasDropped: boolean },
    index: number,
  ) => {
    const isDraggingThis =
      dragState.cardId === card.id && dragState.isDragging;
    const fontSize = getSmallFontSize();

    const isDisabled = isTransitioning || boxState.matched;
    const isDropped = card.wasDropped;

    return (
      <div
        key={`small-${card.id}-${index}-${transitionKey}-${isDropped ? "out" : "in"}`}
        className={`
          flex w-full items-center justify-center
          transition-all duration-150
          ${isDraggingThis ? "opacity-0" : ""}
          ${isDropped ? "ndb-card-hidden" : "ndb-card-reappear"}
          ${isDisabled && !isDropped ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDropped ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          aspectRatio: "1 / 1",
          paddingTop: "6px",
          paddingBottom: "6px",
          paddingLeft: "4px",
          paddingRight: "4px",
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
              lineHeight: 1,
              maxWidth: "100%",
              overflow: "visible",
            }}
          >
            {card.number}
          </span>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  🖼️ RENDER
  // ══════════════════════════════════════════════════════════════

  if (SESSION_NUMBERS.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <style>{GAME_CSS}</style>
        <style>{FONT_CSS}</style>
        <p className="text-lg text-slate-500">No numbers configured.</p>
      </div>
    );
  }

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

      {/* ─── LEFT TOOLBAR ─── */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleRemove={handleToggleRemove}
        onCheck={handleCheck}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        tool={tool}
        hasBoxContent={hasBoxContent}
        canCheck={canCheck}
      />

      {/* ─── MAIN BOARD ─── */}
      <div
        dir="ltr"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud px-4 py-6"
        style={{ touchAction: "none" }}
      >
        {/* ─── BOX (top) ─── */}
        <div
          key={`box-session-${sessionIndex}-${transitionKey}`}
          className="ndb-session-fade-in flex w-full flex-1 items-center justify-center px-6 sm:px-10 md:px-14"
        >
          <div
            className="grid place-items-center"
            style={{
              gridTemplateColumns: "1fr",
              width: "min(100%, 220px)",
            }}
          >
            {renderBox()}
          </div>
        </div>

        {/* ─── CARDS (bottom) — 4 options ─── */}
        <div
          key={`cards-session-${sessionIndex}-${transitionKey}`}
          className="ndb-session-fade-in flex w-full items-center justify-center pb-4"
        >
          <div
            className="grid place-items-center gap-2 sm:gap-3 md:gap-4"
            style={{
              gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
              width: `min(100%, ${cards.length * 130}px)`,
            }}
          >
            {cards.map((card, index) => renderSmallCard(card, index))}
          </div>
        </div>
      </div>

      {/* ─── FLOATING DRAGGED NUMBER ─── */}
      {dragState.isDragging && dragState.number && dragState.position && (
        <span
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily:
              "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4.5rem, 16vh, 9rem)",
            color: ROYAL_BLUE,
            lineHeight: 1,
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            textShadow:
              "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            overflow: "visible",
          }}
        >
          {dragState.number}
        </span>
      )}
    </div>
  );
}

export default NumbersDragCorrectNumberBulkBase;