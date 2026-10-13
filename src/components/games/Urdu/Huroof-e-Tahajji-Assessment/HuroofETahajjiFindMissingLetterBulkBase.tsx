// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiFindMissingLetterBulkBase.tsx
// ✅ Urdu version of AlphabetFindMissingLetter — Bulk Assessment
// ✅ SILENT gameplay — koi correct/wrong feedback nahi
// ✅ Toolbar: Undo, Redo, Clear, Check — on LEFT
// 🔥 2 SESSIONS — har session mein 4 letters ka sequence
// 🔥 Urdu font: Noto Nastaliq Urdu
// 💾 SUMMARY — per-letter status with wrong-attempt tracking
// 🔥 INTRO AUDIO — intro.wav plays ONCE at game start
//
// ✅ FIX (v2):
//    - Config is STORED at session start (like English game's LEVEL_CONFIGS)
//    - Each empty slot carries its expected letter from the start
//    - Check & Partial Save use STORED config — no re-randomization
//    - Wrong attempts are TRACKED per slot (attempts array)
//    - Summary shows: Correct / Correct (initially tried X) / Wrong / Missed

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
  "/src/assets/Urdu Assessment Assets/Huroof E Tahajji Find Missing Letter Bulk/intro.wav",
  { eager: true, query: "?url", import: "default" },
);

const INTRO_AUDIO_URL: string | null =
  Object.values(INTRO_AUDIO_MODULES)[0] ?? null;

// ─── 🔥 ROYAL BLUE ───────────────────────────────────────────
const ROYAL_BLUE = "#4169E1";

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

// ─── 🔥 COMPLETE URDU ALPHABET SEQUENCE (1-40) ─────────────
const URDU_SEQUENCE: string[] = [
  "ا", "آ", "ب", "پ", "ت", "ٹ", "ث", "ج", "چ", "ح",
  "خ", "د", "ڈ", "ذ", "ر", "ڑ", "ز", "ژ", "س", "ش",
  "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ",
  "ل", "م", "ن", "ں", "و", "ہ", "ھ", "ء", "ی", "ے",
];

const getSequenceIndex = (letter: string): number => URDU_SEQUENCE.indexOf(letter);

// ─── 🔥 SUBJECT COLORS ──────────────────────────────────────────
function getSubjectColor(subject: string = "urdu") {
  const colors: Record<string, { cardBg: string; cardShadow: string; textColor: string; outlineColor: string }> = {
    urdu: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", textColor: ROYAL_BLUE, outlineColor: ROYAL_BLUE },
    english: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", textColor: ROYAL_BLUE, outlineColor: ROYAL_BLUE },
    math: { cardBg: ROYAL_BLUE, cardShadow: "oklch(0.4 0.18 260 / 0.9)", textColor: ROYAL_BLUE, outlineColor: ROYAL_BLUE },
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
  @keyframes hfml-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hfml-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes hfml-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hfml-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes hfml-target-pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(65, 105, 225, 0); }
    50% { transform: scale(1.03); box-shadow: 0 0 30px 8px rgba(65, 105, 225, 0.18); }
  }
  @keyframes hfml-slot-pop {
    0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes hfml-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes hfml-tool-pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75), 0 0 0 0 rgba(34, 197, 94, 0.35); }
    50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0), 0 0 0 16px rgba(34, 197, 94, 0); }
  }
  @keyframes hfml-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  .hfml-pop-in { animation: hfml-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .hfml-fade-out { animation: hfml-fade-out 0.5s ease-in both; }
  .hfml-fade-in { animation: hfml-fade-in 0.5s ease-out both; }
  .hfml-drop-success { animation: hfml-drop-success 0.5s cubic-bezier(.34,1.4,.64,1) both; }
  .hfml-target-pulse { animation: hfml-target-pulse 1.8s ease-in-out infinite; }
  .hfml-slot-pop { animation: hfml-slot-pop 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .hfml-tool-pop { animation: hfml-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .hfml-check-pulse { animation: hfml-tool-pulse-green 1.4s ease-out infinite; }
  .hfml-card-reappear { animation: hfml-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }

  .hfml-card-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
`;

// ─── 📦 TYPES ──────────────────────────────────────────────────
interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

// 🔥 One recorded attempt (drop) on a slot
interface SlotAttempt {
  letter: string;
  isCorrect: boolean;
  timestamp: number;
}

// 🔥 SlotState now carries `expectedLetter` + `attempts`
interface SlotState {
  letter: string | null;          // current dropped letter (or pre-filled letter)
  isFilled: boolean;
  isPreFilled: boolean;
  expectedLetter: string | null;  // 🔥 which letter SHOULD be here (null for pre-filled)
  attempts: SlotAttempt[];        // 🔥 every drop recorded
}

interface HistorySnapshot {
  slotStates: SlotState[];
  options: string[];
  filledCount: number;
}

interface SessionStats {
  totalDrops: number;
  dropsRemoved: number;
  undoCount: number;
  redoCount: number;
  finalDrops: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return { totalDrops: 0, dropsRemoved: 0, undoCount: 0, redoCount: 0, finalDrops: 0, timeSec: 0 };
}

// 🔥 SlotResult with attempt info
interface SlotResult {
  slotIndex: number;
  expectedLetter: string | null;
  userLetter: string | null;
  result: "correct" | "wrong" | "missed";
  attempts: SlotAttempt[];
  hadWrongAttempt: boolean;
  wrongAttemptLetters: string[];
}

interface SessionSnapshot {
  totalSlots: number;
  filledSlots: number;
  correctSlots: number;
  slotResults: SlotResult[];
}

// 🔥 Session config stored per session
interface SessionConfig {
  slots: string[];         // e.g. ["آ", "", "پ", ""]
  correct: string[];       // e.g. ["ب", "ت"]
  distractors: string[];
}

type Tool = "drag" | "clear";
type TransitionPhase = "idle" | "fade-out" | "fade-in";
type Session = 1 | 2;

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════
function buildFullSummary(
  studentName: string,
  s1Snapshot: SessionSnapshot | null,
  s2Snapshot: SessionSnapshot | null,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Find Missing Letter lesson.`;
  }

  const lines: string[] = [];

  const buildLines = (snapshot: SessionSnapshot | null) => {
    if (!snapshot) return;
    for (const r of snapshot.slotResults) {
      if (!r.expectedLetter) continue;   // skip pre-filled

      let status: string;
      if (r.result === "correct") {
        // 🔥 Show wrong attempts if any
        if (r.hadWrongAttempt && r.wrongAttemptLetters.length > 0) {
          const wrongs = r.wrongAttemptLetters
            .map((l) => getLetterLabel(l))
            .join(", ");
          status = `Correct (initially tried ${wrongs})`;
        } else {
          status = "Correct";
        }
      } else if (r.result === "wrong") {
        status = `Wrong (dropped ${getLetterLabel(r.userLetter || "")}, expected ${getLetterLabel(r.expectedLetter)})`;
      } else {
        status = "Missed";
      }

      lines.push(`Letter ${getLetterLabel(r.expectedLetter)} - ${status}`);
    }
  };

  buildLines(s1Snapshot);
  buildLines(s2Snapshot);

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
  onClick, disabled, active, danger, pulse, ariaLabel, children,
}: ToolButtonProps) {
  const base = "hfml-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";
  let style = "border-white/60 bg-white text-slate-600 shadow";
  if (disabled) style = "border-white/40 bg-gray-200 text-gray-400 cursor-not-allowed";
  else if (danger) style = "border-white bg-red-500 text-white shadow-lg hover:bg-red-600";
  else if (active) style = "border-white bg-green-500 text-white ring-4 ring-yellow-300 shadow-lg hover:bg-green-600";
  else style = "border-white/60 bg-white text-slate-600 shadow hover:border-white hover:scale-110";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${base} ${style} ${pulse ? "hfml-check-pulse" : ""}`}
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
          ariaLabel={tool === "clear" ? "Cancel clear mode" : "Clear drops"}
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

export function HuroofETahajjiFindMissingLetterBulkBase({
  letters, subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();
  const subjectColor = getSubjectColor(subject);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [currentSession, setCurrentSession] = useState<Session>(1);
  const [slotStates, setSlotStates] = useState<SlotState[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [filledCount, setFilledCount] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [isGameComplete, setIsGameComplete] = useState(false);

  const [tool, setTool] = useState<Tool>("drag");
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    pair: string | null;
    position: { x: number; y: number } | null;
  }>({ isDragging: false, pair: null, position: null });

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const s1StatsRef = useRef<SessionStats>(emptyStats());
  const s2StatsRef = useRef<SessionStats>(emptyStats());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const timersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});
  const s1FinalSnapshotRef = useRef<SessionSnapshot | null>(null);
  const s2FinalSnapshotRef = useRef<SessionSnapshot | null>(null);

  // 🔥 STORED CONFIG — like English game's LEVEL_CONFIGS
  const s1ConfigRef = useRef<SessionConfig | null>(null);
  const s2ConfigRef = useRef<SessionConfig | null>(null);

  const activeStatsRef = currentSession === 1 ? s1StatsRef : s2StatsRef;

  // 🔥 Audio refs
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const isMountedRef = useRef(true);
  const audioUnlockedRef = useRef<boolean>(false);
  const preloadedIntroRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const SESSION_1_LETTERS = useMemo(() => letters.slice(0, 4), [letters]);
  const SESSION_2_LETTERS = useMemo(() => letters.slice(4, 8), [letters]);

  // ─── 🔥 BUILD SESSION CONFIG (deterministic per session start) ────
  const buildSessionConfig = useCallback((sessionLetters: string[]): SessionConfig => {
    if (sessionLetters.length < 4) {
      return { slots: ["", "", "", ""], correct: [], distractors: [] };
    }

    const useAlternate = Math.random() < 0.5;
    let slots: string[];
    let correct: string[];

    if (useAlternate) {
      slots = [sessionLetters[0], "", sessionLetters[2], ""];
      correct = [sessionLetters[1], sessionLetters[3]];
    } else {
      slots = [sessionLetters[0], "", "", sessionLetters[3]];
      correct = [sessionLetters[1], sessionLetters[2]];
    }

    const sessionSet = new Set(sessionLetters);
    const distractors: string[] = [];

    correct.forEach((letter) => {
      const idx = getSequenceIndex(letter);
      if (idx === -1) return;
      const candidates = [
        URDU_SEQUENCE[idx - 2], URDU_SEQUENCE[idx - 1],
        URDU_SEQUENCE[idx + 1], URDU_SEQUENCE[idx + 2],
      ].filter(Boolean);
      candidates.forEach((c) => {
        if (!sessionSet.has(c) && !correct.includes(c) && !distractors.includes(c) && distractors.length < 4) {
          distractors.push(c);
        }
      });
    });

    if (distractors.length < 4) {
      for (const ch of URDU_SEQUENCE) {
        if (!sessionSet.has(ch) && !correct.includes(ch) && !distractors.includes(ch)) {
          distractors.push(ch);
          if (distractors.length >= 4) break;
        }
      }
    }

    return { slots, correct, distractors };
  }, []);

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const getSlotFontSize = useCallback(() => "clamp(2rem, 9vh, 4.5rem)", []);
  const getOptionFontSize = useCallback(() => "clamp(1.8rem, 8vh, 4rem)", []);

  const getSlotGridCols = useCallback(() => {
    const count = slotStates.length;
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-4";
  }, [slotStates.length]);

  const getOptionGridCols = useCallback(() => {
    const count = options.length;
    if (count === 6) return "grid-cols-6";
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-6";
  }, [options.length]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 AUDIO HELPERS
  // ═══════════════════════════════════════════════════════════

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

  // ─── INITIALIZE GAME ──────────────────────────────────────────
  // 🔥 KEY: Config is generated ONCE and STORED in refs.
  //         Each empty slot carries its expected letter.
  const initializeGame = useCallback(
    (sessionNum: Session) => {
      const sessionLetters = sessionNum === 1 ? SESSION_1_LETTERS : SESSION_2_LETTERS;
      const config = buildSessionConfig(sessionLetters);

      // 🔥 STORE the config — used by Check + Partial Save (no re-randomization)
      if (sessionNum === 1) s1ConfigRef.current = config;
      else s2ConfigRef.current = config;

      const slots = config.slots;
      const correctLetters = config.correct;
      const distractors = config.distractors;

      // Compute empty slot indices ONCE
      const emptyIndices: number[] = [];
      slots.forEach((s: string, idx: number) => {
        if (s === "") emptyIndices.push(idx);
      });

      // 🔥 Map each empty slot to its expected letter, and init attempts
      const newSlotStates: SlotState[] = slots.map((letter: string, idx: number) => {
        const isPreFilled = !!letter;
        let expectedLetter: string | null = null;

        if (!isPreFilled) {
          const emptyOrder = emptyIndices.indexOf(idx);
          if (emptyOrder !== -1 && correctLetters[emptyOrder]) {
            expectedLetter = correctLetters[emptyOrder];
          }
        }

        return {
          letter: letter || null,
          isFilled: !!letter,
          isPreFilled,
          expectedLetter,
          attempts: [],      // 🔥 fresh
        };
      });

      const preFilledLetters = slots.filter((s: string) => s !== "");

      let allOptions: string[] = [...correctLetters];
      const uniqueDistractors = distractors.filter((d: string) => !correctLetters.includes(d));
      allOptions = [...allOptions, ...uniqueDistractors];
      allOptions = allOptions.filter((letter: string) => !preFilledLetters.includes(letter));

      const uniqueOptions = [...new Set(allOptions)];
      let finalOptions = shuffleArray(uniqueOptions);

      if (finalOptions.length < 6) {
        for (const ch of URDU_SEQUENCE) {
          if (!finalOptions.includes(ch) && !preFilledLetters.includes(ch)) {
            finalOptions.push(ch);
            if (finalOptions.length >= 6) break;
          }
        }
      }
      finalOptions = finalOptions.slice(0, 6);

      setSlotStates(newSlotStates);
      setOptions(finalOptions);
      setFilledCount(newSlotStates.filter((s) => s.isFilled).length);
      setTotalCorrect(correctLetters.length);
      setUndoStack([]);
      setRedoStack([]);
      setTool("drag");
      setHoveredSlotIndex(null);
      setDragState({ isDragging: false, pair: null, position: null });
      setTransitionPhase("idle");
      setIsGameComplete(false);

      if (sessionNum === 1) s1StatsRef.current = emptyStats();
      else s2StatsRef.current = emptyStats();
      sessionStartTimeRef.current = Date.now();
    },
    [SESSION_1_LETTERS, SESSION_2_LETTERS, buildSessionConfig, shuffleArray],
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
      Object.values(timersRef.current).forEach((t) => clearTimeout(t as any));
      if (!progressSavedRef.current) savePartialProgressRef.current();
      stopAllAudio();
      preloadedIntroRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── HISTORY ─────────────────────────────────────────────────
  const pushUndo = useCallback(
    (currentSlots: SlotState[], currentOptions: string[], currentFilled: number) => {
      setUndoStack((prev) => [
        ...prev,
        {
          slotStates: currentSlots.map((s) => ({
            ...s,
            attempts: [...s.attempts],   // 🔥 deep copy attempts
          })),
          options: [...currentOptions],
          filledCount: currentFilled,
        },
      ]);
      setRedoStack([]);
    },
    [],
  );

  const totalEmptySlots = useMemo(
    () => slotStates.filter((s) => !s.isPreFilled).length,
    [slotStates],
  );

  const filledEmptySlots = useMemo(
    () => slotStates.filter((s) => !s.isPreFilled && s.isFilled).length,
    [slotStates],
  );

  const canCheck = useMemo(() => {
    if (totalEmptySlots === 0) return false;
    return filledEmptySlots >= totalEmptySlots;
  }, [totalEmptySlots, filledEmptySlots]);

  // ─── BUILD SLOT RESULT (shared by Check + Partial Save) ──────
  const buildSlotResult = useCallback((slot: SlotState, i: number): SlotResult => {
    const expectedLetter = slot.expectedLetter;
    const userLetter = slot.isFilled ? slot.letter : null;

    let result: SlotResult["result"];
    if (slot.isPreFilled) result = "correct";
    else if (!userLetter) result = "missed";
    else if (userLetter === expectedLetter) result = "correct";
    else result = "wrong";

    const wrongAttemptLetters = slot.attempts
      .filter((a) => !a.isCorrect)
      .map((a) => a.letter);

    return {
      slotIndex: i,
      expectedLetter,
      userLetter,
      result,
      attempts: slot.attempts,
      hadWrongAttempt: wrongAttemptLetters.length > 0,
      wrongAttemptLetters,
    };
  }, []);

  // ─── CHECK ───────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (transitionPhase !== "idle") return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const stats = activeStatsRef.current;
    stats.finalDrops = filledEmptySlots;
    stats.timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    // 🔥 Use stored expectedLetter from slotStates — no re-generation
    const slotResults: SlotResult[] = slotStates.map((slot, i) => buildSlotResult(slot, i));

    const correctSlots = slotResults.filter(
      (r) => !slotStates[r.slotIndex]?.isPreFilled && r.result === "correct",
    ).length;

    const snapshot: SessionSnapshot = {
      totalSlots: slotStates.length,
      filledSlots: filledCount,
      correctSlots,
      slotResults,
    };

    if (currentSession === 1) {
      s1FinalSnapshotRef.current = snapshot;
      setTransitionPhase("fade-out");
      timersRef.current["session2"] = setTimeout(() => {
        setCurrentSession(2);
        initializeGame(2);
        setTransitionPhase("fade-in");
        timersRef.current["session2in"] = setTimeout(() => {
          setTransitionPhase("idle");
          isCheckingRef.current = false;
        }, 500);
      }, 500);
    } else {
      s2FinalSnapshotRef.current = snapshot;
      setIsGameComplete(true);
      saveFinalProgress();

      timersRef.current["navigate"] = setTimeout(() => {
        navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
      }, 500);
    }
  }, [
    canCheck, transitionPhase, currentSession, slotStates, filledCount,
    filledEmptySlots, buildSlotResult, initializeGame, navigate, subject, level, lessonId,
  ]);

  // ─── PROGRESS SAVE ───────────────────────────────────────────
  const buildGameData = useCallback(
    (completed: boolean) => {
      const s1 = s1FinalSnapshotRef.current;
      const s2 = s2FinalSnapshotRef.current;
      return {
        type: "huroof-tahajji-find-missing-letter-bulk",
        lessonType: "find-missing",
        sessions: [
          {
            sessionNum: 1,
            letters: SESSION_1_LETTERS,
            totalSlots: s1?.totalSlots ?? 0,
            filledSlots: s1?.filledSlots ?? 0,
            correctSlots: s1?.correctSlots ?? 0,
            slotResults: s1?.slotResults ?? [],
            stats: { ...s1StatsRef.current },
          },
          {
            sessionNum: 2,
            letters: SESSION_2_LETTERS,
            totalSlots: s2?.totalSlots ?? 0,
            filledSlots: s2?.filledSlots ?? 0,
            correctSlots: s2?.correctSlots ?? 0,
            slotResults: s2?.slotResults ?? [],
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
    }).catch((err) => console.error("[FindMissingBulk] Save failed:", err));
  }, [subject, level, lessonId, buildGameData]);

  // 🔥 Partial save also uses stored expectedLetter
  const savePartialProgress = useCallback(() => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 Build partial snapshot from CURRENT slotStates
    const partialSlotResults: SlotResult[] = slotStates.map((slot, i) => buildSlotResult(slot, i));

    const partialSnapshot: SessionSnapshot = {
      totalSlots: slotStates.length,
      filledSlots: filledCount,
      correctSlots: partialSlotResults.filter(
        (r) => !slotStates[r.slotIndex]?.isPreFilled && r.result === "correct",
      ).length,
      slotResults: partialSlotResults,
    };

    const s1Snap =
      s1FinalSnapshotRef.current ??
      (currentSession === 1 ? partialSnapshot : null);
    const s2Snap =
      s2FinalSnapshotRef.current ??
      (currentSession === 2 ? partialSnapshot : null);

    const summary = buildFullSummary(studentName, s1Snap, s2Snap, false);

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: "uncompleted",
      timeSpentSec: elapsed,
      summary,
      gameData: buildGameData(false),
    }).catch(() => {});
  }, [
    subject, level, lessonId, buildGameData, slotStates, filledCount, currentSession, buildSlotResult,
  ]);

  const savePartialProgressRef = useRef<() => void>(() => {});
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ─── DRAG HANDLERS ───────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pair: string) => {
      if (transitionPhase !== "idle") return;
      if (isGameComplete) return;
      if (tool === "clear") return;
      if (dragState.isDragging) return;

      e.preventDefault();
      e.stopPropagation();
      setDragState({ isDragging: true, pair, position: { x: e.clientX - 40, y: e.clientY - 40 } });
    },
    [transitionPhase, isGameComplete, tool, dragState.isDragging],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.pair) return;
      e.preventDefault();
      setDragState((prev) => ({ ...prev, position: { x: e.clientX - 40, y: e.clientY - 40 } }));

      let hovered: number | null = null;
      slotStates.forEach((slot, index) => {
        if (slot.isFilled) return;
        const slotEl = document.querySelector(`[data-slot-index="${index}"]`);
        if (slotEl) {
          const rect = slotEl.getBoundingClientRect();
          const padding = 20;
          if (e.clientX >= rect.left - padding && e.clientX <= rect.right + padding && e.clientY >= rect.top - padding && e.clientY <= rect.bottom + padding) {
            hovered = index;
          }
        }
      });
      setHoveredSlotIndex(hovered);
    },
    [dragState.isDragging, dragState.pair, slotStates],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.pair) {
        setDragState({ isDragging: false, pair: null, position: null });
        setHoveredSlotIndex(null);
        return;
      }

      const droppedPair = dragState.pair;
      const clientX = e.clientX;
      const clientY = e.clientY;

      setDragState({ isDragging: false, pair: null, position: null });
      setHoveredSlotIndex(null);

      let droppedIndex: number | null = null;
      slotStates.forEach((slot, index) => {
        if (slot.isFilled) return;
        const slotEl = document.querySelector(`[data-slot-index="${index}"]`);
        if (slotEl) {
          const rect = slotEl.getBoundingClientRect();
          const padding = 20;
          if (clientX >= rect.left - padding && clientX <= rect.right + padding && clientY >= rect.top - padding && clientY <= rect.bottom + padding) {
            droppedIndex = index;
          }
        }
      });

      if (droppedIndex === null) return;
      pushUndo(slotStates, options, filledCount);

      // 🔥 Record the attempt with correctness
      setSlotStates((prev) =>
        prev.map((slot, idx) => {
          if (idx !== droppedIndex) return slot;
          const attempt: SlotAttempt = {
            letter: droppedPair,
            isCorrect: droppedPair === slot.expectedLetter,
            timestamp: Date.now(),
          };
          return {
            ...slot,
            letter: droppedPair,
            isFilled: true,
            attempts: [...slot.attempts, attempt],
          };
        }),
      );

      setOptions((prev) => prev.filter((p) => p !== droppedPair));
      setFilledCount((c) => c + 1);
      activeStatsRef.current.totalDrops += 1;
    },
    [dragState, slotStates, options, filledCount, pushUndo],
  );

  // ─── CLEAR ───────────────────────────────────────────────────
  const handleSlotTap = useCallback(
    (slotIndex: number) => {
      if (tool !== "clear") return;
      if (isGameComplete) return;
      if (transitionPhase !== "idle") return;

      const slot = slotStates[slotIndex];
      if (slot.isPreFilled) return;
      if (!slot.isFilled) return;

      pushUndo(slotStates, options, filledCount);
      const removedPair = slot.letter;

      // 🔥 Keep attempts intact — only clear the current letter
      setSlotStates((prev) =>
        prev.map((s, idx) =>
          idx === slotIndex ? { ...s, letter: null, isFilled: false } : s,
        ),
      );
      if (removedPair) setOptions((prev) => [...prev, removedPair]);
      setFilledCount((c) => Math.max(0, c - 1));
      activeStatsRef.current.dropsRemoved += 1;
      setTool("drag");
    },
    [tool, isGameComplete, transitionPhase, slotStates, options, filledCount, pushUndo],
  );

  // ─── UNDO / REDO ─────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    activeStatsRef.current.undoCount += 1;

    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [
      ...r,
      {
        slotStates: slotStates.map((s) => ({ ...s, attempts: [...s.attempts] })),
        options: [...options],
        filledCount,
      },
    ]);
    setSlotStates(prev.slotStates);
    setOptions(prev.options);
    setFilledCount(prev.filledCount);
  }, [undoStack, slotStates, options, filledCount]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    activeStatsRef.current.redoCount += 1;

    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((u) => [
      ...u,
      {
        slotStates: slotStates.map((s) => ({ ...s, attempts: [...s.attempts] })),
        options: [...options],
        filledCount,
      },
    ]);
    setSlotStates(next.slotStates);
    setOptions(next.options);
    setFilledCount(next.filledCount);
  }, [redoStack, slotStates, options, filledCount]);

  const handleToggleClear = useCallback(() => {
    setTool((prev) => (prev === "clear" ? "drag" : "clear"));
  }, []);

  const getFadeClass = () => {
    if (transitionPhase === "fade-out") return "hfml-fade-out";
    if (transitionPhase === "fade-in") return "hfml-fade-in";
    return "";
  };

  // ─── RENDER SLOT ─────────────────────────────────────────────
  const renderSlot = (slot: SlotState, index: number) => {
    const isHovered = hoveredSlotIndex === index;
    const isFilled = slot.isFilled;
    const isToolClear = tool === "clear";

    const displayLetter = slot.letter || "";
    const fontSize = getSlotFontSize();

    if (isFilled) {
      return (
        <div
          key={`slot-${index}`}
          data-slot-index={index}
          onClick={() => handleSlotTap(index)}
          className={`hfml-slot-pop clay-sm relative flex flex-col items-center justify-center rounded-2xl border-4 border-white ${isToolClear && !slot.isPreFilled ? "cursor-crosshair" : "cursor-default"}`}
          style={{
            ["--clay-shadow" as string]: "oklch(0.4 0.18 260 / 0.9)",
            width: "100%", maxWidth: "160px", minWidth: "80px",
            aspectRatio: "1/1", padding: "4px",
            backgroundColor: ROYAL_BLUE, overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-center w-full h-full" style={{ overflow: "hidden" }}>
            <span
              style={{
                fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
                fontWeight: 400, fontSize, color: "#FFFFFF",
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                letterSpacing: "0.02em", transform: "translateY(-4%)",
              }}
            >
              {displayLetter}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`slot-${index}`}
        data-slot-index={index}
        className={`hfml-slot-pop relative flex flex-col items-center justify-center rounded-2xl border-4 ${isHovered ? "hfml-target-pulse" : ""}`}
        style={{
          borderColor: ROYAL_BLUE,
          width: "100%", maxWidth: "160px", minWidth: "80px",
          aspectRatio: "1/1", padding: "4px",
          backgroundColor: "transparent",
          boxShadow: isHovered ? `0 0 30px ${ROYAL_BLUE}44` : "none",
          borderStyle: "solid",
          animation: isHovered ? "none" : "hfml-target-pulse 1.8s ease-in-out infinite",
        }}
      />
    );
  };

  // ─── RENDER OPTION ───────────────────────────────────────────
  const renderOption = (pair: string, index: number) => {
    const isDraggingThis = dragState.pair === pair && dragState.isDragging;
    const isDisabled = transitionPhase !== "idle" || isGameComplete || tool === "clear";
    const fontSize = getOptionFontSize();

    return (
      <div
        key={`option-${index}`}
        className={`
          flex items-center justify-center transition-all duration-150
          ${isDraggingThis ? "opacity-0" : "hfml-card-reappear"}
          ${isDisabled && !isDraggingThis ? "opacity-50 cursor-not-allowed" : ""}
          ${!isDisabled && !isDraggingThis ? "cursor-grab active:scale-95" : ""}
        `}
        style={{
          width: "100%", maxWidth: "130px", minWidth: "70px",
          aspectRatio: "1/1", padding: "4px",
          touchAction: "none", backgroundColor: "transparent",
          border: "none", boxShadow: "none",
          userSelect: "none", WebkitUserSelect: "none",
        }}
        onPointerDown={(e) => !isDisabled && !isDraggingThis && handlePointerDown(e, pair)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && (
          <span
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
              fontWeight: 400, fontSize, color: ROYAL_BLUE,
              lineHeight: 1.6,
              display: "flex", alignItems: "center", justifyContent: "center",
              letterSpacing: "0.02em",
              userSelect: "none", WebkitUserSelect: "none",
            }}
          >
            {pair}
          </span>
        )}
      </div>
    );
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const hasDrops = filledEmptySlots > 0;
  const isTransitioning = transitionPhase !== "idle";

  return (
    <div
      ref={boardRef}
      className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getFadeClass()}`}
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
        isTransitioning={isTransitioning}
      />

      <div
        dir="rtl"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud p-4"
        style={{ touchAction: "none" }}
      >
        <div className="flex w-full flex-1 items-center justify-center px-4">
          <div className={`grid ${getSlotGridCols()} gap-4 sm:gap-6 w-full max-w-3xl place-items-center`}>
            {slotStates.map((slot, index) => renderSlot(slot, index))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center pb-2">
          <div className={`grid ${getOptionGridCols()} gap-2 sm:gap-3 w-full max-w-3xl place-items-center`}>
            {options.map((pair, index) => renderOption(pair, index))}
          </div>
        </div>
      </div>

      {dragState.isDragging && dragState.pair && dragState.position && (
        <span
          className="fixed pointer-events-none z-[60] select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: getOptionFontSize(),
            color: ROYAL_BLUE,
            lineHeight: 1.6,
            display: "flex", alignItems: "center", justifyContent: "center",
            letterSpacing: "0.02em",
            transform: "rotate(-5deg) scale(1.15)",
            textShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "none",
            userSelect: "none", WebkitUserSelect: "none",
          }}
        >
          {dragState.pair}
        </span>
      )}
    </div>
  );
}

export default HuroofETahajjiFindMissingLetterBulkBase;