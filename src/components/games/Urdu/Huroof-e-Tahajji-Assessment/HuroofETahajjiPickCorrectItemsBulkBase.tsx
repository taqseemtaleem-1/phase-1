// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiPickCorrectItemsBulkBase.tsx
// ✅ Urdu version of PickCorrectItems — Bulk Assessment
// ✅ SILENT bulk-style gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check — on LEFT side
// 🔥 8 letters per bulk level — 2 sessions (4 + 4)
// 🔥 Har session mein 4 rounds — har round ek letter
// 🔥 Max selection = correct items count for that letter (dynamic)
// 🔥 Royal Blue theme throughout
// 💾 SUMMARY added — per-letter Correct/Wrong/Missed with names
// 🔥 INTRO AUDIO — intro.wav plays ONCE at game start

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Undo2, Redo2, Eraser, Check } from 'lucide-react';

import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

import { getItemSvgUrl, getItemsForLetter } from '@/components/games/Urdu/Huroof-e-Tahajji-Items Pick/svgMap';

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 INTRO AUDIO
// ═══════════════════════════════════════════════════════════════

const INTRO_AUDIO_MODULES = import.meta.glob<string>(
  "/src/assets/Urdu Assessment Assets/Huroof E Tahajji Pick Correct Items Bulk/intro.wav",
  { eager: true, query: "?url", import: "default" },
);

const INTRO_AUDIO_URL: string | null =
  Object.values(INTRO_AUDIO_MODULES)[0] ?? null;

// ═══════════════════════════════════════════════════════════════
//  🔢 URDU LETTER → NUMBER MAP
// ═══════════════════════════════════════════════════════════════

const LETTER_TO_NUMBER: Record<string, number> = {
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

interface CardResult {
  id: string;
  name: string;
  isCorrect: boolean;
  wasSelected: boolean;
  result: 'correct' | 'wrong' | 'missed' | 'ignored';
}

interface RoundSnapshot {
  roundNum: number;
  letter: string;
  totalCards: number;
  totalCorrect: number;
  selectedCount: number;
  correctSelections: number;
  allItems: Array<{ id: string; name: string; isCorrect: boolean }>;
  cardResults: CardResult[];
  timeSec: number;
}

interface SessionSnapshot {
  sessionNum: 1 | 2;
  letters: string[];
  rounds: RoundSnapshot[];
}

function buildFullSummary(
  studentName: string,
  snapshots: SessionSnapshot[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Pick Correct Items lesson.`;
  }

  const lines: string[] = [];

  for (const session of snapshots) {
    for (const round of session.rounds) {
      // Skip empty/placeholder rounds
      if (!round.letter || round.totalCards === 0) continue;

      const correctSelected = round.cardResults.filter(r => r.result === 'correct').length;
      const wrongSelected = round.cardResults.filter(r => r.result === 'wrong').length;
      const totalCorrect = round.totalCorrect;

      let status: string;
      if (round.selectedCount === 0) {
        status = `Missed (0/${totalCorrect} selected)`;
      } else if (correctSelected === totalCorrect && wrongSelected === 0) {
        status = `Correct (${correctSelected}/${totalCorrect} selected)`;
      } else if (wrongSelected > 0) {
        status = `Wrong (${correctSelected}/${totalCorrect} correct, ${wrongSelected} wrong selected)`;
      } else {
        status = `Wrong (${correctSelected}/${totalCorrect} selected)`;
      }

      lines.push(`Letter ${getLetterLabel(round.letter)} - ${status}`);
    }
  }

  return lines.join('\n');
}

// ─── 🔥 LETTERS WITHOUT ITEMS ────────────────────────────────
const NO_ITEMS_LETTERS = new Set<number>([16, 18, 34, 37, 38, 40]);

// ─── 🔥 ROYAL BLUE ────────────────────────────────────────────
const ROYAL_BLUE = '#4169E1';
const ROYAL_BLUE_SHADOW = 'oklch(0.4 0.18 260 / 0.9)';

// ═══════════════════════════════════════════════════════════════
//  🎛️  URDU LETTER POSITIONING
// ═══════════════════════════════════════════════════════════════

const LETTER_Y_OFFSETS: Record<number, string> = {
  1: "0%",    2: "0%",
  3: "-22%",  4: "-22%",  5: "-15%",  6: "-15%",
  7: "-15%",  8: "-22%",  9: "-22%",  10: "-22%",
  11: "-15%",
  12: "-6%",  13: "-6%",  14: "-6%",  15: "-6%",
  16: "-6%",  17: "-6%",  18: "-6%",
  19: "-13%", 20: "-13%", 21: "-13%", 22: "-13%",
  23: "-10%", 24: "-10%", 25: "-10%", 26: "-10%",
  27: "0%",   28: "-10%", 29: "0%",   30: "0%",
  31: "0%",   32: "-27%",
  33: "-15%", 34: "-15%", 35: "-15%",
  36: "-15%", 37: "-15%", 38: "-15%",
  39: "-22%", 40: "-6%",
};

function getLetterYOffset(letterNum: number): string {
  return LETTER_Y_OFFSETS[letterNum] ?? "0%";
}

const LETTER_SIZE_SCALE: Record<number, number> = {
  1: 1.0,    2: 1.0,
  3: 1.0,    4: 1.0,    5: 1.0,    6: 1.0,
  7: 1.0,    8: 1.0,    9: 1.0,    10: 1.0,
  11: 0.7,
  12: 1.7,   13: 1.0,   14: 1.0,   15: 1.7,
  16: 2.0,   17: 1.0,   18: 1.0,
  19: 1.0,   20: 0.8,   21: 1.0,   22: 1.0,
  23: 1.3,   24: 1.3,   25: 1.0,   26: 0.8,
  27: 1.0,   28: 1.0,
  29: 0.8,   30: 0.8,   31: 0.7,   32: 0.9,
  33: 1.0,   34: 1.0,
  35: 1.7,
  36: 1.8,   37: 1.0,   38: 1.0,
  39: 1.0,   40: 1.0,
};

function getLetterSizeScale(letterNum: number): number {
  return LETTER_SIZE_SCALE[letterNum] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════
//  🎨 FONT CSS
// ═══════════════════════════════════════════════════════════════

const FONT_CSS = `
  @font-face {
    font-family: 'Noto Nastaliq Urdu';
    src: url('${notoFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  🎬 ANIMATION CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes hpi-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hpi-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes hpi-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hpi-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes hpi-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }
  @keyframes hpi-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes hpi-letter-pop {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .hpi-pop-in { animation: hpi-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .hpi-fade-out { animation: hpi-fade-out 0.5s ease-in both; }
  .hpi-fade-in { animation: hpi-fade-in 0.5s ease-out both; }
  .hpi-tool-pop { animation: hpi-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .hpi-check-pulse { animation: hpi-tool-pulse-green 1.4s ease-out infinite; }
  .hpi-card-select { animation: hpi-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .hpi-letter-pop { animation: hpi-letter-pop 0.5s cubic-bezier(.34,1.4,.64,1) both; }
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
  name: string;
  svgUrl: string;
  isCorrect: boolean;
  sourceLetterNumber: number;
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
  return { totalSelections: 0, selectionsRemoved: 0, undoCount: 0, redoCount: 0, finalSelected: 0, timeSec: 0 };
}

type Tool = 'select' | 'clear';
type TransitionPhase = 'idle' | 'fade-out' | 'fade-in';
type Session = 1 | 2;

// ═══════════════════════════════════════════════════════════════
//  🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function prettyNameFromId(id: string): string {
  return id.replace(/[-_]/g, ' ').split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function pickRandomDistractors(
  count: number,
  currentLetterNum: number,
  otherLetterNum: number,
  alreadyUsedIds: Set<string>,
): Array<{ id: string; letterNum: number }> {
  if (count <= 0) return [];
  const usedIds = new Set(alreadyUsedIds);
  const result: Array<{ id: string; letterNum: number }> = [];

  const eligibleLetters: number[] = [];
  for (let num = 1; num <= 40; num++) {
    if (num === currentLetterNum) continue;
    if (num === otherLetterNum) continue;
    if (NO_ITEMS_LETTERS.has(num)) continue;
    const items = getItemsForLetter(num);
    if (items.length === 0) continue;
    eligibleLetters.push(num);
  }

  const shuffledLetters = [...eligibleLetters];
  for (let i = shuffledLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledLetters[i], shuffledLetters[j]] = [shuffledLetters[j], shuffledLetters[i]];
  }

  for (const letterNum of shuffledLetters) {
    if (result.length >= count) break;
    const items = getItemsForLetter(letterNum);
    const available = items.filter((id) => !usedIds.has(id));
    if (available.length === 0) continue;
    const randomIdx = Math.floor(Math.random() * available.length);
    const chosenId = available[randomIdx];
    result.push({ id: chosenId, letterNum });
    usedIds.add(chosenId);
  }

  if (result.length < count) {
    for (const letterNum of shuffledLetters) {
      if (result.length >= count) break;
      const items = getItemsForLetter(letterNum);
      for (const id of items) {
        if (result.length >= count) break;
        if (usedIds.has(id)) continue;
        result.push({ id, letterNum });
        usedIds.add(id);
      }
    }
  }

  return result;
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
  onClick, disabled, active, danger, pulse, ariaLabel, children,
}: ToolButtonProps) {
  const base = 'hpi-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95';
  let style = 'border-white/60 bg-white text-slate-600 shadow';
  if (disabled) style = 'border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed';
  else if (danger) style = 'border-white bg-red-500 text-white shadow-lg hover:bg-red-600';
  else if (active) style = 'border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600';
  else style = 'border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110';

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={ariaLabel}
      className={`${base} ${style} ${pulse ? 'hpi-check-pulse' : ''}`}>
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
  onUndo, onRedo, onToggleClear, onCheck,
  canUndo, canRedo, tool, hasSelections, canCheck, isTransitioning,
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

export function HuroofETahajjiPickCorrectItemsBulkBase({
  letters, subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();

  const SESSION_1_LETTERS = useMemo(() => letters.slice(0, 4), [letters]);
  const SESSION_2_LETTERS = useMemo(() => letters.slice(4, 8), [letters]);

  const [session, setSession] = useState<Session>(1);
  const [roundIdx, setRoundIdx] = useState(0);

  const [gameItems, setGameItems] = useState<Item[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const [tool, setTool] = useState<Tool>('select');
  const [undoStack, setUndoStack] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);

  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [isGameComplete, setIsGameComplete] = useState(false);

  const currentSessionLetters = session === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
  const currentLetter = currentSessionLetters[roundIdx] || 'ا';
  const currentLetterNumber = LETTER_TO_NUMBER[currentLetter] || 1;

  const totalCorrect = useMemo(() => gameItems.filter((i) => i.isCorrect).length, [gameItems]);
  const maxSelection = totalCorrect;

  const sessionStatsRef = useRef<Record<string, SessionStats>>({});
  const roundSnapshotsRef = useRef<Record<string, RoundSnapshot>>({});
  const roundStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const savePartialProgressRef = useRef<() => void>(() => {});

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const isMountedRef = useRef(true);
  const audioUnlockedRef = useRef<boolean>(false);
  const preloadedIntroRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const roundKey = `s${session}-r${roundIdx}`;
  const sessionStatsKey = `s${session}`;

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

  // ─── BUILD ITEMS FOR A LETTER ───────────────────────────────
  const buildItemsForLetter = useCallback(
    (letter: string, otherLetter: string): Item[] => {
      const letterNum = LETTER_TO_NUMBER[letter] || 0;
      const otherLetterNum = LETTER_TO_NUMBER[otherLetter] || 0;

      const correctIds = getItemsForLetter(letterNum);
      const correctItems: Item[] = correctIds.map((id) => ({
        id, name: prettyNameFromId(id),
        svgUrl: getItemSvgUrl(letterNum, id),
        isCorrect: true, sourceLetterNumber: letterNum,
      }));

      const TARGET_TOTAL = 10;
      const distractorsNeeded = Math.max(0, TARGET_TOTAL - correctItems.length);
      const usedIds = new Set(correctItems.map((it) => it.id));

      const distractorPicked = pickRandomDistractors(
        distractorsNeeded, letterNum, otherLetterNum, usedIds,
      );

      const distractorItems: Item[] = distractorPicked.map((d) => ({
        id: d.id, name: prettyNameFromId(d.id),
        svgUrl: getItemSvgUrl(d.letterNum, d.id),
        isCorrect: false, sourceLetterNumber: d.letterNum,
      }));

      const all = [...correctItems, ...distractorItems];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }

      return all;
    },
    [],
  );

  // ─── INITIALIZE ROUND ───────────────────────────────────────
  const initializeRound = useCallback(
    (sessionNum: Session, roundIndex: number) => {
      const sessionLetters = sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
      const letter = sessionLetters[roundIndex] || 'ا';
      const otherLetter = sessionLetters[(roundIndex + 1) % sessionLetters.length] || letter;

      const items = buildItemsForLetter(letter, otherLetter);

      setGameItems(items);
      setSelectedIndices(new Set());
      setUndoStack([]);
      setRedoStack([]);
      setTool('select');
      setTransitionPhase('idle');

      const key = `s${sessionNum}`;
      if (!sessionStatsRef.current[key]) {
        sessionStatsRef.current[key] = emptyStats();
      }

      roundStartTimeRef.current = Date.now();
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS, buildItemsForLetter],
  );

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    initializeRound(1, 0);
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

  // ─── CARD SELECTION ─────────────────────────────────────────
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

      const stats = sessionStatsRef.current[sessionStatsKey];
      if (stats) stats.totalSelections += 1;
    },
    [isGameComplete, transitionPhase, tool, selectedIndices, maxSelection, pushUndo, sessionStatsKey],
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

      const stats = sessionStatsRef.current[sessionStatsKey];
      if (stats) stats.selectionsRemoved += 1;
      setTool('select');
    },
    [tool, isGameComplete, transitionPhase, selectedIndices, pushUndo, sessionStatsKey],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const stats = sessionStatsRef.current[sessionStatsKey];
    if (stats) stats.undoCount += 1;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(prev));
  }, [undoStack, selectedIndices, sessionStatsKey]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const stats = sessionStatsRef.current[sessionStatsKey];
    if (stats) stats.redoCount += 1;
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [...u, Array.from(selectedIndices)]);
    setSelectedIndices(new Set(next));
  }, [redoStack, selectedIndices, sessionStatsKey]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === 'clear' ? 'select' : 'clear'));
  }, []);

  const canCheck = useMemo(() => {
    if (maxSelection === 0) return false;
    if (gameItems.length === 0) return false;
    return selectedIndices.size >= maxSelection;
  }, [maxSelection, selectedIndices.size, gameItems.length]);

  const buildCardResults = useCallback(
    (items: Item[], selectedSet: Set<number>): CardResult[] => {
      return items.map((item, idx) => {
        const wasSelected = selectedSet.has(idx);
        let result: CardResult['result'];
        if (item.isCorrect && wasSelected) result = 'correct';
        else if (!item.isCorrect && wasSelected) result = 'wrong';
        else if (item.isCorrect && !wasSelected) result = 'missed';
        else result = 'ignored';

        return { id: item.id, name: item.name, isCorrect: item.isCorrect, wasSelected, result };
      });
    },
    [],
  );

  // ─── BUILD GAME DATA (with snapshots) ───────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const sessions: SessionSnapshot[] = [1, 2].map((num) => {
        const sessionNum = num as Session;
        const sessionLetters = sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;

        const rounds: RoundSnapshot[] = [];
        for (let r = 0; r < 4; r++) {
          const key = `s${sessionNum}-r${r}`;
          const snap = roundSnapshotsRef.current[key];
          if (snap) {
            rounds.push(snap);
          } else {
            rounds.push({
              roundNum: r + 1,
              letter: sessionLetters[r] || '',
              totalCards: 0, totalCorrect: 0,
              selectedCount: 0, correctSelections: 0,
              allItems: [], cardResults: [], timeSec: 0,
            });
          }
        }

        return { sessionNum, letters: sessionLetters, rounds };
      });

      return {
        type: 'huroof-tahajji-pick-correct-items-bulk',
        lessonType: 'pick-correct',
        sessions,
        completed,
      };
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS],
  );

  // ─── SAVE PROGRESS ──────────────────────────────────────────
  const saveFinalProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const sessionData = getSession();
    if (!sessionData?.student) return;

    const totalTimeSec = Object.values(sessionStatsRef.current).reduce(
      (sum, s) => sum + (s?.timeSec ?? 0), 0,
    );
    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY
    const snapshots: SessionSnapshot[] = [1, 2].map((num) => {
      const sessionNum = num as Session;
      const sessionLetters = sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
      const rounds: RoundSnapshot[] = [];
      for (let r = 0; r < 4; r++) {
        const key = `s${sessionNum}-r${r}`;
        const snap = roundSnapshotsRef.current[key];
        if (snap) rounds.push(snap);
      }
      return { sessionNum, letters: sessionLetters, rounds };
    });

    const summary = buildFullSummary(studentName, snapshots, true);

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject, level, lessonId,
        status: 'completed',
        timeSpentSec: totalTimeSec,
        summary,
        gameData: buildGameData(true),
      });
    } catch (err) {
      console.error('[UrduPickCorrectItems] ❌ Final save failed:', err);
    }
  }, [subject, level, lessonId, buildGameData, SESSION_1_LETTERS, SESSION_2_LETTERS]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const snapshots: SessionSnapshot[] = [1, 2].map((num) => {
      const sessionNum = num as Session;
      const sessionLetters = sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
      const rounds: RoundSnapshot[] = [];
      for (let r = 0; r < 4; r++) {
        const key = `s${sessionNum}-r${r}`;
        const snap = roundSnapshotsRef.current[key];
        if (snap) rounds.push(snap);
      }
      return { sessionNum, letters: sessionLetters, rounds };
    });

    const summary = buildFullSummary(studentName, snapshots, false);

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject, level, lessonId,
        status: 'uncompleted',
        timeSpentSec: elapsed,
        summary,
        gameData: buildGameData(false),
      });
    } catch {}
  }, [subject, level, lessonId, buildGameData, SESSION_1_LETTERS, SESSION_2_LETTERS]);

  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── CHECK HANDLER ──────────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    if (transitionPhase !== 'idle') return;
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    const stats = sessionStatsRef.current[sessionStatsKey];
    if (stats) {
      stats.finalSelected = selectedIndices.size;
      stats.timeSec += Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
    }

    const cardResults = buildCardResults(gameItems, selectedIndices);
    const correctSelections = cardResults.filter((r) => r.result === 'correct').length;

    const snap: RoundSnapshot = {
      roundNum: roundIdx + 1,
      letter: currentLetter,
      totalCards: gameItems.length,
      totalCorrect,
      selectedCount: selectedIndices.size,
      correctSelections,
      allItems: gameItems.map((i) => ({ id: i.id, name: i.name, isCorrect: i.isCorrect })),
      cardResults,
      timeSec: Math.floor((Date.now() - roundStartTimeRef.current) / 1000),
    };
    roundSnapshotsRef.current[roundKey] = snap;

    const isLastRoundInSession = roundIdx >= currentSessionLetters.length - 1;
    const isLastSession = session === 2;

    if (!isLastRoundInSession) {
      setTransitionPhase('fade-out');
      transitionTimerRef.current = setTimeout(() => {
        const nextRound = roundIdx + 1;
        setRoundIdx(nextRound);
        initializeRound(session, nextRound);
        setTransitionPhase('fade-in');
        transitionTimerRef.current = setTimeout(() => {
          setTransitionPhase('idle');
          isCheckingRef.current = false;
        }, 500);
      }, 500);
      return;
    }

    if (!isLastSession) {
      setTransitionPhase('fade-out');
      transitionTimerRef.current = setTimeout(() => {
        setSession(2);
        setRoundIdx(0);
        initializeRound(2, 0);
        setTransitionPhase('fade-in');
        transitionTimerRef.current = setTimeout(() => {
          setTransitionPhase('idle');
          isCheckingRef.current = false;
        }, 500);
      }, 500);
      return;
    }

    // All done
    setIsGameComplete(true);
    await saveFinalProgress();

    navigateTimerRef.current = setTimeout(() => {
      navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
    }, 500);
  }, [
    canCheck, transitionPhase, sessionStatsKey, selectedIndices, gameItems,
    buildCardResults, roundIdx, currentLetter, totalCorrect, roundKey,
    currentSessionLetters, session, initializeRound,
    navigate, subject, level, lessonId, saveFinalProgress,
  ]);

  // ─── RENDER ─────────────────────────────────────────────────
  const getContainerClass = () => {
    if (transitionPhase === 'fade-out') return 'hpi-fade-out';
    if (transitionPhase === 'fade-in') return 'hpi-fade-in';
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

  const letterYOffset = getLetterYOffset(currentLetterNumber);
  const letterSizeScale = getLetterSizeScale(currentLetterNumber);
  const baseLetterFontSize = 'min(14vh, 140px)';
  const currentLetterFontSize = `calc(${baseLetterFontSize} * ${letterSizeScale})`;

  return (
    <div
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}
      style={{ touchAction: 'none' }}
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
        dir="rtl"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
      >
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-2 pb-4">
          <div className="hpi-letter-pop">
            <div
              className="flex items-center justify-center rounded-3xl bg-white/50"
              style={{
                border: `4px solid ${ROYAL_BLUE}`,
                padding: 'min(1.5vh, 12px) min(4vh, 40px)',
                minWidth: 'min(18vh, 180px)',
                minHeight: 'min(18vh, 180px)',
                boxShadow: '0 6px 0 0 rgba(65, 105, 225, 0.15), 0 12px 28px -10px rgba(65, 105, 225, 0.25)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: currentLetterFontSize,
                  color: ROYAL_BLUE,
                  textShadow: '0 2px 8px rgba(65, 105, 225, 0.15)',
                  lineHeight: 1.6,
                  letterSpacing: '0.02em',
                  display: 'block',
                  position: 'relative',
                  top: letterYOffset,
                  transition: 'top 0.2s ease, font-size 0.2s ease',
                }}
              >
                {currentLetter}
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
                shadowColor = ROYAL_BLUE_SHADOW;
                scaleClass = 'scale-[1.03]';
              }

              if (isToolClear && isSelected) cursorClass = 'cursor-crosshair';
              else if (isToolClear && !isSelected) cursorClass = 'cursor-not-allowed';
              else if (isSelected) cursorClass = 'cursor-default';

              const isDisabled =
                isGameComplete || transitionPhase !== 'idle' || (tool === 'clear' && !isSelected);

              const handleClick = () => {
                if (isSelected && isToolClear) handleClearTap(index);
                else if (!isSelected && tool !== 'clear') handleCardSelect(index);
              };

              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={handleClick}
                  disabled={isDisabled && !isSelected}
                  className={`
                    hpi-pop-in relative flex flex-col items-center justify-center
                    rounded-2xl transition-all duration-200
                    ${isSelected ? 'border-4 clay-sm' : 'border-0'}
                    ${scaleClass} ${cursorClass}
                    ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isSelected ? 'hpi-card-select' : ''}
                  `}
                  style={{
                    ['--clay-shadow' as string]: shadowColor,
                    aspectRatio: '1/1',
                    width: '100%',
                    maxWidth: '160px',
                    minWidth: '90px',
                    padding: '6px',
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={item.svgUrl}
                      alt={item.name}
                      className="w-[90px] h-[90px] object-contain pointer-events-none"
                      style={{ maxWidth: '90px', maxHeight: '90px' }}
                      onError={() => {
                        console.warn(`[UrduPickCorrectItems] SVG load failed: ${item.id}`);
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

export default HuroofETahajjiPickCorrectItemsBulkBase;