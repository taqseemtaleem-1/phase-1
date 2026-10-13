// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiItemMatchingBulkBase.tsx
// ✅ Urdu version of LetterItemMatching — Bulk Assessment
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check — on LEFT
// 🔥 8 letters per bulk level — 2 sessions (4 + 4)
// 🔥 RTL visual: Letters on RIGHT, Items on LEFT
// 🔥 FREE MATCHING — any letter can match any item
// 🔥 Eraser tool ON → lines RED, tap to unmatch
// 💾 SUMMARY added — per-letter match status with names
// 🔥 INTRO AUDIO — intro.wav plays ONCE at game start

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

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 INTRO AUDIO
// ═══════════════════════════════════════════════════════════════

const INTRO_AUDIO_MODULES = import.meta.glob<string>(
  "/src/assets/Urdu Assessment Assets/Huroof E Tahajji Item Matching Bulk/intro.wav",
  { eager: true, query: "?url", import: "default" },
);

const INTRO_AUDIO_URL: string | null =
  Object.values(INTRO_AUDIO_MODULES)[0] ?? null;

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";
const ERASER_RED = "#EF4444";

// ═══════════════════════════════════════════════════════════════
//  🔤 URDU LETTER NAMES
// ═══════════════════════════════════════════════════════════════

const URDU_LETTER_NAMES: Record<string, string> = {
  'ا': 'Alif',        'آ': 'Alif Madda',
  'ب': 'Bay',         'پ': 'Pay',
  'ت': 'Tay',         'ٹ': 'Ttay',
  'ث': 'Say',         'ج': 'Jeem',
  'چ': 'Chay',        'ح': 'Hay',
  'خ': 'Khay',        'د': 'Daal',
  'ڈ': 'Ddaal',       'ذ': 'Zaal',
  'ر': 'Ray',         'ڑ': 'Rray',
  'ز': 'Zay',         'ژ': 'Zhay',
  'س': 'Seen',        'ش': 'Sheen',
  'ص': 'Suad',        'ض': 'Zuad',
  'ط': 'Toe',         'ظ': 'Zoe',
  'ع': 'Ain',         'غ': 'Ghain',
  'ف': 'Fay',         'ق': 'Qaf',
  'ک': 'Kaf',         'گ': 'Gaf',
  'ل': 'Laam',        'م': 'Meem',
  'ن': 'Noon',        'ں': 'Noon Ghunna',
  'و': 'Waw',         'ہ': 'Hay',
  'ھ': 'Do Chashmi Hay', 'ء': 'Hamza',
  'ی': 'Chhoti Yay',  'ے': 'Bari Yay',
};

function getLetterLabel(letter: string): string {
  const name = URDU_LETTER_NAMES[letter];
  return name ? `'${letter}' (${name})` : `'${letter}'`;
}

// ═══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ═══════════════════════════════════════════════════════════════

interface MatchResult {
  letter: string;
  expectedItem: string;
  userItem: string | null;
  result: "correct" | "wrong" | "missed";
}

interface SessionSnapshot {
  totalPairs: number;
  matchedCount: number;
  correctMatches: number;
  matchResults: MatchResult[];
}

function buildFullSummary(
  studentName: string,
  s1Snapshot: SessionSnapshot | null,
  s2Snapshot: SessionSnapshot | null,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Item Matching lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (snapshot: SessionSnapshot | null) => {
    if (!snapshot) return;
    for (const r of snapshot.matchResults) {
      const status =
        r.result === "correct" ? "Correct" :
        r.result === "missed" ? "Missed" : "Wrong";
      lines.push(`Letter ${getLetterLabel(r.letter)} - ${status}`);
    }
  };

  buildLines(s1Snapshot);
  buildLines(s2Snapshot);

  return lines.join("\n");
}

// ─── 🔥 URDU LETTER → NUMBER MAP ────────────────────────────
const URDU_LETTER_TO_NUMBER: Record<string, number> = {
  "ا": 1,  "آ": 2,  "ب": 3,  "پ": 4,
  "ت": 5,  "ٹ": 6,  "ث": 7,  "ج": 8,
  "چ": 9,  "ح": 10, "خ": 11, "د": 12,
  "ڈ": 13, "ذ": 14, "ر": 15, "ڑ": 16,
  "ز": 17, "ژ": 18, "س": 19, "ش": 20,
  "ص": 21, "ض": 22, "ط": 23, "ظ": 24,
  "ع": 25, "غ": 26, "ف": 27, "ق": 28,
  "ک": 29, "گ": 30, "ل": 31, "م": 32,
  "ن": 33, "ں": 34, "و": 35, "ہ": 36,
  "ھ": 37, "ء": 38, "ی": 39, "ے": 40,
};

// ─── 🔥 URDU ITEM SVG MODULES ────────────────────────────────
const URDU_ITEM_SVG_MODULES = import.meta.glob<string>(
  "/src/assets/Urdu Items SVG/*/*.svg",
  { eager: true, query: "?url", import: "default" },
);

function getItemsForLetter(letterNumber: number): string[] {
  const prefix = `/src/assets/Urdu Items SVG/${letterNumber}/`;
  const items: string[] = [];
  for (const path of Object.keys(URDU_ITEM_SVG_MODULES)) {
    if (path.startsWith(prefix)) {
      const filename = path.slice(prefix.length).replace(/\.svg$/, "");
      if (filename && !filename.includes("/") && filename !== "intro") {
        items.push(filename);
      }
    }
  }
  return items.sort();
}

function getUrduItemSvgUrl(letterNumber: number, itemId: string): string {
  const key = `/src/assets/Urdu Items SVG/${letterNumber}/${itemId}.svg`;
  const url = URDU_ITEM_SVG_MODULES[key];
  if (!url) console.warn(`[HuroofItemMatching] Missing SVG: ${key}`);
  return url ?? "";
}

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────
function getSubjectColor(subject: string = "urdu") {
  const colors: Record<string, { cardBg: string; cardShadow: string; selectedColor: string }> = {
    urdu: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", selectedColor: ROYAL_BLUE },
    english: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", selectedColor: ROYAL_BLUE },
    math: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", selectedColor: ROYAL_BLUE },
  };
  return colors[subject] || colors.urdu;
}

// ─── 🔥 FONT CSS ──────────────────────────────────────────────
const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ─── 🔥 ANIMATION CSS ──────────────────────────────────────────
const GAME_CSS = `
  @keyframes him-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes him-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }
  @keyframes him-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes him-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes him-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes him-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes him-tool-pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75), 0 0 0 0 rgba(34, 197, 94, 0.35); }
    50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0), 0 0 0 16px rgba(34, 197, 94, 0); }
  }

  .him-pop-in { animation: him-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .him-pulse { animation: him-pulse 0.6s ease-in-out infinite alternate; }
  .him-pop-smooth { animation: him-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .him-fade-out { animation: him-fade-out 0.5s ease-in both; }
  .him-fade-in { animation: him-fade-in 0.5s ease-out both; }
  .him-tool-pop { animation: him-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .him-check-pulse { animation: him-tool-pulse-green 1.4s ease-out infinite; }
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
  letter: string;
  itemId: string;
  itemName: string;
  matched: boolean;
}

interface MatchedLine {
  letter: string;
  itemKey: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ItemData {
  letterNumber: number;
  letter: string;
  itemId: string;
  itemName: string;
  svgUrl: string;
  audioUrl: string;
}

type Point = { x: number; y: number };

interface HistorySnapshot {
  pairs: LetterPair[];
  itemList: ItemData[];
  matchedLines: MatchedLine[];
  matchedCount: number;
}

interface SessionStats {
  totalMatches: number;
  matchesRemoved: number;
  undoCount: number;
  redoCount: number;
  finalMatches: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return { totalMatches: 0, matchesRemoved: 0, undoCount: 0, redoCount: 0, finalMatches: 0, timeSec: 0 };
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
  onClick, disabled, active, danger, pulse, ariaLabel, children,
}: ToolButtonProps) {
  const base = "him-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";
  let style = "border-white/60 bg-white text-slate-600 shadow";
  if (disabled) style = "border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed";
  else if (danger) style = "border-white bg-red-500 text-white shadow-lg hover:bg-red-600";
  else if (active) style = "border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600";
  else style = "border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110";

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={ariaLabel}
      className={`${base} ${style} ${pulse ? "him-check-pulse" : ""}`}>
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
  onUndo, onRedo, onToggleClear, onCheck,
  canUndo, canRedo, tool, hasDrops, canCheck, isTransitioning,
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
//  🎯 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function HuroofETahajjiItemMatchingBulkBase({
  letters, subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const SESSION_1_LETTERS = useMemo(() => letters.slice(0, 4), [letters]);
  const SESSION_2_LETTERS = useMemo(() => letters.slice(4, 8), [letters]);

  const [session, setSession] = useState<Session>(1);
  const [pairs, setPairs] = useState<LetterPair[]>([]);
  const [itemList, setItemList] = useState<ItemData[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");

  const [tool, setTool] = useState<Tool>("drag");
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  const [matchedLines, setMatchedLines] = useState<MatchedLine[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragLetter, setDragLetter] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const isMountedRef = useRef(true);
  const audioUnlockedRef = useRef<boolean>(false);
  const preloadedIntroRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const shuffleWithNoSameRow = useCallback(
    (items: ItemData[]): ItemData[] => {
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
        if (!hasSameRow) return shuffled;
      }

      const fallback = [...items];
      for (let i = 0; i < total; i++) {
        if (fallback[i].letter === originalLetters[i]) {
          const swapIndex = (i + 1) % total;
          if (swapIndex !== i) {
            [fallback[i], fallback[swapIndex]] = [fallback[swapIndex], fallback[i]];
          }
        }
      }
      return fallback;
    },
    [shuffleArray],
  );

  // ─── AUDIO HELPERS ──────────────────────────────────────────
  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; audio.onended = null; audio.onerror = null; } catch {}
  }, []);

  const stopAllAudio = useCallback(() => {
    audioRefs.current.forEach((audio) => stopAudio(audio));
    audioRefs.current = [];
  }, [stopAudio]);

  const preloadIntroAudio = useCallback(() => {
    if (!INTRO_AUDIO_URL) return;
    try {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = INTRO_AUDIO_URL;
      preloadedIntroRef.current = audio;
    } catch {}
  }, []);

  const playAudio = useCallback(
    (src: string, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();
        try {
          let audio: HTMLAudioElement | null = null;
          const preloaded = preloadedIntroRef.current;
          if (preloaded && (preloaded.src === src || preloaded.src.endsWith(src.split("/").pop() || ""))) {
            audio = preloaded;
            audio.currentTime = 0;
          } else {
            audio = new Audio(src);
          }
          audioRefs.current.push(audio);

          const cleanup = () => {
            const index = audioRefs.current.indexOf(audio!);
            if (index !== -1) audioRefs.current.splice(index, 1);
          };

          audio.onended = () => { cleanup(); if (onComplete) onComplete(); resolve(); };
          audio.onerror = () => { cleanup(); if (onComplete) onComplete(); resolve(); };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => { audioUnlockedRef.current = true; }).catch(() => {
              audioUnlockedRef.current = false; cleanup();
              if (onComplete) onComplete();
              resolve();
            });
          }
        } catch {
          if (onComplete) onComplete();
          resolve();
        }
      });
    },
    [stopAllAudio],
  );

  const playIntroAudio = useCallback(() => {
    if (!INTRO_AUDIO_URL) return;
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;
    playAudio(INTRO_AUDIO_URL);
  }, [playAudio]);

  const playIntroAudioRef = useRef(playIntroAudio);
  playIntroAudioRef.current = playIntroAudio;

  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      try {
        const silentAudio = new Audio();
        silentAudio.volume = 0.001;
        silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
        silentAudio.play().then(() => { audioUnlockedRef.current = true; }).catch(() => {});
      } catch {}
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
    document.addEventListener("pointerdown", unlockAudio, { once: false });
    document.addEventListener("touchstart", unlockAudio, { once: false });
    document.addEventListener("keydown", unlockAudio, { once: false });
    return () => {
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const getSessionLetters = useCallback(
    (sessionNum: Session): string[] =>
      sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS,
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
  );

  // ─── INITIALIZE GAME ─────────────────────────────────────────
  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const sessionLetters = getSessionLetters(sessionNum);

      const newPairs: LetterPair[] = sessionLetters
        .map((letter) => {
          const letterNumber = URDU_LETTER_TO_NUMBER[letter];
          if (!letterNumber) return null;
          const items = getItemsForLetter(letterNumber);
          if (items.length === 0) return null;

          const itemId = items[0];
          const itemName = itemId
            .replace(/[-_]/g, " ")
            .split(" ")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ");

          return { letter, itemId, itemName, matched: false };
        })
        .filter(Boolean) as LetterPair[];

      const items: ItemData[] = newPairs.map((pair) => {
        const letterNumber = URDU_LETTER_TO_NUMBER[pair.letter];
        return {
          letterNumber,
          letter: pair.letter,
          itemId: pair.itemId,
          itemName: pair.itemName,
          svgUrl: getUrduItemSvgUrl(letterNumber, pair.itemId),
          audioUrl: "",
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
      setDragLetter(null);
      setDragStart(null);
      setDragEnd(null);
      setHoveredItem(null);
      setIsDragging(false);
      setTransitionPhase("idle");
      setIsGameComplete(false);

      if (sessionNum === 1) s1StatsRef.current = emptyStats();
      else s2StatsRef.current = emptyStats();
      sessionStartTimeRef.current = Date.now();
    },
    [getSessionLetters, shuffleWithNoSameRow],
  );

  useEffect(() => {
    isMountedRef.current = true;
    initializeGame(1);
    preloadIntroAudio();

    const introTimer = setTimeout(() => {
      if (isMountedRef.current) playIntroAudioRef.current();
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      if (!progressSavedRef.current) savePartialProgressRef.current();
      stopAllAudio();
      preloadedIntroRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLetterCenter = useCallback((letter: string): Point | null => {
    const board = boardRef.current;
    const el = letterRefs.current[letter];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }, []);

  const getItemCenter = useCallback((itemKey: string): Point | null => {
    const board = boardRef.current;
    const el = itemRefs.current[itemKey];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }, []);

  const pushUndo = useCallback(
    (
      currentPairs: LetterPair[],
      currentItemList: ItemData[],
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, letter: string) => {
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;
      if (tool === "clear") return;
      if (isDragging) return;

      const pair = pairs.find((p) => p.letter === letter);
      if (pair?.matched) return;

      const board = boardRef.current;
      if (!board) return;
      const b = board.getBoundingClientRect();
      const point = { x: e.clientX - b.left, y: e.clientY - b.top };

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragLetter(letter);
      setDragStart(point);
      setDragEnd(point);
    },
    [isGameComplete, transitionPhase, tool, isDragging, pairs],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragLetter) return;
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
        if (e.clientX >= r.left - padding && e.clientX <= r.right + padding && e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
          const matched = matchedLines.some((l) => l.itemKey === itemKey);
          if (!matched) { hit = itemKey; break; }
        }
      }
      setHoveredItem(hit);
    },
    [isDragging, dragLetter, isGameComplete, transitionPhase, matchedLines],
  );

  const handlePointerUp = useCallback(
    () => {
      if (!isDragging || !dragLetter) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDragLetter(null);
        setHoveredItem(null);
        return;
      }

      const droppedLetter = dragLetter;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);

      const targetItem = hoveredItem;
      setHoveredItem(null);

      if (targetItem) {
        const letterAlreadyMatched = pairs.find((p) => p.letter === droppedLetter)?.matched;
        const itemAlreadyMatched = matchedLines.some((l) => l.itemKey === targetItem);
        if (letterAlreadyMatched || itemAlreadyMatched) { setDragLetter(null); return; }

        pushUndo(pairs, itemList, matchedLines, matchedCount);

        const start = getLetterCenter(droppedLetter);
        const end = getItemCenter(targetItem);
        if (start && end) {
          setMatchedLines((prev) => [...prev, {
            letter: droppedLetter,
            itemKey: targetItem,
            startX: start.x, startY: start.y, endX: end.x, endY: end.y,
          }]);
        }

        setPairs((prev) => prev.map((p) => p.letter === droppedLetter ? { ...p, matched: true } : p));
        setMatchedCount((c) => c + 1);
        activeStatsRef.current.totalMatches += 1;
      }

      setDragLetter(null);
    },
    [isDragging, dragLetter, hoveredItem, pairs, itemList, matchedLines, matchedCount, pushUndo, getLetterCenter, getItemCenter],
  );

  const handleLineTap = useCallback(
    (letter: string) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const line = matchedLines.find((l) => l.letter === letter);
      if (!line) return;

      pushUndo(pairs, itemList, matchedLines, matchedCount);
      setMatchedLines((prev) => prev.filter((l) => l.letter !== letter));
      setPairs((prev) => prev.map((p) => p.letter === letter ? { ...p, matched: false } : p));
      setMatchedCount((c) => Math.max(0, c - 1));
      activeStatsRef.current.matchesRemoved += 1;
      setTool("drag");
    },
    [tool, isGameComplete, transitionPhase, matchedLines, pairs, itemList, matchedCount, pushUndo],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, {
      pairs: pairs.map((p) => ({ ...p })),
      itemList: itemList.map((i) => ({ ...i })),
      matchedLines: matchedLines.map((l) => ({ ...l })),
      matchedCount,
    }]);
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
    setUndoStack((u) => [...u, {
      pairs: pairs.map((p) => ({ ...p })),
      itemList: itemList.map((i) => ({ ...i })),
      matchedLines: matchedLines.map((l) => ({ ...l })),
      matchedCount,
    }]);
    setPairs(next.pairs);
    setItemList(next.itemList);
    setMatchedLines(next.matchedLines);
    setMatchedCount(next.matchedCount);
  }, [redoStack, pairs, itemList, matchedLines, matchedCount]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  const canCheck = useMemo(() => {
    if (pairs.length === 0) return false;
    return matchedCount >= pairs.length;
  }, [pairs.length, matchedCount]);

  const buildMatchResults = useCallback(
    (currentPairs: LetterPair[], currentMatchedLines: MatchedLine[]): MatchResult[] => {
      return currentPairs.map((pair) => {
        const line = currentMatchedLines.find((l) => l.letter === pair.letter);
        const userItemKey = line?.itemKey ?? null;
        let result: MatchResult["result"];
        if (!userItemKey) result = "missed";
        else if (userItemKey === pair.itemId) result = "correct";
        else result = "wrong";

        return {
          letter: pair.letter,
          expectedItem: pair.itemId,
          userItem: userItemKey,
          result,
        };
      });
    },
    [],
  );

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const stats = activeStatsRef.current;
    stats.finalMatches = matchedCount;
    stats.timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    const matchResults = buildMatchResults(pairs, matchedLines);
    const correctMatches = matchResults.filter((r) => r.result === "correct").length;

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
        navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
      }, 500);
    }
  }, [
    canCheck, transitionPhase, matchedCount, pairs, matchedLines,
    session, buildMatchResults, initializeGame, navigate, subject, level, lessonId,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;
      return {
        type: "huroof-tahajji-item-matching-bulk",
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

    const totalTimeSec = s1StatsRef.current.timeSec + s2StatsRef.current.timeSec;
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const summary = buildFullSummary(
      studentName,
      s1FinalSnapshotRef.current,
      s2FinalSnapshotRef.current,
      true,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: "completed",
      timeSpentSec: totalTimeSec,
      summary,
      gameData: buildGameData(true),
    }).catch((err) => console.error("[HuroofItemMatching] Save failed:", err));
  }, [subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const summary = buildFullSummary(
      studentName,
      s1FinalSnapshotRef.current,
      s2FinalSnapshotRef.current,
      false,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: "uncompleted",
      timeSpentSec: elapsed,
      summary,
      gameData: buildGameData(false),
    }).catch(() => {});
  }, [subject, level, lessonId, buildGameData]);

  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "him-fade-out";
    if (transitionPhase === "fade-in") return "him-fade-in";
    return "";
  };

  // ─── RENDER LETTER ──────────────────────────────────────────
  const renderLetter = (pair: LetterPair) => {
    const isMatched = pair.matched;
    const isWideLetter = ["ب", "پ", "ت", "ٹ", "ث", "ج", "چ", "ح", "خ"].includes(pair.letter);
    const fontSize = isWideLetter ? "clamp(2.5rem, 9vh, 5rem)" : "clamp(3rem, 11vh, 6rem)";

    let cursor = "grab";
    if (isMatched) cursor = "default";
    if (tool === "clear") cursor = "default";

    const isDisabled = isGameComplete || transitionPhase !== "idle" || tool === "clear" || isMatched;

    return (
      <div
        key={pair.letter}
        ref={(el) => { letterRefs.current[pair.letter] = el; }}
        onPointerDown={(e) => !isDisabled && !isMatched && handlePointerDown(e, pair.letter)}
        className={`relative flex items-center justify-center transition-all duration-200 ${!isDisabled && !isMatched ? "hover:scale-105" : ""}`}
        style={{
          width: "100%", height: "100%", minHeight: "105px",
          cursor, opacity: isMatched ? 0.85 : 1,
          padding: "5px", touchAction: "none",
        }}
      >
        <div className="absolute rounded-2xl border-4 transition-all duration-200" style={{
          width: "clamp(80px, 18vh, 145px)", height: "clamp(80px, 18vh, 145px)",
          backgroundColor: ROYAL_BLUE, borderColor: "white",
          boxShadow: `0 4px 0 0 oklch(0.4 0.18 260 / 0.9), 0 8px 16px -4px rgba(0,0,0,0.1)`,
        }} />
        <span style={{
          fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
          fontWeight: 400, fontSize, color: "#FFFFFF",
          textShadow: "0 2px 8px rgba(0,0,0,0.25)",
          lineHeight: 1.4,
          display: "flex", alignItems: "center", justifyContent: "center",
          letterSpacing: "0.02em",
          transition: "color 0.2s ease, transform 0.2s ease",
          userSelect: "none", position: "relative", zIndex: 1,
          transform: "translateY(-18%)",
        }}>
          {pair.letter}
        </span>
      </div>
    );
  };

  // ─── RENDER ITEM ────────────────────────────────────────────
  const renderItem = (itemData: ItemData) => {
    const itemKey = itemData.itemId;
    const isMatched = matchedLines.some((l) => l.itemKey === itemKey);
    const isHovered = hoveredItem === itemKey;

    let scaleClass = "";
    let glow = "none";
    let cursor = "pointer";

    if (isMatched) cursor = "default";
    else if (isHovered && isDragging) { glow = "0 0 40px rgba(65, 105, 225, 0.4)"; scaleClass = "scale-105"; }

    const isDisabled = isMatched || isGameComplete || transitionPhase !== "idle";

    return (
      <div
        key={`item-${itemKey}`}
        ref={(el) => { itemRefs.current[itemKey] = el; }}
        className={`relative flex items-center justify-center transition-all duration-200 ${scaleClass}`}
        style={{ width: "100%", height: "100%", minHeight: "105px", cursor: isDisabled ? "default" : cursor, opacity: isMatched ? 0.85 : 1, padding: "5px" }}
      >
        <div className="absolute rounded-2xl border-4 transition-all duration-200" style={{
          width: "clamp(80px, 18vh, 145px)", height: "clamp(80px, 18vh, 145px)",
          backgroundColor: ROYAL_BLUE, borderColor: "white",
          boxShadow: `0 4px 0 0 oklch(0.4 0.18 260 / 0.9), 0 8px 16px -4px rgba(0,0,0,0.1)`,
        }} />
        <div className="relative z-1 flex items-center justify-center pointer-events-none" style={{ width: "100px", height: "100px", flexShrink: 0 }}>
          <img
            src={itemData.svgUrl}
            alt={itemData.itemName}
            className="w-full h-full object-contain select-none"
            style={{ filter: glow !== "none" ? `drop-shadow(${glow})` : "none", transition: "filter 0.2s ease", maxWidth: "100%", maxHeight: "100%" }}
            draggable={false}
          />
        </div>
      </div>
    );
  };

  // ─── RENDER LINES ───────────────────────────────────────────
  const renderLines = () => {
    const allLines: React.ReactElement[] = [];
    const isEraserMode = tool === "clear";
    const lineColor = isEraserMode ? ERASER_RED : ROYAL_BLUE;
    const lineShadow = isEraserMode
      ? "0 0 16px rgba(239, 68, 68, 0.5), 0 0 32px rgba(239, 68, 68, 0.25)"
      : "0 0 16px rgba(65, 105, 225, 0.5), 0 0 32px rgba(65, 105, 225, 0.25)";
    const dotShadow = isEraserMode ? "0 0 20px rgba(239, 68, 68, 0.6)" : "0 0 20px rgba(65, 105, 225, 0.6)";

    matchedLines.forEach((line, index) => {
      const length = Math.hypot(line.endX - line.startX, line.endY - line.startY);
      const angle = Math.atan2(line.endY - line.startY, line.endX - line.startX);

      allLines.push(
        <div key={`matched-${index}`}>
          {isEraserMode && (
            <div
              onClick={(e) => { e.stopPropagation(); handleLineTap(line.letter); }}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleLineTap(line.letter); }}
              style={{
                position: "absolute", left: line.startX, top: line.startY,
                width: length, height: "44px",
                transformOrigin: "left center",
                transform: `rotate(${angle}rad) translateY(-19px)`,
                cursor: "crosshair", zIndex: 35, background: "transparent",
              }}
            />
          )}
          <div style={{
            position: "absolute", left: line.startX, top: line.startY,
            width: length, height: "6px",
            backgroundColor: lineColor, transformOrigin: "left center",
            transform: `rotate(${angle}rad)`, borderRadius: "3px",
            boxShadow: lineShadow, zIndex: 25, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: line.startX - 10, top: line.startY - 10,
            width: "20px", height: "20px", borderRadius: "50%",
            backgroundColor: lineColor, boxShadow: dotShadow, zIndex: 25, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: line.endX - 10, top: line.endY - 10,
            width: "20px", height: "20px", borderRadius: "50%",
            backgroundColor: lineColor, boxShadow: dotShadow, zIndex: 25, pointerEvents: "none",
          }} />
        </div>,
      );
    });

    if (isDragging && dragStart && dragEnd && dragLetter) {
      const start = getLetterCenter(dragLetter);
      if (start) {
        const end = dragEnd;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        allLines.push(
          <div key="drag-line">
            <div style={{
              position: "absolute", left: start.x, top: start.y, width: length, height: "6px",
              backgroundColor: ROYAL_BLUE, transformOrigin: "left center",
              transform: `rotate(${angle}rad)`, borderRadius: "3px",
              boxShadow: `0 0 16px rgba(65, 105, 225, 0.4), 0 0 32px rgba(65, 105, 225, 0.2)`,
              zIndex: 30, pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", left: start.x - 12, top: start.y - 12, width: "24px", height: "24px",
              borderRadius: "50%", backgroundColor: ROYAL_BLUE,
              boxShadow: `0 0 20px rgba(65, 105, 225, 0.5)`, zIndex: 30, pointerEvents: "none",
            }} />
            <div className="him-pulse" style={{
              position: "absolute", left: end.x - 12, top: end.y - 12, width: "24px", height: "24px",
              borderRadius: "50%", backgroundColor: ROYAL_BLUE,
              boxShadow: `0 0 20px rgba(65, 105, 225, 0.5)`, zIndex: 30, pointerEvents: "none",
            }} />
          </div>,
        );
      }
    }

    return allLines;
  };

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
        dir="rtl"
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex w-full max-w-4xl items-stretch gap-14 sm:gap-18 md:gap-22 lg:gap-26">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-5 w-full max-w-[200px]" style={{ minHeight: `${Math.max(105, totalPairs * 115)}px` }}>
              {pairs.map((pair) => renderLetter(pair))}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-5 w-full max-w-[200px]" style={{ minHeight: `${Math.max(105, totalPairs * 115)}px` }}>
              {itemList.map((itemData) => renderItem(itemData))}
            </div>
          </div>
        </div>

        {renderLines()}
      </div>
    </div>
  );
}

export default HuroofETahajjiItemMatchingBulkBase;