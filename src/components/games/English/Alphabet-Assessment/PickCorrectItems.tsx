// src/components/games/English/Alphabet-Revisions/PickCorrectItems.tsx
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check
// 🔥 Max selection limit = total correct items count
// 🔥 FIXED: Selection ke baad SVG color change NAHI hota (filter hata diya)
// 🔥 FIXED: Eraser use ke baad screen normal, tool auto select mode
// 🔥 Progress saved with per-card results for dashboard
//
// ✅ UPDATED (v2):
//    - 🔥 Intro audio plays ONCE at start (fire-and-forget, no lock)
//      Source: src/assets/English Assessment Audios/Pick Correct Items/intro.wav
//    - Board is interactive from frame 1
//    - Next sessions do NOT replay intro audio
//
// ✅ UPDATED (v3): SUMMARY added
//    - Per-letter result: "Letter A - Correct (5/5 selected)" / "Letter B - Wrong (3/5 correct, 2 wrong selected)"
//    - Uncompleted: "Student did not complete the Pick Correct Items lesson."

const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Undo2, Redo2, Eraser, Check } from 'lucide-react';

// ─── 🔥 PROGRESS SYNC ─────────────────────────────────────────
import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// ─── Import Item SVG Map ──────────────────────────────────────
import { getItemSvgUrl } from '@/components/games/English/Alphabet-Letter5Items Introduction/svgMap';

// 🔥 Intro audio — plays once at the very start
const introAudio = "/assets/English Assessment Audios/Pick Correct Items/intro.wav";

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = '#4169E1';

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = 'english') {
  const colors: Record<string, { letterColor: string; cardBg: string; cardShadow: string }> = {
    english: {
      letterColor: ROYAL_BLUE,
      cardBg: ROYAL_BLUE,
      cardShadow: 'oklch(0.4 0.18 260 / 0.9)',
    },
    math: {
      letterColor: ROYAL_BLUE,
      cardBg: ROYAL_BLUE,
      cardShadow: 'oklch(0.4 0.18 260 / 0.9)',
    },
    urdu: {
      letterColor: ROYAL_BLUE,
      cardBg: ROYAL_BLUE,
      cardShadow: 'oklch(0.4 0.18 260 / 0.9)',
    },
  };
  return colors[subject] || colors.english;
}

// ─── 🔥 ITEMS MAP ──────────────────────────────────────────────
const CORRECT_ITEMS_MAP: Record<string, string[]> = {
  'A': ['aeroplane', 'alligator', 'ant', 'apple', 'axe'],
  'B': ['bag', 'ball', 'banana', 'book', 'bus'],
  'C': ['cake', 'car', 'cat', 'clock', 'cow'],
  'D': ['deer', 'dog', 'door', 'drum', 'duck'],
  'E': ['eagle', 'ear', 'egg', 'elephant', 'eye'],
  'F': ['fan', 'fish', 'flower', 'fox', 'frog'],
  'G': ['gift', 'giraffe', 'goat', 'grapes', 'grass'],
  'H': ['hat', 'heart', 'hen', 'horse', 'house'],
  'I': ['ice', 'icecream', 'igloo', 'injection', 'iron'],
  'J': ['jacket', 'jar', 'jellyfish', 'joker', 'juice'],
  'K': ['kangaroo', 'key', 'king', 'kite', 'kiwi'],
  'L': ['ladder', 'lamp', 'leaf', 'lemon', 'lion'],
  'M': ['mango', 'monkey', 'moon', 'mouse', 'mouth'],
  'N': ['necklace', 'newspaper', 'night', 'nose', 'nurse'],
  'O': ['octopus', 'onion', 'orange', 'outfit', 'owl'],
  'P': ['parrot', 'peach', 'pencil', 'penguin', 'pineapple'],
  'Q': ['quail', 'queen', 'questionmark', 'quil', 'quiver'],
  'R': ['rabbit', 'rainbow', 'ring', 'robot', 'rose'],
  'S': ['ship', 'snake', 'star', 'stick', 'sun'],
  'T': ['tiger', 'toothbrush', 'train', 'tree', 'turtle'],
  'U': ['ufo', 'umbrella', 'unicorn', 'uniform', 'up'],
  'V': ['van', 'vase', 'vegetables', 'violin', 'vulture'],
  'W': ['watch', 'watermelon', 'whale', 'window', 'wolf'],
  'X': ['box', 'six', 'x-ray', 'xerus', 'xylophone'],
  'Y': ['yak', 'yarn', 'yatch', 'yogurt', 'yoyo'],
  'Z': ['zebra', 'zero', 'zip', 'zombie', 'zucchini'],
};

// ─── RANDOM ITEMS POOL ──────────────────────────────────────────
const RANDOM_POOL: Record<string, Array<{ id: string; letter: string }>> = {
  'A': [{ id: 'rainbow', letter: 'R' }, { id: 'yogurt', letter: 'Y' }, { id: 'ring', letter: 'R' }, { id: 'giraffe', letter: 'G' }, { id: 'quiver', letter: 'Q' }],
  'B': [{ id: 'goat', letter: 'G' }, { id: 'frog', letter: 'F' }, { id: 'ship', letter: 'S' }, { id: 'cat', letter: 'C' }, { id: 'house', letter: 'H' }],
  'C': [{ id: 'jellyfish', letter: 'J' }, { id: 'book', letter: 'B' }, { id: 'joker', letter: 'J' }, { id: 'fan', letter: 'F' }, { id: 'wolf', letter: 'W' }],
  'D': [{ id: 'ear', letter: 'E' }, { id: 'goat', letter: 'G' }, { id: 'jellyfish', letter: 'J' }, { id: 'ant', letter: 'A' }, { id: 'penguin', letter: 'P' }],
  'E': [{ id: 'injection', letter: 'I' }, { id: 'bag', letter: 'B' }, { id: 'onion', letter: 'O' }, { id: 'ring', letter: 'R' }, { id: 'window', letter: 'W' }],
  'F': [{ id: 'questionmark', letter: 'Q' }, { id: 'injection', letter: 'I' }, { id: 'key', letter: 'K' }, { id: 'vulture', letter: 'V' }, { id: 'quail', letter: 'Q' }],
  'G': [{ id: 'monkey', letter: 'M' }, { id: 'newspaper', letter: 'N' }, { id: 'cow', letter: 'C' }, { id: 'jacket', letter: 'J' }, { id: 'eagle', letter: 'E' }],
  'H': [{ id: 'book', letter: 'B' }, { id: 'bag', letter: 'B' }, { id: 'night', letter: 'N' }, { id: 'penguin', letter: 'P' }, { id: 'turtle', letter: 'T' }],
  'I': [{ id: 'ant', letter: 'A' }, { id: 'cat', letter: 'C' }, { id: 'drum', letter: 'D' }, { id: 'grapes', letter: 'G' }, { id: 'king', letter: 'K' }],
  'J': [{ id: 'igloo', letter: 'I' }, { id: 'ladder', letter: 'L' }, { id: 'door', letter: 'D' }, { id: 'grapes', letter: 'G' }, { id: 'axe', letter: 'A' }],
  'K': [{ id: 'outfit', letter: 'O' }, { id: 'door', letter: 'D' }, { id: 'alligator', letter: 'A' }, { id: 'giraffe', letter: 'G' }, { id: 'penguin', letter: 'P' }],
  'L': [{ id: 'apple', letter: 'A' }, { id: 'rabbit', letter: 'R' }, { id: 'tiger', letter: 'T' }, { id: 'fish', letter: 'F' }, { id: 'outfit', letter: 'O' }],
  'M': [{ id: 'yarn', letter: 'Y' }, { id: 'fox', letter: 'F' }, { id: 'gift', letter: 'G' }, { id: 'pencil', letter: 'P' }, { id: 'vegetables', letter: 'V' }],
  'N': [{ id: 'house', letter: 'H' }, { id: 'rose', letter: 'R' }, { id: 'cake', letter: 'C' }, { id: 'zero', letter: 'Z' }, { id: 'watch', letter: 'W' }],
  'O': [{ id: 'deer', letter: 'D' }, { id: 'heart', letter: 'H' }, { id: 'wolf', letter: 'W' }, { id: 'stick', letter: 'S' }, { id: 'cake', letter: 'C' }],
  'P': [{ id: 'violin', letter: 'V' }, { id: 'heart', letter: 'H' }, { id: 'robot', letter: 'R' }, { id: 'banana', letter: 'B' }, { id: 'frog', letter: 'F' }],
  'Q': [{ id: 'duck', letter: 'D' }, { id: 'onion', letter: 'O' }, { id: 'snake', letter: 'S' }, { id: 'cat', letter: 'C' }, { id: 'rose', letter: 'R' }],
  'R': [{ id: 'kiwi', letter: 'K' }, { id: 'window', letter: 'W' }, { id: 'deer', letter: 'D' }, { id: 'moon', letter: 'M' }, { id: 'joker', letter: 'J' }],
  'S': [{ id: 'ice', letter: 'I' }, { id: 'ladder', letter: 'L' }, { id: 'duck', letter: 'D' }, { id: 'house', letter: 'H' }, { id: 'ring', letter: 'R' }],
  'T': [{ id: 'car', letter: 'C' }, { id: 'bag', letter: 'B' }, { id: 'giraffe', letter: 'G' }, { id: 'ladder', letter: 'L' }, { id: 'zucchini', letter: 'Z' }],
  'U': [{ id: 'drum', letter: 'D' }, { id: 'iron', letter: 'I' }, { id: 'wolf', letter: 'W' }, { id: 'cat', letter: 'C' }, { id: 'turtle', letter: 'T' }],
  'V': [{ id: 'cake', letter: 'C' }, { id: 'juice', letter: 'J' }, { id: 'parrot', letter: 'P' }, { id: 'gift', letter: 'G' }, { id: 'pencil', letter: 'P' }],
  'W': [{ id: 'orange', letter: 'O' }, { id: 'fan', letter: 'F' }, { id: 'cat', letter: 'C' }, { id: 'yoyo', letter: 'Y' }, { id: 'tiger', letter: 'T' }],
  'X': [{ id: 'bus', letter: 'B' }, { id: 'ufo', letter: 'U' }, { id: 'apple', letter: 'A' }, { id: 'kite', letter: 'K' }, { id: 'door', letter: 'D' }],
  'Y': [{ id: 'up', letter: 'U' }, { id: 'heart', letter: 'H' }, { id: 'kiwi', letter: 'K' }, { id: 'axe', letter: 'A' }, { id: 'wolf', letter: 'W' }],
  'Z': [{ id: 'cake', letter: 'C' }, { id: 'yogurt', letter: 'Y' }, { id: 'fox', letter: 'F' }, { id: 'apple', letter: 'A' }, { id: 'stick', letter: 'S' }],
};

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

// ─── Animations CSS ──────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes pci-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes pci-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes pci-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes pci-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pci-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes pci-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  .pci-pop-in { animation: pci-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .pci-fade-out { animation: pci-fade-out 0.5s ease-in both; }
  .pci-fade-in { animation: pci-fade-in 0.5s ease-out both; }
  .pci-tool-pop { animation: pci-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .pci-check-pulse { animation: pci-tool-pulse-green 1.4s ease-out infinite; }
  .pci-card-select { animation: pci-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
`;

// ─── Types ──────────────────────────────────────────────────
interface Item {
  id: string;
  name: string;
  svgUrl: string;
  isCorrect: boolean;
}

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

// 🔥 Per-card result for dashboard
interface CardResult {
  id: string;
  name: string;
  isCorrect: boolean;
  wasSelected: boolean;
  result: "correct" | "wrong" | "missed" | "ignored";
}

// 🔥 Session snapshot
interface SessionSnapshot {
  totalCards: number;
  totalCorrect: number;
  selectedCount: number;
  correctSelections: number;
  allItems: Array<{ id: string; name: string; isCorrect: boolean }>;
  cardResults: CardResult[];
}

// 🔥 Session stats
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

type Tool = "select" | "clear";
type TransitionPhase = "idle" | "fade-out" | "fade-in";

// ─── Level Config ──────────────────────────────────────────────
const LEVEL_SESSIONS_MAP: Record<number, string[]> = {
  8: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  16: ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  23: ['O', 'P', 'Q', 'R', 'S', 'T'],
  30: ['U', 'V', 'W', 'X', 'Y', 'Z'],
};

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  sessions: string[],
  snapshots: Array<SessionSnapshot | null>,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Pick Correct Items lesson.`;
  }

  const lines: string[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const letter = sessions[i];
    const snap = snapshots[i];

    if (!snap) {
      lines.push(`Letter ${letter} - Missed (0/${snap?.totalCorrect ?? 5} selected)`);
      continue;
    }

    const correctSelected = snap.cardResults.filter(
      (r) => r.result === "correct"
    ).length;
    const wrongSelected = snap.cardResults.filter(
      (r) => r.result === "wrong"
    ).length;
    const totalCorrect = snap.totalCorrect;

    let status: string;
    let detail: string;

    if (snap.selectedCount === 0) {
      status = "Missed";
      detail = `0/${totalCorrect} selected`;
    } else if (correctSelected === totalCorrect && wrongSelected === 0) {
      status = "Correct";
      detail = `${correctSelected}/${totalCorrect} selected`;
    } else if (wrongSelected > 0) {
      status = "Wrong";
      detail = `${correctSelected}/${totalCorrect} correct, ${wrongSelected} wrong selected`;
    } else {
      status = "Wrong";
      detail = `${correctSelected}/${totalCorrect} selected`;
    }

    lines.push(`Letter ${letter} - ${status} (${detail})`);
  }

  return lines.join('\n');
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
    "pci-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";

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
      className={`${base} ${style} ${pulse ? "pci-check-pulse" : ""}`}
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

// ─── Main Component ──────────────────────────────────────────
export function PickCorrectItems({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const sessions = useMemo(
    () => LEVEL_SESSIONS_MAP[level] || letters || ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    [level, letters],
  );
  const totalSessions = sessions.length;

  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const currentLetter = sessions[currentSessionIndex] || 'A';

  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');

  const buildItemsForLetter = useCallback((letter: string): Item[] => {
    const correctItems = CORRECT_ITEMS_MAP[letter] || [];
    const randomItems = RANDOM_POOL[letter] || [];

    const items: Item[] = [
      ...correctItems.map(id => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        svgUrl: getItemSvgUrl(letter, id),
        isCorrect: true,
      })),
      ...randomItems.map(item => ({
        id: item.id,
        name: item.id.charAt(0).toUpperCase() + item.id.slice(1),
        svgUrl: getItemSvgUrl(item.letter, item.id),
        isCorrect: false,
      })),
    ];

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }, []);

  const [gameItems, setGameItems] = useState<Item[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isGameComplete, setIsGameComplete] = useState(false);

  const [tool, setTool] = useState<Tool>("select");
  const [undoStack, setUndoStack] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);

  const sessionStatsRef = useRef<Record<number, SessionStats>>({});
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const finalSnapshotsRef = useRef<Record<number, SessionSnapshot | null>>({});
  const savePartialProgressRef = useRef<() => void>(() => {});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔥 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const totalCorrect = useMemo(
    () => gameItems.filter(i => i.isCorrect).length,
    [gameItems],
  );
  const maxSelection = totalCorrect;

  // ════════════════════════════════════════════════════════════
  //  🔥 STOP INTRO AUDIO
  // ════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════
  //  🔥 PLAY INTRO AUDIO (fire-and-forget, no lock)
  // ════════════════════════════════════════════════════════════
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

  // ─── Initialize session ─────────────────────────────────────
  const initializeSession = useCallback((letter: string, sessionIdx?: number) => {
    const idx = sessionIdx ?? currentSessionIndex;
    const items = buildItemsForLetter(letter);
    setGameItems(items);
    setSelectedIndices(new Set());
    setUndoStack([]);
    setRedoStack([]);
    setTool("select");
    setTransitionPhase('idle');
    setIsGameComplete(false);

    sessionStatsRef.current[idx] = emptyStats();
    sessionStartTimeRef.current = Date.now();
  }, [buildItemsForLetter, currentSessionIndex]);

  // ════════════════════════════════════════════════════════════
  //  MOUNT — initialize session + play intro audio
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    introPlayedRef.current = false;
    initializeSession(currentLetter);

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

  // ─── History helpers ────────────────────────────────────────
  const pushUndo = useCallback((current: Set<number>) => {
    setUndoStack(prev => [...prev, Array.from(current)]);
    setRedoStack([]);
  }, []);

  // ─── Handle card select ─────────────────────────────────────
  const handleCardSelect = useCallback((index: number) => {
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

    const stats = sessionStatsRef.current[currentSessionIndex];
    if (stats) stats.totalSelections += 1;
  }, [isGameComplete, transitionPhase, tool, selectedIndices, maxSelection, pushUndo, currentSessionIndex]);

  // ─── Handle clear tool tap ──────────────────────────────────
  const handleClearTap = useCallback((index: number) => {
    if (tool !== 'clear') return;
    if (isGameComplete) return;
    if (transitionPhase !== 'idle') return;

    if (!selectedIndices.has(index)) return;

    pushUndo(selectedIndices);

    const next = new Set(selectedIndices);
    next.delete(index);
    setSelectedIndices(next);

    const stats = sessionStatsRef.current[currentSessionIndex];
    if (stats) stats.selectionsRemoved += 1;

    setTool("select");
  }, [tool, isGameComplete, transitionPhase, selectedIndices, pushUndo, currentSessionIndex]);

  // ─── Undo/Redo ──────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];

    const stats = sessionStatsRef.current[currentSessionIndex];
    if (stats) stats.undoCount += 1;

    setUndoStack(s => s.slice(0, -1));
    setRedoStack(r => [...r, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(prev));
  }, [undoStack, selectedIndices, currentSessionIndex]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    const stats = sessionStatsRef.current[currentSessionIndex];
    if (stats) stats.redoCount += 1;

    setRedoStack(s => s.slice(0, -1));
    setUndoStack(u => [...u, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(next));
  }, [redoStack, selectedIndices, currentSessionIndex]);

  const handleToggleClear = useCallback(() => {
    setTool(prev => (prev === 'clear' ? 'select' : 'clear'));
  }, []);

  // ─── Can check ──────────────────────────────────────────────
  const canCheck = useMemo(() => {
    if (maxSelection === 0) return false;
    if (gameItems.length === 0) return false;
    return selectedIndices.size >= maxSelection;
  }, [maxSelection, selectedIndices.size, gameItems.length]);

  // ─── Build card results ─────────────────────────────────────
  const buildCardResults = useCallback(
    (items: Item[], selectedSet: Set<number>): CardResult[] => {
      return items.map((item, idx) => {
        const wasSelected = selectedSet.has(idx);

        let result: CardResult["result"];
        if (item.isCorrect && wasSelected) result = "correct";
        else if (!item.isCorrect && wasSelected) result = "wrong";
        else if (item.isCorrect && !wasSelected) result = "missed";
        else result = "ignored";

        return {
          id: item.id,
          name: item.name,
          isCorrect: item.isCorrect,
          wasSelected,
          result,
        };
      });
    },
    [],
  );

  // ─── Progress save ──────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const allSessions = sessions.map((letter, idx) => {
        const snap = finalSnapshotsRef.current[idx];
        const stats = sessionStatsRef.current[idx] ?? emptyStats();
        return {
          sessionNum: idx + 1,
          letter,
          totalCards: snap?.totalCards ?? 0,
          totalCorrect: snap?.totalCorrect ?? 0,
          selectedCount: snap?.selectedCount ?? 0,
          correctSelections: snap?.correctSelections ?? 0,
          allItems: snap?.allItems ?? [],
          cardResults: snap?.cardResults ?? [],
          stats: { ...stats },
        };
      });

      return {
        type: "pick-correct-items",
        lessonType: "pick-correct",
        sessions: allSessions,
        completed,
      };
    },
    [sessions],
  );

  const saveFinalProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const totalTimeSec = Object.values(sessionStatsRef.current).reduce(
      (sum, s) => sum + (s?.timeSec ?? 0),
      0,
    );
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const snapshots = sessions.map((_, idx) => finalSnapshotsRef.current[idx] ?? null);
    const summary = buildFullSummary(studentName, sessions, snapshots, true);

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
      console.log('[PickCorrectItems] ✅ Final progress saved');
    } catch (err) {
      console.error('[PickCorrectItems] ❌ Final save failed:', err);
    }
  }, [sessions, subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const snapshots = sessions.map((_, idx) => finalSnapshotsRef.current[idx] ?? null);
    const summary = buildFullSummary(studentName, sessions, snapshots, false);

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
    } catch {}
  }, [sessions, subject, level, lessonId, buildGameData]);

  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── Check ──────────────────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    if (transitionPhase !== 'idle') return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const stats = sessionStatsRef.current[currentSessionIndex];
    if (stats) {
      stats.finalSelected = selectedIndices.size;
      stats.timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    }

    const cardResults = buildCardResults(gameItems, selectedIndices);
    const correctSelections = cardResults.filter(r => r.result === 'correct').length;

    finalSnapshotsRef.current[currentSessionIndex] = {
      totalCards: gameItems.length,
      totalCorrect,
      selectedCount: selectedIndices.size,
      correctSelections,
      allItems: gameItems.map(i => ({ id: i.id, name: i.name, isCorrect: i.isCorrect })),
      cardResults,
    };

    if (currentSessionIndex >= totalSessions - 1) {
      setIsGameComplete(true);
      await saveFinalProgress();

      navigateTimerRef.current = setTimeout(() => {
        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      }, 500);
    } else {
      setTransitionPhase('fade-out');
      transitionTimerRef.current = setTimeout(() => {
        const nextIndex = currentSessionIndex + 1;
        setCurrentSessionIndex(nextIndex);
        const nextLetter = sessions[nextIndex];

        const items = buildItemsForLetter(nextLetter);
        setGameItems(items);
        setSelectedIndices(new Set());
        setUndoStack([]);
        setRedoStack([]);
        setTool("select");
        setIsGameComplete(false);

        sessionStatsRef.current[nextIndex] = emptyStats();
        sessionStartTimeRef.current = Date.now();

        setTransitionPhase('fade-in');
        transitionTimerRef.current = setTimeout(() => {
          setTransitionPhase('idle');
          isCheckingRef.current = false;
        }, 500);
      }, 500);
    }
  }, [
    canCheck,
    transitionPhase,
    currentSessionIndex,
    totalSessions,
    sessions,
    gameItems,
    selectedIndices,
    totalCorrect,
    buildCardResults,
    buildItemsForLetter,
    navigate,
    subject,
    level,
    lessonId,
    saveFinalProgress,
  ]);

  const getContainerClass = () => {
    if (transitionPhase === 'fade-out') return 'pci-fade-out';
    if (transitionPhase === 'fade-in') return 'pci-fade-in';
    return '';
  };

  if (gameItems.length === 0) {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
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

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
      style={{ touchAction: 'none' }}
    >
      <style>{ANIMATION_CSS}</style>
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

      <div className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4">
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-2 pb-4">
          <div className="pci-pop-in">
            <div
              className="flex items-center justify-center gap-4 sm:gap-6 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl bg-white/50"
              style={{ border: `4px solid ${subjectColor.letterColor}` }}
            >
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: 'min(14vh, 120px)',
                  color: subjectColor.letterColor,
                  textShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                }}
              >
                {currentLetter}
              </span>
              <span
                style={{
                  fontFamily: "'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: 'min(14vh, 120px)',
                  color: subjectColor.letterColor,
                  textShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                }}
              >
                {currentLetter.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center min-h-0 w-full pb-3">
          <div className="grid grid-cols-5 gap-3 w-full max-w-5xl content-start">
            {gameItems.map((item, index) => {
              const isSelected = selectedIndices.has(index);
              const isToolClear = tool === 'clear';

              let bgColor = 'transparent';
              let borderColor = 'transparent';
              let shadowColor = 'transparent';
              let scaleClass = 'hover:scale-[1.03]';
              let cursorClass = 'cursor-pointer';

              if (isSelected) {
                bgColor = ROYAL_BLUE;
                borderColor = 'white';
                shadowColor = 'oklch(0.4 0.18 260 / 0.9)';
                scaleClass = 'scale-[1.03]';
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

              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={handleClick}
                  disabled={isDisabled && !isSelected}
                  className={`
                    pci-pop-in relative flex flex-col items-center justify-center
                    rounded-2xl transition-all duration-200
                    ${isSelected ? 'border-4 clay-sm' : 'border-0'}
                    ${scaleClass}
                    ${cursorClass}
                    ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isSelected ? 'pci-card-select' : ''}
                  `}
                  style={{
                    ["--clay-shadow" as string]: shadowColor,
                    aspectRatio: '1/1',
                    width: '100%',
                    maxWidth: '180px',
                    minWidth: '100px',
                    padding: '8px',
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={item.svgUrl}
                      alt={item.name}
                      className="w-[130px] h-[130px] object-contain pointer-events-none"
                      style={{
                        maxWidth: '130px',
                        maxHeight: '130px',
                      }}
                    />
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

export default PickCorrectItems;