// src/components/games/Math/Numbers-Assessment/NumbersPickCorrectItemsBulkBase.tsx
// ✅ Math version — COUNT-BASED Pick Correct Items
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check — on LEFT side
// 🎵 Intro audio plays ONCE on lesson start (no lock, fire-and-forget)
//
// 🎯 GAMEPLAY:
//    • Number aata hai (e.g. 3)
//    • 3 CORRECT cards hain (pencil×N, bag×N, car×N where N = target)
//    • Child ko EXACTLY 3 cards select karne hain (ek har type ka)
//    • Distractors = 7 groups with WRONG quantities
//
// 🔥 maxSelection = 3 (fixed — total correct cards)
// 🔥 Cards SMALL (110px max)
// 🔥 NO quantity badge
// 🔥 NO hint text at top
// 🔥 Items grid moved DOWN
// 🔥 ZERO-QUANTITY card gets a visible border
// 📝 Summary: Simple "Number X - Correct/Wrong/Missed" pattern

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Undo2, Redo2, Eraser, Check } from 'lucide-react';

import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// 🔥 REUSE existing Math item SVGs (pencil, bag, car)
import {
  ITEM_COMPONENTS,
  ITEM_LABELS,
  ITEM_PLURALS,
  type ItemType,
} from '@/components/games/Math/Numbers-Numbers Items Introduction/itemSvgs';

// 🔥 Andika Font (Math standard)
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🎵 Intro audio — plays ONCE on lesson start
const introAudio = "/assets/Math Assets/Math Assessment/Pick Correct Items Bulk/intro.wav";

// ═══════════════════════════════════════════════════════════════
//  🔢 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALL_ITEM_TYPES: ItemType[] = ["pencil", "bag", "car"];

// ─── 🔥 ROYAL BLUE ────────────────────────────────────────────
const ROYAL_BLUE = '#4169E1';
const ROYAL_BLUE_SHADOW = 'oklch(0.4 0.18 260 / 0.9)';
const EMPTY_CARD_BORDER = 'rgba(65, 105, 225, 0.35)';

// ─── 🔥 DISTRACTOR GROUP COUNT ────────────────────────────────
const DISTRACTOR_GROUPS = 7;

// ─── 🔥 FIXED MAX SELECTION ───────────────────────────────────
const FIXED_MAX_SELECTION = 3;

// ═══════════════════════════════════════════════════════════════
//  🎨 FONT CSS
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

// ═══════════════════════════════════════════════════════════════
//  🎬 ANIMATION CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes npi-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes npi-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes npi-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes npi-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes npi-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes npi-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes npi-number-pop {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .npi-pop-in { animation: npi-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .npi-fade-out { animation: npi-fade-out 0.5s ease-in both; }
  .npi-fade-in { animation: npi-fade-in 0.5s ease-out both; }
  .npi-tool-pop { animation: npi-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .npi-check-pulse { animation: npi-tool-pulse-green 1.4s ease-out infinite; }
  .npi-card-select { animation: npi-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .npi-number-pop { animation: npi-number-pop 0.5s cubic-bezier(.34,1.4,.64,1) both; }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface Item {
  id: string;
  itemType: ItemType;
  quantity: number;
  isCorrect: boolean;
  sourceNumber: string;
}

interface CardResult {
  id: string;
  itemType: ItemType;
  quantity: number;
  isCorrect: boolean;
  wasSelected: boolean;
  result: 'correct' | 'wrong' | 'missed' | 'ignored';
}

interface RoundSnapshot {
  roundNum: number;
  number: string;
  targetQuantity: number;
  correctTotalSelections: number;
  totalCards: number;
  totalCorrect: number;
  selectedCount: number;
  correctSelections: number;
  wrongSelections: number;
  allItems: Array<{
    id: string;
    itemType: ItemType;
    quantity: number;
    isCorrect: boolean;
  }>;
  cardResults: CardResult[];
  timeSec: number;
}

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

type Tool = 'select' | 'clear';
type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';

// ═══════════════════════════════════════════════════════════════
//  🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ═══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  roundSnapshots: RoundSnapshot[],
  completed: boolean,
): string {
  // 🔥 Uncompleted
  if (!completed) {
    return `${studentName} did not complete the Pick Correct Items lesson.`;
  }

  // 🔥 Header
  const header = `${studentName} completed the Pick Correct Items lesson.`;

  // 🔥 Per-number lines
  const lines: string[] = [];
  roundSnapshots.forEach((r) => {
    const correctSelected = r.cardResults.filter(
      (c) => c.result === 'correct',
    ).length;
    const wrongSelected = r.cardResults.filter(
      (c) => c.result === 'wrong',
    ).length;
    const totalCorrect = r.totalCorrect;

    let status: string;
    let detail: string;

    if (r.selectedCount === 0) {
      status = 'Missed';
      detail = `0/${totalCorrect} selected`;
    } else if (correctSelected === totalCorrect && wrongSelected === 0) {
      status = 'Correct';
      detail = `${correctSelected}/${totalCorrect} selected`;
    } else if (wrongSelected > 0) {
      status = 'Wrong';
      detail = `${correctSelected}/${totalCorrect} correct, ${wrongSelected} wrong selected`;
    } else {
      status = 'Wrong';
      detail = `${correctSelected}/${totalCorrect} selected`;
    }

    lines.push(`Number ${r.number} - ${status} (${detail})`);
  });

  return `${header}\n\n${lines.join('\n')}`;
}

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
    'npi-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95';

  let style = 'border-white/60 bg-white text-slate-600 shadow';
  if (disabled) {
    style = 'border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed';
  } else if (danger) {
    style = 'border-white bg-red-500 text-white shadow-lg hover:bg-red-600';
  } else if (active) {
    style =
      'border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600';
  } else {
    style =
      'border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${base} ${style} ${pulse ? 'npi-check-pulse' : ''}`}
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
          active={tool === 'clear'}
          danger={tool === 'clear'}
          disabled={!hasSelections || isTransitioning}
          ariaLabel={tool === 'clear' ? 'Cancel clear mode' : 'Clear selections'}
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

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function NumbersPickCorrectItemsBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  // ─── SESSION NUMBERS (dedup, max 4) ────────────────────────
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

  const totalRounds = SESSION_NUMBERS.length;

  // ─── State ─────────────────────────────────────────────────
  const [roundIdx, setRoundIdx] = useState(0);

  const [gameItems, setGameItems] = useState<Item[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const [tool, setTool] = useState<Tool>('select');
  const [undoStack, setUndoStack] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);

  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [isGameComplete, setIsGameComplete] = useState(false);

  const currentNumber = SESSION_NUMBERS[roundIdx] || "1";
  const targetQuantity = parseInt(currentNumber, 10) || 0;

  // 🔥 FIXED MAX SELECTION = 3
  const maxSelection = FIXED_MAX_SELECTION;

  const totalCorrect = useMemo(
    () => gameItems.filter((i) => i.isCorrect).length,
    [gameItems],
  );

  // ─── Progress refs ─────────────────────────────────────────
  const sessionStatsRef = useRef<SessionStats>(emptyStats());
  const roundSnapshotsRef = useRef<Record<number, RoundSnapshot>>({});
  const roundStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const savePartialProgressRef = useRef<() => void>(() => {});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🎵 Intro audio refs — plays ONCE on lesson start
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  // ═══════════════════════════════════════════════════════════
  //  🎵 INTRO AUDIO — plays ONCE on lesson start (no lock)
  // ═══════════════════════════════════════════════════════════

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
  //  🎯 BUILD ITEMS FOR A ROUND
  // ═══════════════════════════════════════════════════════════

  const buildItemsForNumber = useCallback((num: string): Item[] => {
    const target = parseInt(num, 10) || 0;

    // 3 CORRECT cards (one per type, quantity = target)
    const correctCards: Item[] = ALL_ITEM_TYPES.map((type, idx) => ({
      id: `correct-${num}-${type}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemType: type,
      quantity: target,
      isCorrect: true,
      sourceNumber: num,
    }));

    // 7 DISTRACTOR cards (random type + wrong quantity)
    const distractorCards: Item[] = [];
    const usedCombos = new Set<string>();

    const possibleQuantities: number[] = [];
    for (let q = 1; q <= target + 3; q++) {
      if (q !== target) possibleQuantities.push(q);
    }
    if (possibleQuantities.length === 0) possibleQuantities.push(1);

    let attempts = 0;
    const maxAttempts = 200;

    while (
      distractorCards.length < DISTRACTOR_GROUPS &&
      attempts < maxAttempts
    ) {
      attempts++;
      const type = ALL_ITEM_TYPES[
        Math.floor(Math.random() * ALL_ITEM_TYPES.length)
      ];
      const qty =
        possibleQuantities[
          Math.floor(Math.random() * possibleQuantities.length)
        ];

      const combo = `${type}-${qty}`;
      if (usedCombos.has(combo)) continue;
      usedCombos.add(combo);

      distractorCards.push({
        id: `dist-${num}-${type}-${qty}-${distractorCards.length}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemType: type,
        quantity: qty,
        isCorrect: false,
        sourceNumber: num,
      });
    }

    let fillIdx = 0;
    while (distractorCards.length < DISTRACTOR_GROUPS) {
      const type = ALL_ITEM_TYPES[fillIdx % ALL_ITEM_TYPES.length];
      const qty = target + 1 + Math.floor(fillIdx / ALL_ITEM_TYPES.length);
      distractorCards.push({
        id: `dist-fallback-${num}-${type}-${fillIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemType: type,
        quantity: qty,
        isCorrect: false,
        sourceNumber: num,
      });
      fillIdx++;
    }

    return shuffleArray([...correctCards, ...distractorCards]);
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🎯 INITIALIZE A ROUND
  // ═══════════════════════════════════════════════════════════

  const initializeRound = useCallback(
    (roundIndex: number) => {
      const num = SESSION_NUMBERS[roundIndex] || "1";
      const items = buildItemsForNumber(num);

      setGameItems(items);
      setSelectedIndices(new Set());
      setUndoStack([]);
      setRedoStack([]);
      setTool('select');
      setTransitionPhase('idle');

      roundStartTimeRef.current = Date.now();
    },
    [SESSION_NUMBERS, buildItemsForNumber],
  );

  // ─── Init on mount ────────────────────────────────────────
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
    initializeRound(0);

    // 🎵 Play intro ONCE on lesson start (after layout settles)
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

  // ═══════════════════════════════════════════════════════════
  //  🎯 CARD SELECTION
  // ═══════════════════════════════════════════════════════════

  const pushUndo = useCallback((current: Set<number>) => {
    setUndoStack((prev) => [...prev, Array.from(current)]);
    setRedoStack([]);
  }, []);

  const handleCardSelect = useCallback(
    (index: number) => {
      if (isGameComplete) return;
      if (transitionPhase !== 'idle') return;
      if (tool === 'clear') return;

      const isCurrentlySelected = selectedIndices.has(index);

      if (!isCurrentlySelected && selectedIndices.size >= maxSelection) return;
      if (isCurrentlySelected) return;

      pushUndo(selectedIndices);

      const next = new Set(selectedIndices);
      next.add(index);
      setSelectedIndices(next);

      sessionStatsRef.current.totalSelections += 1;
    },
    [
      isGameComplete,
      transitionPhase,
      tool,
      selectedIndices,
      maxSelection,
      pushUndo,
    ],
  );

  const handleClearTap = useCallback(
    (index: number) => {
      if (tool !== 'clear') return;
      if (isGameComplete) return;
      if (transitionPhase !== 'idle') return;
      if (!selectedIndices.has(index)) return;

      pushUndo(selectedIndices);

      const next = new Set(selectedIndices);
      next.delete(index);
      setSelectedIndices(next);

      sessionStatsRef.current.selectionsRemoved += 1;

      setTool('select');
    },
    [
      tool,
      isGameComplete,
      transitionPhase,
      selectedIndices,
      pushUndo,
    ],
  );

  // ─── Undo / Redo ──────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];

    sessionStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(prev));
  }, [undoStack, selectedIndices]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    sessionStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [...u, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(next));
  }, [redoStack, selectedIndices]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === 'clear' ? 'select' : 'clear'));
  }, []);

  // ─── Can check ────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (maxSelection === 0) return false;
    if (gameItems.length === 0) return false;
    return selectedIndices.size >= maxSelection;
  }, [maxSelection, selectedIndices.size, gameItems.length]);

  // ═══════════════════════════════════════════════════════════
  //  🎯 BUILD CARD RESULTS
  // ═══════════════════════════════════════════════════════════

  const buildCardResults = useCallback(
    (items: Item[], selectedSet: Set<number>): CardResult[] => {
      return items.map((item, idx) => {
        const wasSelected = selectedSet.has(idx);

        let result: CardResult['result'];
        if (item.isCorrect && wasSelected) result = 'correct';
        else if (!item.isCorrect && wasSelected) result = 'wrong';
        else if (item.isCorrect && !wasSelected) result = 'missed';
        else result = 'ignored';

        return {
          id: item.id,
          itemType: item.itemType,
          quantity: item.quantity,
          isCorrect: item.isCorrect,
          wasSelected,
          result,
        };
      });
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════
  //  🎯 BUILD GAME DATA
  // ═══════════════════════════════════════════════════════════

  const buildGameData = useCallback(
    (completed: boolean) => {
      const rounds: RoundSnapshot[] = [];
      for (let r = 0; r < totalRounds; r++) {
        const snap = roundSnapshotsRef.current[r];
        if (snap) {
          rounds.push(snap);
        } else {
          const num = SESSION_NUMBERS[r] || '';
          const tq = parseInt(num, 10) || 0;
          rounds.push({
            roundNum: r + 1,
            number: num,
            targetQuantity: tq,
            correctTotalSelections: FIXED_MAX_SELECTION,
            totalCards: 0,
            totalCorrect: 0,
            selectedCount: 0,
            correctSelections: 0,
            wrongSelections: 0,
            allItems: [],
            cardResults: [],
            timeSec: 0,
          });
        }
      }

      return {
        type: 'numbers-pick-correct-items-bulk',
        lessonType: 'pick-correct',
        numbers: SESSION_NUMBERS,
        totalRounds,
        rounds,
        stats: { ...sessionStatsRef.current },
        completed,
      };
    },
    [SESSION_NUMBERS, totalRounds],
  );

  // ═══════════════════════════════════════════════════════════
  //  💾 SAVE PROGRESS
  // ═══════════════════════════════════════════════════════════

  const saveFinalProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const studentName = sessionData.student.studentName || 'Student';

    // Collect all round snapshots
    const allRoundSnapshots: RoundSnapshot[] = [];
    for (let r = 0; r < totalRounds; r++) {
      const snap = roundSnapshotsRef.current[r];
      if (snap) allRoundSnapshots.push(snap);
    }

    // 🔥 NEW SUMMARY
    const summary = buildSummary(studentName, allRoundSnapshots, true);

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject,
        level,
        lessonId,
        status: 'completed',
        timeSpentSec: sessionStatsRef.current.timeSec,
        summary,
        gameData: buildGameData(true),
      });
      console.log('[MathPickCorrectItems] ✅ Final progress saved');
    } catch (err) {
      console.error('[MathPickCorrectItems] ❌ Final save failed:', err);
    }
  }, [subject, level, lessonId, buildGameData, totalRounds]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || 'Student';

    // 🔥 NEW SUMMARY — partial
    const summary = buildSummary(studentName, [], false);

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject,
        level,
        lessonId,
        status: 'uncompleted',
        timeSpentSec: elapsed,
        summary,
        gameData: buildGameData(false),
      });
    } catch {}
  }, [subject, level, lessonId, buildGameData]);

  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ═══════════════════════════════════════════════════════════
  //  🎯 CHECK HANDLER
  // ═══════════════════════════════════════════════════════════

  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    if (transitionPhase !== 'idle') return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    stopIntroAudio();

    const roundTimeSec = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
    sessionStatsRef.current.finalSelected += selectedIndices.size;
    sessionStatsRef.current.timeSec += roundTimeSec;

    const cardResults = buildCardResults(gameItems, selectedIndices);
    const correctSelections = cardResults.filter((r) => r.result === 'correct').length;
    const wrongSelections = cardResults.filter((r) => r.result === 'wrong').length;

    const snap: RoundSnapshot = {
      roundNum: roundIdx + 1,
      number: currentNumber,
      targetQuantity,
      correctTotalSelections: FIXED_MAX_SELECTION,
      totalCards: gameItems.length,
      totalCorrect,
      selectedCount: selectedIndices.size,
      correctSelections,
      wrongSelections,
      allItems: gameItems.map((i) => ({
        id: i.id,
        itemType: i.itemType,
        quantity: i.quantity,
        isCorrect: i.isCorrect,
      })),
      cardResults,
      timeSec: roundTimeSec,
    };
    roundSnapshotsRef.current[roundIdx] = snap;

    const isLastRound = roundIdx >= totalRounds - 1;

    if (!isLastRound) {
      setTransitionPhase('fade-out');
      transitionTimerRef.current = setTimeout(() => {
        const nextRound = roundIdx + 1;
        setRoundIdx(nextRound);
        initializeRound(nextRound);
        setTransitionPhase('fade-in');
        transitionTimerRef.current = setTimeout(() => {
          setTransitionPhase('idle');
          isCheckingRef.current = false;
        }, 500);
      }, 500);
      return;
    }

    setIsGameComplete(true);
    await saveFinalProgress();

    navigateTimerRef.current = setTimeout(() => {
      navigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    }, 500);
  }, [
    canCheck,
    transitionPhase,
    selectedIndices,
    gameItems,
    buildCardResults,
    roundIdx,
    currentNumber,
    targetQuantity,
    totalCorrect,
    totalRounds,
    initializeRound,
    navigate,
    subject,
    level,
    lessonId,
    saveFinalProgress,
    stopIntroAudio,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  🎨 RENDER
  // ═══════════════════════════════════════════════════════════

  const getContainerClass = () => {
    if (transitionPhase === 'fade-out') return 'npi-fade-out';
    if (transitionPhase === 'fade-in') return 'npi-fade-in';
    return '';
  };

  if (gameItems.length === 0) {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{GAME_CSS}</style>
        <style>{FONT_CSS}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm font-bold text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasSelections = selectedIndices.size > 0;
  const isTransitioning = transitionPhase !== 'idle';

  const currentNumberFontSize = 'min(18vh, 180px)';

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
      style={{ touchAction: 'none' }}
    >
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* ─── TOOLBAR (LEFT) ──────────────────────────────── */}
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

      {/* ─── BOARD (LTR for Math) ────────────────────────── */}
      <div
        dir="ltr"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
      >
        {/* ─── TOP: Number Display ─────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-1 pb-2">
          <div className="npi-number-pop">
            <div
              className="flex items-center justify-center rounded-3xl bg-white/50"
              style={{
                border: `4px solid ${ROYAL_BLUE}`,
                padding: 'min(1.2vh, 10px) min(3vh, 30px)',
                minWidth: 'min(16vh, 160px)',
                minHeight: 'min(16vh, 160px)',
                boxShadow:
                  '0 6px 0 0 rgba(65, 105, 225, 0.15), 0 12px 28px -10px rgba(65, 105, 225, 0.25)',
              }}
            >
              <span
                style={{
                  fontFamily:
                    "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: currentNumberFontSize,
                  color: ROYAL_BLUE,
                  textShadow: '0 2px 8px rgba(65, 105, 225, 0.15)',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  display: 'block',
                }}
              >
                {currentNumber}
              </span>
            </div>
          </div>
        </div>

        {/* 🔥 Items grid moved DOWN */}
        <div className="flex-1 flex items-end justify-center min-h-0 w-full pb-6 pt-6">
          <div className="grid grid-cols-5 gap-3 w-full max-w-5xl content-start">
            {gameItems.map((item, index) => {
              const isSelected = selectedIndices.has(index);
              const isToolClear = tool === 'clear';
              const isEmptyCard = item.quantity === 0;

              let bgColor = 'transparent';
              let borderColor = 'transparent';
              let shadowColor = 'transparent';
              let scaleClass = 'hover:scale-[1.03]';
              let cursorClass = 'cursor-pointer';

              if (isSelected) {
                bgColor = ROYAL_BLUE;
                borderColor = 'white';
                shadowColor = ROYAL_BLUE_SHADOW;
                scaleClass = 'scale-[1.03]';
              } else if (isEmptyCard) {
                borderColor = EMPTY_CARD_BORDER;
              }

              if (isToolClear && isSelected) {
                cursorClass = 'cursor-crosshair';
              } else if (isToolClear && !isSelected) {
                cursorClass = 'cursor-not-allowed';
              } else if (isSelected) {
                cursorClass = 'cursor-default';
              }

              const isDisabled =
                isGameComplete ||
                transitionPhase !== 'idle' ||
                (tool === 'clear' && !isSelected);

              const handleClick = () => {
                if (isSelected && isToolClear) {
                  handleClearTap(index);
                } else if (!isSelected && tool !== 'clear') {
                  handleCardSelect(index);
                }
              };

              const ItemComponent = ITEM_COMPONENTS[item.itemType];

              const itemsPerRow =
                item.quantity <= 1 ? 1 :
                item.quantity <= 4 ? 2 :
                item.quantity <= 9 ? 3 :
                4;

              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={handleClick}
                  disabled={isDisabled && !isSelected}
                  className={`
                    npi-pop-in relative flex flex-col items-center justify-center
                    rounded-2xl transition-all duration-200
                    ${isSelected ? 'border-4 clay-sm' : ''}
                    ${!isSelected && isEmptyCard ? 'border-2 border-dashed' : ''}
                    ${!isSelected && !isEmptyCard ? 'border-0' : ''}
                    ${scaleClass}
                    ${cursorClass}
                    ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isSelected ? 'npi-card-select' : ''}
                  `}
                  style={{
                    ['--clay-shadow' as string]: shadowColor,
                    aspectRatio: '1/1',
                    width: '100%',
                    maxWidth: '110px',
                    minWidth: '70px',
                    padding: '4px',
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                      gap: '2px',
                      placeItems: 'center',
                      pointerEvents: 'none',
                      padding: '3px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {Array.from({ length: item.quantity }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <ItemComponent size="100%" />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NumbersPickCorrectItemsBulkBase;