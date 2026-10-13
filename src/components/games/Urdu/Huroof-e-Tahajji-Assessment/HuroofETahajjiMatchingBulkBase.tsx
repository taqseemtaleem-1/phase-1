// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiMatchingBulkBase.tsx
// ✅ Urdu version of AlphabetMatchingBulkBase — EXACT match
// 💾 SUMMARY added — per-letter Correct/Wrong/Missed
// ✅ Undo / Redo / Eraser / Check tools — TOOLBAR ON LEFT
// 🔥 RTL visual layout: Right column = drag letters, LEFT column = drop targets
// 🔥 No same-row matching — right & left same position never have same letter
// 🔥 Letter numbering per lessonId: 1-8, 9-16, 17-24, 25-32, 33-40
// 🎵 INTRO AUDIO: plays once at game start

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";
const introAudio = "/assets/Urdu Assessment Assets/Huroof E Tahajji Matching Bulk/intro.wav";

// ══════════════════════════════════════════════════════════════
//  🔊 GLOBAL AUDIO REGISTRY
// ══════════════════════════════════════════════════════════════

const GLOBAL_AUDIO_REGISTRY = new Set<HTMLAudioElement>();

export function stopAllGameAudio() {
  GLOBAL_AUDIO_REGISTRY.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
  });
  GLOBAL_AUDIO_REGISTRY.clear();
}

if (typeof window !== 'undefined') {
  (window as any).stopAllGameAudio = stopAllGameAudio;
}

// ══════════════════════════════════════════════════════════════
//  🔤 URDU LETTER NAMES
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

interface MatchResult {
  capital: string;
  small: string;
  isCorrect: boolean;
}

function buildFullSummary(
  studentName: string,
  session1Letters: string[],
  session1Matches: MatchResult[],
  session2Letters: string[],
  session2Matches: MatchResult[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Matching lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (lettersList: string[], matches: MatchResult[]) => {
    for (const letter of lettersList) {
      const match = matches.find((m) => m.capital === letter);
      let status: string;
      if (!match) status = 'Missed';
      else if (match.isCorrect) status = 'Correct';
      else status = 'Wrong';
      lines.push(`Letter ${getLetterLabel(letter)} - ${status}`);
    }
  };

  buildLines(session1Letters, session1Matches);
  buildLines(session2Letters, session2Matches);

  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════
//  🎨 SUBJECT COLORS
// ══════════════════════════════════════════════════════════════
function getSubjectColor(subject: string = 'urdu') {
  const colors: Record<string, { cardBg: string; cardShadow: string; selectedColor: string }> = {
    urdu: { cardBg: '#CC6B2C', cardShadow: 'oklch(0.4 0.18 40 / 0.85)', selectedColor: '#b85e27' },
    english: { cardBg: '#4D82F6', cardShadow: 'oklch(0.35 0.18 260 / 0.85)', selectedColor: '#3a6fd4' },
    math: { cardBg: '#2E8B57', cardShadow: 'oklch(0.32 0.18 148 / 0.85)', selectedColor: '#267a4b' },
  };
  return colors[subject] || colors.urdu;
}

// ══════════════════════════════════════════════════════════════
//  🔤 FONT CSS
// ══════════════════════════════════════════════════════════════
const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

const GAME_CSS = `
  @keyframes amb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes amb-pulse {
    0% { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(1.4); opacity: 0.3; }
  }
  @keyframes amb-pop-smooth {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.12); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes amb-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes amb-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes amb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes amb-tool-pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
  @keyframes amb-line-appear {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }

  .amb-pop-in { animation: amb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .amb-pulse { animation: amb-pulse 0.6s ease-in-out infinite alternate; }
  .amb-pop-smooth { animation: amb-pop-smooth 0.6s cubic-bezier(.34,1.4,.64,1) both; }
  .amb-fade-out { animation: amb-fade-out 0.5s ease-in both; }
  .amb-fade-in { animation: amb-fade-in 0.5s ease-out both; }
  .amb-tool-pop { animation: amb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .amb-tool-pulse-red { animation: amb-tool-pulse-red 1.4s ease-out infinite; }
  .amb-line-appear { animation: amb-line-appear 0.25s ease-out both; }
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

type Session = 1 | 2;
type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';

interface LetterPair {
  capital: string;
  small: string;
}

interface DrawnLine {
  id: string;
  capital: string;
  small: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isCorrect: boolean;
}

type Point = { x: number; y: number };
type Tool = 'draw' | 'remove';

// ══════════════════════════════════════════════════════════════
//  🔢 URDU LETTER NUMBERING (1-40)
// ══════════════════════════════════════════════════════════════

const URDU_LETTERS_BY_NUMBER: Record<number, string> = {
  1: "ا",  2: "آ",  3: "ب",  4: "پ",
  5: "ت",  6: "ٹ",  7: "ث",  8: "ج",
  9: "چ",  10: "ح", 11: "خ", 12: "د",
  13: "ڈ", 14: "ذ", 15: "ر", 16: "ڑ",
  17: "ز", 18: "ژ", 19: "س", 20: "ش",
  21: "ص", 22: "ض", 23: "ط", 24: "ظ",
  25: "ع", 26: "غ", 27: "ف", 28: "ق",
  29: "ک", 30: "گ", 31: "ل", 32: "م",
  33: "ن", 34: "ں", 35: "و", 36: "ہ",
  37: "ھ", 38: "ء", 39: "ی", 40: "ے",
};

const LESSON_LETTERS_MAP: Record<number, { session1: number[]; session2: number[] }> = {
  1: { session1: [1, 2, 3, 4],     session2: [5, 6, 7, 8] },
  2: { session1: [9, 10, 11, 12],  session2: [13, 14, 15, 16] },
  3: { session1: [17, 18, 19, 20], session2: [21, 22, 23, 24] },
  4: { session1: [25, 26, 27, 28], session2: [29, 30, 31, 32] },
  5: { session1: [33, 34, 35, 36], session2: [37, 38, 39, 40] },
};

// ══════════════════════════════════════════════════════════════
//  🔥 SHUFFLE: no same-row matching
// ══════════════════════════════════════════════════════════════

function shuffleAvoidSameRow(letters: string[]): string[] {
  const n = letters.length;
  if (n <= 1) return [...letters];
  const correctOrder = [...letters];

  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let sameRow = false;
    for (let i = 0; i < n; i++) {
      if (shuffled[i] === correctOrder[i]) { sameRow = true; break; }
    }
    if (!sameRow) return shuffled;
  }
  return [...correctOrder.slice(1), correctOrder[0]];
}

// ══════════════════════════════════════════════════════════════
//  📊 STATS + EVENTS
// ══════════════════════════════════════════════════════════════

interface LineEvent {
  seq: number;
  type: 'draw' | 'remove' | 'undo' | 'redo';
  capital?: string;
  small?: string;
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
    totalDraws: 0, correctDraws: 0, wrongDraws: 0,
    undoCount: 0, redoCount: 0, eraserActivations: 0,
    linesRemoved: 0, finalLines: 0, finalCorrect: 0, finalWrong: 0,
    timeSec: 0, events: [],
  };
}

// ══════════════════════════════════════════════════════════════
//  🎛️ TOOLBAR
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
  onClick, disabled, active, danger, ariaLabel, children,
}: ToolButtonProps) {
  const base = 'amb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95';
  let style = 'border-white/60 bg-white text-slate-600 shadow';
  if (disabled) style = 'border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed';
  else if (danger) style = 'border-white bg-red-500 text-white shadow-lg hover:bg-red-600';
  else if (active) style = 'border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600';
  else style = 'border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110';

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={ariaLabel}
      className={`${base} ${style} ${danger && !disabled ? 'amb-tool-pulse-red' : ''}`}>
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
  isTransitioning: boolean;
}

const Toolbar = React.memo(function Toolbar({
  onUndo, onRedo, onToggleRemove, onCheck,
  canUndo, canRedo, tool, hasLines, canCheck, isTransitioning,
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
        <div className="h-px w-10 bg-white/40 rounded-full" />
        <ToolButton
          onClick={onToggleRemove}
          active={tool === 'remove'}
          danger={tool === 'remove'}
          disabled={!hasLines || isTransitioning}
          ariaLabel={tool === 'remove' ? 'Cancel remove mode' : 'Remove a line'}
        >
          <Eraser className="h-5 w-5" strokeWidth={2.5} />
        </ToolButton>
        <div className="h-px w-10 bg-white/40 rounded-full" />
        <ToolButton onClick={onCheck} active={canCheck} disabled={!canCheck || isTransitioning} ariaLabel="Check">
          <Check className="h-5 w-5" strokeWidth={3} />
        </ToolButton>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function HuroofETahajjiMatchingBulkBase({
  letters, subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);

  const lessonConfig = LESSON_LETTERS_MAP[lessonId] || LESSON_LETTERS_MAP[1];

  const SESSION_1_LETTERS = useMemo(
    () => lessonConfig.session1.map(n => URDU_LETTERS_BY_NUMBER[n]),
    [lessonConfig]
  );
  const SESSION_2_LETTERS = useMemo(
    () => lessonConfig.session2.map(n => URDU_LETTERS_BY_NUMBER[n]),
    [lessonConfig]
  );

  const [session, setSession] = useState<Session>(1);
  const [pairs, setPairs] = useState<LetterPair[]>([]);
  const [smallLetters, setSmallLetters] = useState<string[]>([]);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');

  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [undoStack, setUndoStack] = useState<DrawnLine[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawnLine[][]>([]);
  const [tool, setTool] = useState<Tool>('draw');

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [dragCapital, setDragCapital] = useState<string | null>(null);
  const [hoveredSmall, setHoveredSmall] = useState<string | null>(null);

  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const capitalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const smallRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session1StatsRef = useRef<SessionStats>(emptyStats());
  const session2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());

  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const activeStatsRef = session === 1 ? session1StatsRef : session2StatsRef;
  const eventSeqRef = useRef<number>(1);

  const usedCapitals = useMemo(() => new Set(lines.map(l => l.capital)), [lines]);
  const usedSmalls = useMemo(() => new Set(lines.map(l => l.small)), [lines]);

  const session1FinalLinesRef = useRef<Array<{ capital: string; small: string; isCorrect: boolean }>>([]);
  const session2FinalLinesRef = useRef<Array<{ capital: string; small: string; isCorrect: boolean }>>([]);

  const getSessionLetters = useCallback((sessionNum: Session): string[] => {
    return sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
  }, [SESSION_1_LETTERS, SESSION_2_LETTERS]);

  const initializeGame = useCallback((sessionNum: Session) => {
    const sessionLetters = getSessionLetters(sessionNum);
    const newPairs: LetterPair[] = sessionLetters.map(letter => ({ capital: letter, small: letter }));
    const shuffledOrder = shuffleAvoidSameRow(sessionLetters);

    setPairs(newPairs);
    setSmallLetters(shuffledOrder);
    setLines([]);
    setUndoStack([]);
    setRedoStack([]);
    setTool('draw');
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragCapital(null);
    setHoveredSmall(null);
    setTransitionPhase('idle');

    eventSeqRef.current = 1;
    if (sessionNum === 1) session1StatsRef.current = emptyStats();
    else session2StatsRef.current = emptyStats();
    sessionStartTimeRef.current = Date.now();
  }, [getSessionLetters]);

  // ══════════════════════════════════════════════════════════════
  //  🎵 AUDIO
  // ══════════════════════════════════════════════════════════════

  const stopAllAudio = useCallback(() => {
    const audio = introAudioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onerror = null;
      } catch {}
      GLOBAL_AUDIO_REGISTRY.delete(audio);
      introAudioRef.current = null;
    }
    stopAllGameAudio();
    setIsIntroPlaying(false);
  }, []);

  const playIntroAudio = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      stopAllAudio();
      try {
        const audio = new Audio(introAudio);
        introAudioRef.current = audio;
        GLOBAL_AUDIO_REGISTRY.add(audio);
        setIsIntroPlaying(true);

        const done = () => {
          GLOBAL_AUDIO_REGISTRY.delete(audio);
          setIsIntroPlaying(false);
          introAudioRef.current = null;
          resolve();
        };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      } catch {
        setIsIntroPlaying(false);
        resolve();
      }
    });
  }, [stopAllAudio]);

  // ══════════════════════════════════════════════════════════════
  //  🛡️ GLOBAL AUDIO STOP LISTENERS
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleStop = () => stopAllAudio();
    const handleVisibilityChange = () => { if (document.hidden) stopAllAudio(); };

    window.addEventListener('beforeunload', handleStop);
    window.addEventListener('pagehide', handleStop);
    window.addEventListener('popstate', handleStop);
    window.addEventListener('blur', handleStop);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleStop);
      window.removeEventListener('pagehide', handleStop);
      window.removeEventListener('popstate', handleStop);
      window.removeEventListener('blur', handleStop);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopAllAudio]);

  useEffect(() => {
    isMountedRef.current = true;
    initializeGame(1);
    playIntroAudio();

    return () => {
      isMountedRef.current = false;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      stopAllAudio();
      if (!progressSavedRef.current) savePartialProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeNavigate = useCallback((opts: Parameters<typeof navigate>[0]) => {
    stopAllAudio();
    navigate(opts);
  }, [navigate, stopAllAudio]);

  // ══════════════════════════════════════════════════════════════
  //  🎯 POSITION HELPERS
  // ══════════════════════════════════════════════════════════════

  const getCapitalCenter = useCallback((capital: string): Point | null => {
    const board = boardRef.current;
    const el = capitalRefs.current[capital];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }, []);

  const getSmallCenter = useCallback((small: string): Point | null => {
    const board = boardRef.current;
    const el = smallRefs.current[small];
    if (!board || !el) return null;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  }, []);

  const pushUndo = useCallback((currentLines: DrawnLine[]) => {
    setUndoStack(prev => [...prev, currentLines]);
    setRedoStack([]);
  }, []);

  const logEvent = useCallback((event: Omit<LineEvent, 'seq' | 'atMs'>) => {
    const stats = activeStatsRef.current;
    const evt: LineEvent = { ...event, seq: eventSeqRef.current++, atMs: Date.now() - sessionStartTimeRef.current };
    stats.events.push(evt);
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  🖱️ POINTER HANDLERS
  // ══════════════════════════════════════════════════════════════

  const handleCapitalPointerDown = useCallback((e: React.PointerEvent, capital: string) => {
    if (transitionPhase !== 'idle') return;
    if (isIntroPlaying) return;
    if (tool !== 'draw') return;
    if (usedCapitals.has(capital)) return;

    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const point = { x: e.clientX - b.left, y: e.clientY - b.top };

    setIsDragging(true);
    setDragCapital(capital);
    setDragStart(point);
    setDragEnd(point);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [transitionPhase, isIntroPlaying, tool, usedCapitals]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragCapital) return;
    if (transitionPhase !== 'idle') return;
    if (isIntroPlaying) return;

    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const point = { x: e.clientX - b.left, y: e.clientY - b.top };
    setDragEnd(point);

    let hit: string | null = null;
    for (const [small, el] of Object.entries(smallRefs.current)) {
      if (!el) continue;
      if (usedSmalls.has(small)) continue;
      const r = el.getBoundingClientRect();
      const padding = 20;
      if (e.clientX >= r.left - padding && e.clientX <= r.right + padding && e.clientY >= r.top - padding && e.clientY <= r.bottom + padding) {
        hit = small; break;
      }
    }
    setHoveredSmall(hit);
  }, [isDragging, dragCapital, transitionPhase, isIntroPlaying, usedSmalls]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || !dragCapital) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragCapital(null);
      setHoveredSmall(null);
      return;
    }

    const targetSmall = hoveredSmall;
    const capital = dragCapital;

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragCapital(null);
    setHoveredSmall(null);

    if (isIntroPlaying) return;
    if (!targetSmall) return;
    if (usedCapitals.has(capital)) return;
    if (usedSmalls.has(targetSmall)) return;

    const start = getCapitalCenter(capital);
    const end = getSmallCenter(targetSmall);
    if (!start || !end) return;

    const isCorrect = capital === targetSmall;

    const newLine: DrawnLine = {
      id: `${capital}-${targetSmall}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      capital, small: targetSmall,
      startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      isCorrect,
    };

    const stats = activeStatsRef.current;
    stats.totalDraws += 1;
    if (isCorrect) stats.correctDraws += 1;
    else stats.wrongDraws += 1;

    logEvent({ type: 'draw', capital, small: targetSmall, isCorrect });
    pushUndo(lines);
    setLines(prev => [...prev, newLine]);
  }, [
    isDragging, dragCapital, hoveredSmall, lines,
    getCapitalCenter, getSmallCenter, pushUndo,
    usedCapitals, usedSmalls, logEvent, isIntroPlaying,
  ]);

  const findLineAtPoint = useCallback((px: number, py: number): string | null => {
    const TAP_TOLERANCE = 24;
    for (const line of lines) {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((px - line.startX) * dx + (py - line.startY) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = line.startX + t * dx;
      const projY = line.startY + t * dy;
      const dist = Math.hypot(px - projX, py - projY);
      if (dist <= TAP_TOLERANCE) return line.id;
    }
    return null;
  }, [lines]);

  const handleBoardPointerDown = useCallback((e: React.PointerEvent) => {
    if (transitionPhase !== 'idle') return;
    if (isIntroPlaying) return;
    if (tool !== 'remove') return;

    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const px = e.clientX - b.left;
    const py = e.clientY - b.top;

    const lineId = findLineAtPoint(px, py);
    if (lineId) {
      const removed = lines.find(l => l.id === lineId);
      const stats = activeStatsRef.current;
      stats.linesRemoved += 1;
      logEvent({ type: 'remove', capital: removed?.capital, small: removed?.small, isCorrect: removed?.isCorrect });
      pushUndo(lines);
      setLines(prev => prev.filter(l => l.id !== lineId));
      setTool('draw');
    }
  }, [transitionPhase, isIntroPlaying, tool, findLineAtPoint, lines, pushUndo, logEvent]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;
    logEvent({ type: 'undo' });
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [...stack, lines]);
    setLines(prev);
  }, [undoStack, lines, logEvent]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;
    logEvent({ type: 'redo' });
    setRedoStack(stack => stack.slice(0, -1));
    setUndoStack(stack => [...stack, lines]);
    setLines(next);
  }, [redoStack, lines, logEvent]);

  const handleToolToggle = useCallback(() => {
    setTool(prev => {
      const next = prev === 'draw' ? 'remove' : 'draw';
      if (next === 'remove') activeStatsRef.current.eraserActivations += 1;
      return next;
    });
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragCapital(null);
    setHoveredSmall(null);
  }, []);

  const canCheck = useMemo(() => {
    if (pairs.length === 0) return false;
    return lines.length === pairs.length;
  }, [lines.length, pairs.length]);

  const finalizeCurrentSession = useCallback(() => {
    const stats = activeStatsRef.current;
    stats.finalLines = lines.length;
    stats.finalCorrect = lines.filter(l => l.isCorrect).length;
    stats.finalWrong = lines.filter(l => !l.isCorrect).length;
    stats.timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
  }, [lines]);

  const buildMatchList = useCallback((finalLines: DrawnLine[]): MatchResult[] => {
    return finalLines.map(l => ({ capital: l.capital, small: l.small, isCorrect: l.isCorrect }));
  }, []);

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== 'idle') return;
    if (isIntroPlaying) return;

    finalizeCurrentSession();

    if (session === 1) {
      session1FinalLinesRef.current = buildMatchList(lines);

      setTransitionPhase('fade-out');
      transitionTimerRef.current = setTimeout(() => {
        setSession(2);
        initializeGame(2);
        setTransitionPhase('fade-in');
        setTimeout(() => setTransitionPhase('idle'), 500);
      }, 500);
    } else {
      session2FinalLinesRef.current = buildMatchList(lines);
      saveFinalProgress();
      safeNavigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    }
  }, [
    canCheck, transitionPhase, isIntroPlaying, session, initializeGame, safeNavigate,
    subject, level, lessonId, finalizeCurrentSession, lines, buildMatchList,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  💾 SAVE — with summary
  // ══════════════════════════════════════════════════════════════

  const buildGameData = useCallback((completed: boolean) => {
    const s1Stats = session1StatsRef.current;
    const s2Stats = session2StatsRef.current;

    return {
      type: 'huroof-tahajji-matching-bulk',
      lessonType: 'matching',
      sessions: [
        {
          sessionNum: 1,
          letters: SESSION_1_LETTERS,
          finalMatches: session1FinalLinesRef.current.length > 0
            ? session1FinalLinesRef.current
            : buildMatchList(lines),
          stats: {
            totalDraws: s1Stats.totalDraws,
            correctDraws: s1Stats.correctDraws,
            wrongDraws: s1Stats.wrongDraws,
            undoCount: s1Stats.undoCount,
            redoCount: s1Stats.redoCount,
            eraserActivations: s1Stats.eraserActivations,
            linesRemoved: s1Stats.linesRemoved,
            finalLines: s1Stats.finalLines,
            finalCorrect: s1Stats.finalCorrect,
            finalWrong: s1Stats.finalWrong,
            timeSec: s1Stats.timeSec,
          },
          events: s1Stats.events,
        },
        {
          sessionNum: 2,
          letters: SESSION_2_LETTERS,
          finalMatches: session2FinalLinesRef.current,
          stats: {
            totalDraws: s2Stats.totalDraws,
            correctDraws: s2Stats.correctDraws,
            wrongDraws: s2Stats.wrongDraws,
            undoCount: s2Stats.undoCount,
            redoCount: s2Stats.redoCount,
            eraserActivations: s2Stats.eraserActivations,
            linesRemoved: s2Stats.linesRemoved,
            finalLines: s2Stats.finalLines,
            finalCorrect: s2Stats.finalCorrect,
            finalWrong: s2Stats.finalWrong,
            timeSec: s2Stats.timeSec,
          },
          events: s2Stats.events,
        },
      ],
      completed,
    };
  }, [SESSION_1_LETTERS, SESSION_2_LETTERS, lines, buildMatchList]);

  const saveFinalProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const s1Stats = session1StatsRef.current;
    const s2Stats = session2StatsRef.current;
    const totalTimeSec = s1Stats.timeSec + s2Stats.timeSec;
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const summary = buildFullSummary(
      studentName,
      SESSION_1_LETTERS,
      session1FinalLinesRef.current,
      SESSION_2_LETTERS,
      session2FinalLinesRef.current,
      true,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: 'completed',
      timeSpentSec: totalTimeSec,
      summary,
      gameData: buildGameData(true),
    }).catch((err) => console.error('[HuroofMatchingBulk] ❌ Save failed:', err));
  }, [SESSION_1_LETTERS, SESSION_2_LETTERS, subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const s1Stats = session1StatsRef.current;
    const s2Stats = session2StatsRef.current;
    const studentName = sessionData.student.studentName || "Student";

    const activeStats = activeStatsRef.current;
    if (activeStats.timeSec === 0) {
      activeStats.timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      activeStats.finalLines = lines.length;
      activeStats.finalCorrect = lines.filter(l => l.isCorrect).length;
      activeStats.finalWrong = lines.filter(l => !l.isCorrect).length;
    }

    // 🔥 NEW SUMMARY — partial
    const summary = buildFullSummary(
      studentName,
      SESSION_1_LETTERS,
      session1FinalLinesRef.current,
      SESSION_2_LETTERS,
      session2FinalLinesRef.current,
      false,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: 'uncompleted',
      timeSpentSec: s1Stats.timeSec + s2Stats.timeSec,
      summary,
      gameData: buildGameData(false),
    }).catch((err) => console.warn('[HuroofMatchingBulk] ⚠️ Partial save failed:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SESSION_1_LETTERS, SESSION_2_LETTERS, subject, level, lessonId, session, lines, buildGameData]);

  // ══════════════════════════════════════════════════════════════
  //  🎨 RENDER
  // ══════════════════════════════════════════════════════════════

  const renderCapital = (pair: LetterPair) => {
    const isDraggingThis = isDragging && dragCapital === pair.capital;
    const isUsed = usedCapitals.has(pair.capital);

    return (
      <div
        key={pair.capital}
        ref={(el) => { capitalRefs.current[pair.capital] = el; }}
        onPointerDown={(e) => handleCapitalPointerDown(e, pair.capital)}
        className={`relative flex items-center justify-center transition-all duration-200 ${tool === 'draw' && !isUsed ? 'cursor-grab' : 'cursor-default'} ${isDraggingThis ? 'amb-pop-smooth' : ''}`}
        style={{
          width: '100%', height: '100%', minHeight: '100px',
          padding: '8px 6px', touchAction: 'none',
          opacity: isUsed ? 0.55 : 1, overflow: 'visible',
        }}
      >
        <div className="absolute rounded-2xl border-4 transition-all duration-200" style={{
          width: 'clamp(80px, 18vh, 140px)', height: 'clamp(80px, 18vh, 140px)',
          backgroundColor: subjectColor.cardBg, borderColor: 'white',
          boxShadow: `0 4px 0 0 ${subjectColor.cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
        }} />
        <span style={{
          fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
          fontWeight: 400, fontSize: 'clamp(2.5rem, 8vh, 4rem)', color: '#FFFFFF',
          lineHeight: 1.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0.02em', userSelect: 'none',
          position: 'relative', zIndex: 1, overflow: 'visible',
        }}>
          {pair.capital}
        </span>
      </div>
    );
  };

  const renderSmall = (small: string) => {
    const isHovered = hoveredSmall === small && isDragging;
    const isUsed = usedSmalls.has(small);

    return (
      <div
        key={small}
        ref={(el) => { smallRefs.current[small] = el; }}
        className={`relative flex items-center justify-center transition-all duration-200 ${isHovered ? 'amb-pop-smooth scale-105' : ''}`}
        style={{
          width: '100%', height: '100%', minHeight: '100px',
          padding: '8px 6px', cursor: 'default',
          opacity: isUsed ? 0.55 : 1, overflow: 'visible',
        }}
      >
        <div className="absolute rounded-2xl border-4 transition-all duration-200" style={{
          width: 'clamp(80px, 18vh, 140px)', height: 'clamp(80px, 18vh, 140px)',
          backgroundColor: isHovered ? subjectColor.selectedColor : subjectColor.cardBg,
          borderColor: 'white',
          boxShadow: `0 4px 0 0 ${subjectColor.cardShadow}, 0 8px 16px -4px rgba(0,0,0,0.1)`,
        }} />
        <span style={{
          fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
          fontWeight: 400, fontSize: 'clamp(2.5rem, 8vh, 4rem)', color: '#FFFFFF',
          lineHeight: 1.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0.02em', userSelect: 'none',
          position: 'relative', zIndex: 1, overflow: 'visible',
        }}>
          {small}
        </span>
      </div>
    );
  };

  const renderLines = () => {
    const elements: React.ReactElement[] = [];

    lines.forEach((line) => {
      const length = Math.hypot(line.endX - line.startX, line.endY - line.startY);
      const angle = Math.atan2(line.endY - line.startY, line.endX - line.startX);
      const isRemoveMode = tool === 'remove';
      const lineColor = isRemoveMode ? '#EF4444' : '#000000';
      const glowColor = isRemoveMode ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0,0,0,0.2)';

      elements.push(
        <div key={line.id} className="amb-line-appear">
          <div style={{ position: 'absolute', left: line.startX, top: line.startY, width: length, height: '6px', backgroundColor: lineColor, transformOrigin: 'left center', transform: `rotate(${angle}rad)`, borderRadius: '3px', boxShadow: `0 0 16px ${glowColor}, 0 0 32px ${glowColor}`, zIndex: 25 }} />
          <div style={{ position: 'absolute', left: line.startX - 10, top: line.startY - 10, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: lineColor, boxShadow: `0 0 20px ${glowColor}`, zIndex: 25 }} />
          <div style={{ position: 'absolute', left: line.endX - 10, top: line.endY - 10, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: lineColor, boxShadow: `0 0 20px ${glowColor}`, zIndex: 25 }} />
        </div>
      );
    });

    if (isDragging && dragStart && dragEnd && dragCapital && tool === 'draw' && !isIntroPlaying) {
      const start = getCapitalCenter(dragCapital);
      if (start) {
        const end = dragEnd;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        elements.push(
          <div key="drag-line">
            <div style={{ position: 'absolute', left: start.x, top: start.y, width: length, height: '6px', backgroundColor: '#000000', transformOrigin: 'left center', transform: `rotate(${angle}rad)`, borderRadius: '3px', boxShadow: '0 0 16px rgba(0,0,0,0.2)', zIndex: 30 }} />
            <div style={{ position: 'absolute', left: start.x - 12, top: start.y - 12, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#000000', boxShadow: '0 0 20px rgba(0,0,0,0.3)', zIndex: 30 }} />
            <div className="amb-pulse" style={{ position: 'absolute', left: end.x - 12, top: end.y - 12, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#000000', boxShadow: '0 0 20px rgba(0,0,0,0.3)', zIndex: 30 }} />
          </div>
        );
      }
    }

    return elements;
  };

  const getContainerClass = () => {
    if (transitionPhase === 'fade-out') return 'amb-fade-out';
    if (transitionPhase === 'fade-in') return 'amb-fade-in';
    return '';
  };

  const totalPairs = pairs.length;
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasLines = lines.length > 0;
  const isTransitioning = transitionPhase !== 'idle' || isIntroPlaying;

  return (
    <div className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}>
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
        isTransitioning={isTransitioning}
      />

      <div
        ref={boardRef}
        dir="rtl"
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud"
        style={{
          touchAction: 'none',
          pointerEvents: isIntroPlaying ? 'none' : 'auto',
        }}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex w-full max-w-5xl items-stretch gap-8 px-6 sm:gap-12 md:gap-16">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[260px]" style={{ minHeight: `${Math.max(100, totalPairs * 105)}px` }}>
              {pairs.map((pair) => renderCapital(pair))}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[260px]" style={{ minHeight: `${Math.max(100, totalPairs * 105)}px` }}>
              {smallLetters.map((small) => renderSmall(small))}
            </div>
          </div>
        </div>

        {renderLines()}
      </div>
    </div>
  );
}

export default HuroofETahajjiMatchingBulkBase;