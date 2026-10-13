// src/components/games/English/Alphabet-Assessment/AlphabetChooseCorrectPair.tsx
// ✅ Bulk-style silent gameplay (no correct/wrong feedback)
// ✅ Toolbar: Undo, Redo, Clear, Check
// ✅ Max selection = number of correct pairs
// ✅ Check button enabled as soon as max selection reached (with green pulse)
// 🔥 Idle = transparent bg + ROYAL BLUE letters
// 🔥 Selected = ROYAL BLUE bg + WHITE letters
// 🔥 Removed white inset outline on selected cards
// 🔥 Unselect ONLY via Eraser tool — clicking selected card in select mode does nothing
// ✅ No celebration SVG, no correct/wrong audio, no counter capsule
// 🔥 FIXED DISTRACTORS: Same letters every time — only positions shuffle
// 🔥 Saves per-card results (correct/wrong/missed/ignored) for dashboard
//
// ✅ UPDATED (v2):
//    - 🔥 Intro audio plays ONCE at start (fire-and-forget, no lock)
//      Source: src/assets/English Assessment Audios/Alphabet Choose Correct Pair/intro.wav
//    - Board is interactive from frame 1
//    - Session 2 does NOT replay intro audio
//
// ✅ UPDATED (v3): SUMMARY added
//    - Per-letter result: "Letter Aa - Correct" / "Letter Bb - Wrong" / "Letter Cc - Missed"
//    - Uncompleted: "Student did not complete the Choose Correct Pair lesson."

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

// ─── 🔥 PROGRESS SYNC ─────────────────────────────────────────
import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

// 🔥 Intro audio — plays once at the very start
const introAudio = "/assets/English Assessment Audios/Alphabet Choose Correct Pair/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

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
    }
  > = {
    english: {
      cardBg: "#4D82F6",
      cardShadow: "oklch(0.35 0.18 260 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
    },
    math: {
      cardBg: "#2E8B57",
      cardShadow: "oklch(0.32 0.18 148 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
    },
    urdu: {
      cardBg: "#CC6B2C",
      cardShadow: "oklch(0.4 0.18 40 / 0.85)",
      selectedBg: ROYAL_BLUE,
      selectedShadow: "oklch(0.4 0.18 260 / 0.9)",
      selectedText: "#FFFFFF",
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

// ─── 🎬 ANIMATION CSS ─────────────────────────────────────────
const GAME_CSS = `
  @keyframes acp-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes acp-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes acp-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes acp-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes acp-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes acp-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  .acp-pop-in { animation: acp-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .acp-fade-out { animation: acp-fade-out 0.5s ease-in both; }
  .acp-fade-in { animation: acp-fade-in 0.5s ease-out both; }
  .acp-tool-pop { animation: acp-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .acp-card-select { animation: acp-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }

  .acp-check-pulse {
    animation: acp-tool-pulse-green 1.4s ease-out infinite;
  }
`;

// ─── 📦 TYPES ──────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface CardData {
  id: string;
  capital: string;
  small: string;
  isCorrect: boolean;
}

// 🔥 Per-card result type — saved for dashboard visualization
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
type Tool = "select" | "clear";

// ─── 🔥 LEVEL → LETTERS MAPPING ──────────────────────────────
const LEVEL_LETTERS_MAP: Record<
  number,
  { session1: string[]; session2: string[] }
> = {
  8: { session1: ["A", "B", "C", "D"], session2: ["E", "F", "G"] },
  16: { session1: ["H", "I", "J", "K"], session2: ["L", "M", "N"] },
  23: { session1: ["O", "P", "Q"], session2: ["R", "S", "T"] },
  30: { session1: ["U", "V", "W"], session2: ["X", "Y", "Z"] },
};

// ══════════════════════════════════════════════════════════════
//  🔥 FIXED DISTRACTORS MAP
// ══════════════════════════════════════════════════════════════

const FIXED_DISTRACTOR: Record<string, string> = {
  A: "b", B: "d", C: "e", D: "c", E: "o", F: "t", G: "j",
  H: "n", I: "l", J: "i", K: "h", L: "t", M: "n", N: "m",
  O: "e", P: "b", Q: "p", R: "f", S: "t", T: "s",
  U: "y", V: "u", W: "v", X: "s", Y: "v", Z: "w",
};

function getFixedDistractor(capital: string): string {
  const fixed = FIXED_DISTRACTOR[capital];
  if (fixed) return fixed;
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  for (const ch of alphabet) {
    if (ch !== capital.toLowerCase()) return ch;
  }
  return "x";
}

// ─── 🛠️ STATS ──────────────────────────────────────────────────
interface SessionStats {
  totalSelections: number;
  selectionsRemoved: number;
  undoCount: number;
  redoCount: number;
  finalSelected: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return {
    totalSelections: 0,
    selectionsRemoved: 0,
    undoCount: 0,
    redoCount: 0,
    finalSelected: 0,
    timeSec: 0,
  };
}

// ─── 📸 SESSION SNAPSHOT (saved into gameData) ─────────────────
interface SessionSnapshot {
  totalCards: number;
  selectedCards: string[];
  correctPairs: number;
  allCards: Array<{
    id: string;
    capital: string;
    small: string;
    isCorrect: boolean;
  }>;
  cardResults: CardResult[];
}

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1Letters: string[],
  s1Results: CardResult[],
  s2Letters: string[],
  s2Results: CardResult[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Choose Correct Pair lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (lettersList: string[], results: CardResult[]) => {
    for (const capital of lettersList) {
      const small = capital.toLowerCase();
      // Find the correct-pair card result for this letter
      const correctCard = results.find(
        (r) => r.capital === capital && r.isCorrect,
      );

      let status: string;
      if (!correctCard || !correctCard.wasSelected) {
        status = "Missed";
      } else {
        // If the correct card was selected → Correct (regardless of wrong extras)
        status = "Correct";
      }

      // Override: if any WRONG card of this letter was selected and correct was NOT → Wrong
      const wrongCard = results.find(
        (r) => r.capital === capital && !r.isCorrect && r.wasSelected,
      );
      if (wrongCard && (!correctCard || !correctCard.wasSelected)) {
        status = "Wrong";
      }

      lines.push(`Letter ${capital}${small} - ${status}`);
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
    "acp-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "acp-check-pulse" : ""}`}
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
  hasSelections: boolean;
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
  hasSelections,
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
          disabled={!hasSelections || isTransitioning}
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear selections"}
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

export function AlphabetChooseCorrectPair({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const levelConfig = LEVEL_LETTERS_MAP[level];
  const SESSION_1_LETTERS = levelConfig?.session1 || ["A", "B", "C", "D"];
  const SESSION_2_LETTERS = levelConfig?.session2 || ["E", "F", "G"];

  const [session, setSession] = useState<Session>(1);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");

  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [undoStack, setUndoStack] = useState<string[][]>([]);
  const [redoStack, setRedoStack] = useState<string[][]>([]);
  const [tool, setTool] = useState<Tool>("select");

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
      const allCards: CardData[] = [];

      sessionLetters.forEach((capital) => {
        allCards.push({
          id: `${capital}${capital.toLowerCase()}`,
          capital,
          small: capital.toLowerCase(),
          isCorrect: true,
        });

        const distractorSmall = getFixedDistractor(capital);

        allCards.push({
          id: `${capital}${distractorSmall}`,
          capital,
          small: distractorSmall,
          isCorrect: false,
        });
      });

      return shuffleArray(allCards);
    },
    [getSessionLetters, shuffleArray],
  );

  const totalCorrectPairs = useMemo(() => {
    return cards.filter((c) => c.isCorrect).length;
  }, [cards]);

  const maxSelection = totalCorrectPairs;

  const buildCardResults = useCallback(
    (allCards: CardData[], selectedSet: Set<string>): CardResult[] => {
      return allCards.map((card) => {
        const wasSelected = selectedSet.has(card.id);

        let result: CardResult["result"];
        if (card.isCorrect && wasSelected) {
          result = "correct";
        } else if (!card.isCorrect && wasSelected) {
          result = "wrong";
        } else if (card.isCorrect && !wasSelected) {
          result = "missed";
        } else {
          result = "ignored";
        }

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

  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const newCards = buildCards(sessionNum);
      setCards(newCards);
      setSelectedIds(new Set());
      setUndoStack([]);
      setRedoStack([]);
      setTool("select");
      setIsGameComplete(false);
      setTransitionPhase("idle");

      if (sessionNum === 1) {
        s1StatsRef.current = emptyStats();
      } else {
        s2StatsRef.current = emptyStats();
      }
      sessionStartTimeRef.current = Date.now();
    },
    [buildCards],
  );

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
        savePartialProgress();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushUndo = useCallback((current: Set<string>) => {
    setUndoStack((prev) => [...prev, Array.from(current)]);
    setRedoStack([]);
  }, []);

  const handleCardClick = useCallback(
    (card: CardData) => {
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;
      if (isNavigating) return;

      const isCurrentlySelected = selectedIds.has(card.id);

      if (tool === "clear") {
        if (!isCurrentlySelected) return;
        pushUndo(selectedIds);

        const next = new Set(selectedIds);
        next.delete(card.id);
        setSelectedIds(next);
        activeStatsRef.current.selectionsRemoved += 1;

        if (next.size === 0) setTool("select");
        return;
      }

      if (isCurrentlySelected) return;
      if (selectedIds.size >= maxSelection) return;

      pushUndo(selectedIds);
      const next = new Set(selectedIds);
      next.add(card.id);
      setSelectedIds(next);
      activeStatsRef.current.totalSelections += 1;
    },
    [
      isGameComplete,
      transitionPhase,
      isNavigating,
      selectedIds,
      tool,
      maxSelection,
      pushUndo,
    ],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, Array.from(selectedIds)]);
    setSelectedIds(new Set(prev));
  }, [undoStack, selectedIds]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [...u, Array.from(selectedIds)]);
    setSelectedIds(new Set(next));
  }, [redoStack, selectedIds]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "select" : "clear"));
  }, []);

  const canCheck = useMemo(() => {
    if (maxSelection === 0) return false;
    if (cards.length === 0) return false;
    return selectedIds.size >= maxSelection;
  }, [maxSelection, selectedIds.size, cards.length]);

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    const stats = activeStatsRef.current;
    stats.finalSelected = selectedIds.size;
    stats.timeSec = Math.floor(
      (Date.now() - sessionStartTimeRef.current) / 1000,
    );

    const snapshot: SessionSnapshot = {
      totalCards: cards.length,
      selectedCards: Array.from(selectedIds),
      correctPairs: totalCorrectPairs,
      allCards: cards.map((c) => ({
        id: c.id,
        capital: c.capital,
        small: c.small,
        isCorrect: c.isCorrect,
      })),
      cardResults: buildCardResults(cards, selectedIds),
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
    selectedIds,
    cards,
    totalCorrectPairs,
    session,
    initializeGame,
    buildCardResults,
    navigate,
    subject,
    level,
    lessonId,
  ]);

  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;

      return {
        type: "alphabet-choose-correct-pair",
        lessonType: "choose-pair",
        sessions: [
          {
            sessionNum: 1,
            letters: SESSION_1_LETTERS,
            totalCards: s1?.totalCards ?? 0,
            selectedCards: s1?.selectedCards ?? [],
            correctPairs: s1?.correctPairs ?? 0,
            allCards: s1?.allCards ?? [],
            cardResults: s1?.cardResults ?? [],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            letters: SESSION_2_LETTERS,
            totalCards: s2?.totalCards ?? 0,
            selectedCards: s2?.selectedCards ?? [],
            correctPairs: s2?.correctPairs ?? 0,
            allCards: s2?.allCards ?? [],
            cardResults: s2?.cardResults ?? [],
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
      s1FinalSnapshotRef.current?.cardResults ?? [],
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current?.cardResults ?? [],
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
      console.error("[ChooseCorrectPair] Save failed:", err);
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
      s1FinalSnapshotRef.current?.cardResults ?? [],
      SESSION_2_LETTERS,
      s2FinalSnapshotRef.current?.cardResults ?? [],
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
      console.warn("[ChooseCorrectPair] Partial save failed:", err);
    });
  }, [
    SESSION_1_LETTERS,
    SESSION_2_LETTERS,
    subject,
    level,
    lessonId,
    buildGameData,
  ]);

  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "acp-fade-out";
    if (transitionPhase === "fade-in") return "acp-fade-in";
    return "";
  };

  const getGridConfig = () => {
    const count = cards.length;
    if (count === 6) return { cols: "grid-cols-3", gap: "gap-4 sm:gap-6" };
    if (count === 8) return { cols: "grid-cols-4", gap: "gap-4 sm:gap-6" };
    return { cols: "grid-cols-4", gap: "gap-4 sm:gap-6" };
  };

  const getFontSize = (text: string) => {
    if (text === "Ww" || text === "Mm") return "clamp(4.5rem, 16vh, 9rem)";
    return "clamp(6rem, 20vh, 12rem)";
  };

  const renderCard = (card: CardData, index: number) => {
    const isSelected = selectedIds.has(card.id);
    const isToolClear = tool === "clear";
    const animationKey = isSelected ? `sel-${card.id}` : `unsel-${card.id}`;

    const bgColor = isSelected ? ROYAL_BLUE : "transparent";
    const textColor = isSelected ? "#FFFFFF" : ROYAL_BLUE;
    const shadowColor = isSelected
      ? "oklch(0.4 0.18 260 / 0.9)"
      : "transparent";
    const borderColor = isSelected ? "#FFFFFF" : "transparent";

    let scaleClass = "hover:scale-[1.03]";
    let cursorClass = "cursor-pointer";

    if (isSelected) {
      scaleClass = "scale-[1.03]";
    }

    if (isToolClear && isSelected) {
      cursorClass = "cursor-crosshair";
    } else if (isToolClear && !isSelected) {
      cursorClass = "cursor-not-allowed";
    } else if (isSelected) {
      cursorClass = "cursor-default";
    }

    const isDisabled = isGameComplete || transitionPhase !== "idle";
    const fontSize = getFontSize(card.id);

    return (
      <button
        key={`${card.id}-${index}`}
        onClick={() => handleCardClick(card)}
        disabled={isDisabled}
        className={`
          acp-pop-in relative flex flex-col items-center justify-center
          rounded-3xl transition-all duration-200
          ${isSelected ? "clay-sm" : ""}
          ${scaleClass}
          ${cursorClass}
          ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}
        `}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "100%",
          maxWidth: "220px",
          minWidth: "100px",
          aspectRatio: "1/1",
          padding: "4px",
          backgroundColor: bgColor,
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor: borderColor,
        }}
      >
        {isSelected && (
          <span
            key={animationKey}
            className="acp-card-select pointer-events-none absolute inset-0 rounded-3xl"
            style={{ pointerEvents: "none" }}
          />
        )}

        <div className="flex items-center justify-center w-full h-full">
          <span
            style={{
              fontFamily:
                "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
              fontWeight: 400,
              fontSize,
              color: textColor,
              textShadow: isSelected
                ? "0 2px 8px rgba(0,0,0,0.25)"
                : "0 2px 8px rgba(65, 105, 225, 0.15)",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              transition: "color 0.2s ease",
            }}
          >
            {card.id}
          </span>
        </div>
      </button>
    );
  };

  const gridConfig = getGridConfig();
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasSelections = selectedIds.size > 0;
  const isTransitioning = transitionPhase !== "idle";

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
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
        hasSelections={hasSelections}
        canCheck={canCheck}
        isTransitioning={isTransitioning}
      />

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full max-w-4xl items-center justify-center p-6">
          <div
            className={`grid ${gridConfig.cols} ${gridConfig.gap} w-full max-w-4xl place-items-center`}
          >
            {cards.map((card, index) => renderCard(card, index))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlphabetChooseCorrectPair;