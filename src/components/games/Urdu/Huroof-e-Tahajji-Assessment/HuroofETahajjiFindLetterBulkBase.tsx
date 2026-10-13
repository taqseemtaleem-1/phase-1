// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiFindLetterBulkBase.tsx
// ✅ ASSESSMENT version of HuroofETahajjiFindLetterBase
// 🔥 4 SESSIONS — har session mein 2 UNIQUE letters (total 8 letters covered)
// 🔥 SILENT gameplay — koi correct/wrong feedback NAHI
// 🔥 Undo / Redo / Clear / Check toolbar
// 💾 SUMMARY added — per-letter status (Correct/Wrong/Missed) with names

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Undo2, Redo2, Eraser, Check } from "lucide-react";

import { saveProgress } from "@/lib/progressSync";
import { getSession } from "@/lib/auth";

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🔥 URDU LETTER AUDIOS
// ═══════════════════════════════════════════════════════════════

const LETTER_AUDIO_MODULES = import.meta.glob<string>(
  "/src/assets/Huroof-e-Tahajji-Choose Correct Letter audios/*.wav",
  { eager: true, query: "?url", import: "default" },
);

function buildLetterAudioMap(): Record<number, string> {
  const map: Record<number, string> = {};
  for (const [path, url] of Object.entries(LETTER_AUDIO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^Letter\s*\((\d+)\)\.wav$/i);
    if (match) {
      const num = Number(match[1]);
      if (num >= 1 && num <= 40) map[num] = url;
    }
  }
  return map;
}

const LETTER_AUDIO: Record<number, string> = buildLetterAudioMap();

// 🔥 Letter → audio number mapping
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

interface SelectionResult {
  sessionNum: number;
  selectionNum: number;
  targetLetter: string;
  isCorrect: boolean;
  userSelected: string | null;
}

function buildFullSummary(
  studentName: string,
  selectionResults: Record<string, SelectionResult>,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Find Letter lesson.`;
  }

  const lines: string[] = [];

  // 4 sessions × 2 selections each
  for (let s = 1; s <= 4; s++) {
    for (let sel = 1; sel <= 2; sel++) {
      const key = `s${s}-s${sel}`;
      const r = selectionResults[key];
      if (!r) continue;

      let status: string;
      if (r.userSelected === null) status = 'Missed';
      else if (r.isCorrect) status = 'Correct';
      else status = 'Wrong';

      lines.push(`Letter ${getLetterLabel(r.targetLetter)} - ${status}`);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  🔥 LETTER SIZING RULES
// ═══════════════════════════════════════════════════════════════

const SHORT_LETTERS = ["د", "ڈ", "ذ", "ر", "ڑ", "ز", "ژ", "و", "ہ", "ھ"];
const LAAM_LETTER = "ل";
const TOE_ZOE_LETTERS = ["ط", "ظ"];
const ALIF_MADDA = "آ";

const UP_NUDGE_MARGIN: Record<string, string> = {
  "ع": "26%", "غ": "26%", "ق": "50%", "و": "52%",
  "ب": "32%", "پ": "52%",
  "ج": "42%", "چ": "42%", "ح": "42%", "خ": "42%",
  "د": "52%", "ڈ": "52%", "ذ": "52%", "ر": "52%", "ڑ": "52%",
  "ز": "52%", "ژ": "52%",
  "س": "42%", "ش": "42%", "ص": "42%", "ض": "42%",
  "ط": "42%", "ظ": "42%",
  "ں": "42%", "ن": "42%",
  "م": "52%",
  "ہ": "42%", "ھ": "42%",
  "ی": "42%", "ے": "42%",
};

// ═══════════════════════════════════════════════════════════════
//  🔥 ROYAL BLUE THEME
// ═══════════════════════════════════════════════════════════════

const ROYAL_BLUE = "#4169E1";
const ROYAL_BLUE_SHADOW = "oklch(0.4 0.18 260 / 0.9)";

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT CSS
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
//  🎬 GAME CSS
// ═══════════════════════════════════════════════════════════════

const GAME_CSS = `
  @keyframes aflb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes aflb-card-select {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes aflb-reset-bounce {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes aflb-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.92); }
  }
  @keyframes aflb-fade-in {
    0%   { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes aflb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes aflb-tool-pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.75),
                  0 0 0 0 rgba(34, 197, 94, 0.35);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),
                  0 0 0 16px rgba(34, 197, 94, 0);
    }
  }

  .aflb-pop-in { animation: aflb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .aflb-card-select { animation: aflb-card-select 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .aflb-reset-bounce { animation: aflb-reset-bounce 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .aflb-fade-out { animation: aflb-fade-out 0.5s ease-in both; }
  .aflb-fade-in { animation: aflb-fade-in 0.5s ease-out both; }
  .aflb-tool-pop { animation: aflb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .aflb-check-pulse { animation: aflb-tool-pulse-green 1.4s ease-out infinite; }

  .aflb-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }
  .aflb-lock-overlay-enter {
    animation: aflb-overlay-in 0.15s ease-out both;
  }
  @keyframes aflb-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// ═══════════════════════════════════════════════════════════════
//  📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  letters: string[];
  letterNames?: string[];
  subject: string;
  level: number;
  lessonId: number;
}

type Session = 1 | 2 | 3 | 4;
type TransitionPhase = "idle" | "fade-out" | "fade-in";

interface SessionStats {
  totalSelections: number;
  undoCount: number;
  redoCount: number;
  clearCount: number;
  timeSec: number;
}

function emptyStats(): SessionStats {
  return { totalSelections: 0, undoCount: 0, redoCount: 0, clearCount: 0, timeSec: 0 };
}

// ═══════════════════════════════════════════════════════════════
//  🔥 FIXED DISTRACTORS MAP
// ═══════════════════════════════════════════════════════════════

const URDU_DISTRACTORS_MAP: Record<string, string[]> = {
  "ا": ["آ", "ل", "م"], "آ": ["ا", "ل", "م"],
  "ب": ["پ", "ت", "ن"], "پ": ["ب", "ت", "ن"],
  "ت": ["ٹ", "ب", "ث"], "ٹ": ["ت", "ث", "ب"],
  "ث": ["ٹ", "ت", "ن"], "ج": ["چ", "ح", "خ"],
  "چ": ["ج", "ح", "خ"], "ح": ["خ", "ج", "چ"],
  "خ": ["ح", "ج", "چ"], "د": ["ڈ", "ذ", "ر"],
  "ڈ": ["د", "ذ", "ر"], "ذ": ["ڈ", "ز", "ر"],
  "ر": ["ڑ", "ز", "د"], "ڑ": ["ر", "ز", "د"],
  "ز": ["ژ", "ر", "ذ"], "ژ": ["ز", "ر", "ذ"],
  "س": ["ش", "ص", "ض"], "ش": ["س", "ص", "ض"],
  "ص": ["ض", "س", "ش"], "ض": ["ص", "ط", "ظ"],
  "ط": ["ظ", "ص", "ض"], "ظ": ["ط", "ص", "ض"],
  "ع": ["غ", "ح", "خ"], "غ": ["ع", "ح", "خ"],
  "ف": ["ق", "و", "ن"], "ق": ["ف", "و", "ن"],
  "ک": ["گ", "ل", "ن"], "گ": ["ک", "ل", "ن"],
  "ل": ["م", "ا", "ن"], "م": ["ل", "ن", "و"],
  "ن": ["ں", "م", "ب"], "ں": ["ن", "م", "ب"],
  "و": ["ہ", "ھ", "م"], "ہ": ["ھ", "و", "م"],
  "ھ": ["ہ", "و", "م"], "ء": ["ہ", "ع", "ھ"],
  "ی": ["ے", "ن", "ں"], "ے": ["ی", "ن", "ں"],
};

// ═══════════════════════════════════════════════════════════════
//  🔥 OPTION GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateOptions(targetLetter: string): { picks: string[]; allOptions: string[] } {
  const fixedDistractors = URDU_DISTRACTORS_MAP[targetLetter] || ["ل", "م", "ن"];
  const wrongPicks = [...fixedDistractors].slice(0, 3);
  const picks = [targetLetter, ...wrongPicks];
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return { picks, allOptions: [targetLetter, ...wrongPicks].sort() };
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
  const base = "aflb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";
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
      className={`${base} ${style} ${pulse ? "aflb-check-pulse" : ""}`}
    >
      {children}
    </button>
  );
});

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCheck: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  canCheck: boolean;
  isTransitioning: boolean;
}

const Toolbar = React.memo(function Toolbar({
  onUndo, onRedo, onClear, onCheck,
  canUndo, canRedo, canClear, canCheck, isTransitioning,
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
          onClick={onClear}
          danger={canClear}
          disabled={!canClear || isTransitioning}
          ariaLabel="Clear selection"
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

export function HuroofETahajjiFindLetterBulkBase({
  letters,
  letterNames,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();

  const SESSION_LETTERS = useMemo<
    Record<Session, [{ letter: string; name: string }, { letter: string; name: string }]>
  >(
    () => ({
      1: [
        { letter: letters[0] || "ا", name: letterNames?.[0] || "" },
        { letter: letters[1] || "آ", name: letterNames?.[1] || "" },
      ],
      2: [
        { letter: letters[2] || "ب", name: letterNames?.[2] || "" },
        { letter: letters[3] || "پ", name: letterNames?.[3] || "" },
      ],
      3: [
        { letter: letters[4] || "ت", name: letterNames?.[4] || "" },
        { letter: letters[5] || "ٹ", name: letterNames?.[5] || "" },
      ],
      4: [
        { letter: letters[6] || "ث", name: letterNames?.[6] || "" },
        { letter: letters[7] || "ج", name: letterNames?.[7] || "" },
      ],
    }),
    [letters, letterNames],
  );

  const [session, setSession] = useState<Session>(1);
  const [selectionNum, setSelectionNum] = useState<1 | 2>(1);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [undoStack, setUndoStack] = useState<Array<string | null>>([]);
  const [redoStack, setRedoStack] = useState<Array<string | null>>([]);

  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LOCK_DURATION = 2000;

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const isMountedRef = useRef(true);
  const audioUnlockedRef = useRef<boolean>(false);
  const preloadedAudioRef = useRef<Record<number, HTMLAudioElement>>({});
  const introPlayedRef = useRef<Record<string, boolean>>({});

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);

  const sessionStatsRef = useRef<Record<Session, SessionStats>>({
    1: emptyStats(), 2: emptyStats(), 3: emptyStats(), 4: emptyStats(),
  });

  // 🔥 Selection results (keyed by s{session}-s{selectionNum})
  const selectionResultsRef = useRef<Record<string, SelectionResult>>({});

  const selectionOptionsRef = useRef<Record<string, string[]>>({});

  const sessionTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTarget = SESSION_LETTERS[session][selectionNum - 1];

  // ═══════════════════════════════════════════════════════════
  //  🔥 AUDIO HELPERS
  // ═══════════════════════════════════════════════════════════

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

  const preloadLetterAudio = useCallback(() => {
    const uniqueLetters = new Set<string>();
    for (let s = 1; s <= 4; s++) {
      const sessionNum = s as Session;
      uniqueLetters.add(SESSION_LETTERS[sessionNum][0].letter);
      uniqueLetters.add(SESSION_LETTERS[sessionNum][1].letter);
    }
    uniqueLetters.forEach((letter) => {
      const num = LETTER_TO_NUMBER[letter];
      if (!num) return;
      const url = LETTER_AUDIO[num];
      if (!url) return;
      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        preloadedAudioRef.current[num] = audio;
      } catch {}
    });
  }, [SESSION_LETTERS]);

  const playAudio = useCallback(
    (src: string, onComplete?: () => void): Promise<void> => {
      return new Promise((resolve) => {
        stopAllAudio();
        try {
          let audio: HTMLAudioElement | null = null;
          const preloaded = Object.values(preloadedAudioRef.current).find(
            (a) => a.src === src || a.src.endsWith(src.split("/").pop() || ""),
          );
          if (preloaded) {
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
              audioUnlockedRef.current = false;
              cleanup();
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
    const key = `s${session}-s${selectionNum}`;
    if (introPlayedRef.current[key]) return;

    const letterNum = LETTER_TO_NUMBER[currentTarget.letter];
    if (!letterNum) return;
    const audioUrl = LETTER_AUDIO[letterNum];
    if (!audioUrl) return;

    introPlayedRef.current[key] = true;
    playAudio(audioUrl);
  }, [session, selectionNum, currentTarget.letter, playAudio]);

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

  // ═══════════════════════════════════════════════════════════
  //  🎯 INITIALIZE SELECTION
  // ═══════════════════════════════════════════════════════════

  const initializeSelection = useCallback(
    (sessionNum: Session, selNum: 1 | 2) => {
      const targetLetter = SESSION_LETTERS[sessionNum][selNum - 1].letter;
      const { picks, allOptions } = generateOptions(targetLetter);

      setOptions(picks);
      setSelected(null);
      setUndoStack([]);
      setRedoStack([]);
      setResetKey((prev) => prev + 1);
      setTransitionPhase("idle");

      const key = `s${sessionNum}-s${selNum}`;
      selectionOptionsRef.current[key] = allOptions;

      sessionStartTimeRef.current = Date.now();
    },
    [SESSION_LETTERS],
  );

  const startLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, LOCK_DURATION);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    introPlayedRef.current = {};

    preloadLetterAudio();
    initializeSelection(1, 1);
    startLock();

    const introTimer = setTimeout(() => {
      if (isMountedRef.current) playIntroAudioRef.current();
    }, 400);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (sessionTransitionRef.current) clearTimeout(sessionTransitionRef.current);
      stopAllAudio();
      Object.values(preloadedAudioRef.current).forEach((audio) => {
        try { audio.pause(); audio.src = ""; } catch {}
      });
      preloadedAudioRef.current = {};

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || "Student";

            // 🔥 NEW SUMMARY — partial
            const summary = buildFullSummary(studentName, selectionResultsRef.current, false);

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject, level, lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: buildGameData(false),
            }).catch(() => {});
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🔥 HANDLE CARD SELECT
  // ═══════════════════════════════════════════════════════════

  const isGameComplete = useCallback(() => completedRef.current, []);

  const handleCardClick = useCallback(
    (choice: string) => {
      if (isLocked) return;
      if (isChecking) return;
      if (transitionPhase !== "idle") return;
      if (selected !== null) return;
      if (isGameComplete()) return;

      setUndoStack((prev) => [...prev, null]);
      setRedoStack([]);
      setSelected(choice);

      const stats = sessionStatsRef.current[session];
      if (stats) stats.totalSelections += 1;
    },
    [isLocked, isChecking, transitionPhase, selected, isGameComplete, session],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    if (isChecking) return;
    if (selected === null) return;

    const stats = sessionStatsRef.current[session];
    if (stats) stats.undoCount += 1;

    setRedoStack((prev) => [...prev, selected]);
    setUndoStack((prev) => prev.slice(0, -1));
    setSelected(null);
  }, [undoStack.length, isChecking, selected, session]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    if (isChecking) return;

    const stats = sessionStatsRef.current[session];
    if (stats) stats.redoCount += 1;

    const nextValue = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, null]);
    setRedoStack((prev) => prev.slice(0, -1));
    setSelected(nextValue);
  }, [redoStack, isChecking, session]);

  const handleClear = useCallback(() => {
    if (selected === null) return;
    if (isChecking) return;

    const stats = sessionStatsRef.current[session];
    if (stats) stats.clearCount += 1;

    setUndoStack((prev) => [...prev, selected]);
    setRedoStack([]);
    setSelected(null);
  }, [selected, isChecking, session]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 CHECK
  // ═══════════════════════════════════════════════════════════

  const handleCheck = useCallback(() => {
    if (selected === null) return;
    if (isChecking) return;
    if (transitionPhase !== "idle") return;

    setIsChecking(true);

    const targetLetter = currentTarget.letter;
    const isCorrect = selected === targetLetter;

    const stats = sessionStatsRef.current[session];
    const timeSec = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (stats) stats.timeSec += timeSec;

    const key = `s${session}-s${selectionNum}`;
    selectionResultsRef.current[key] = {
      sessionNum: session,
      selectionNum,
      targetLetter,
      userSelected: selected,
      isCorrect,
    };

    setTimeout(() => {
      if (!isMountedRef.current) return;

      // Selection 2 in same session
      if (selectionNum === 1) {
        setTransitionPhase("fade-out");
        sessionTransitionRef.current = setTimeout(() => {
          setSelectionNum(2);
          initializeSelection(session, 2);
          startLock();
          setTransitionPhase("fade-in");
          setTimeout(() => {
            if (!isMountedRef.current) return;
            setTransitionPhase("idle");
            setIsChecking(false);
            setTimeout(() => {
              if (isMountedRef.current) playIntroAudioRef.current();
            }, 300);
          }, 500);
        }, 500);
        return;
      }

      // Next session
      if (session < 4) {
        const nextSession = (session + 1) as Session;
        setTransitionPhase("fade-out");
        sessionTransitionRef.current = setTimeout(() => {
          setSession(nextSession);
          setSelectionNum(1);
          initializeSelection(nextSession, 1);
          startLock();
          setTransitionPhase("fade-in");
          setTimeout(() => {
            if (!isMountedRef.current) return;
            setTransitionPhase("idle");
            setIsChecking(false);
            setTimeout(() => {
              if (isMountedRef.current) playIntroAudioRef.current();
            }, 300);
          }, 500);
        }, 500);
        return;
      }

      // All done
      setTransitionPhase("fade-out");
      sessionTransitionRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        completedRef.current = true;

        if (!progressSavedRef.current) {
          progressSavedRef.current = true;

          const totalElapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
          const sessionData = getSession();

          if (sessionData?.student) {
            const studentName = sessionData.student.studentName || "Student";
            const totalTimeSec = (Object.values(sessionStatsRef.current) as SessionStats[])
              .reduce((sum, s) => sum + s.timeSec, 0);

            // 🔥 NEW SUMMARY — completed
            const summary = buildFullSummary(studentName, selectionResultsRef.current, true);

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject, level, lessonId,
              status: "completed",
              timeSpentSec: totalTimeSec || totalElapsed,
              summary,
              gameData: buildGameData(true),
            }).catch(() => {});
          }
        }

        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      }, 500);
    }, 300);
  }, [
    selected, isChecking, transitionPhase, currentTarget,
    session, selectionNum, initializeSelection, startLock,
    navigate, subject, level, lessonId,
  ]);

  // ═══════════════════════════════════════════════════════════
  //  🔥 BUILD GAME DATA
  // ═══════════════════════════════════════════════════════════

  const buildGameData = useCallback(
    (completed: boolean) => {
      const sessions = [1, 2, 3, 4].map((num) => {
        const sessionNum = num as Session;
        const s1Key = `s${sessionNum}-s1`;
        const s2Key = `s${sessionNum}-s2`;
        const s1Result = selectionResultsRef.current[s1Key];
        const s2Result = selectionResultsRef.current[s2Key];
        const s1Target = SESSION_LETTERS[sessionNum][0];
        const s2Target = SESSION_LETTERS[sessionNum][1];

        return {
          sessionNum,
          stats: { ...sessionStatsRef.current[sessionNum] },
          selections: [
            {
              selectionNum: 1,
              targetLetter: s1Result?.targetLetter ?? s1Target.letter,
              targetLetterName: s1Target.name,
              allOptions: selectionOptionsRef.current[s1Key] || [],
              userSelected: s1Result?.userSelected ?? null,
              isCorrect: s1Result?.isCorrect ?? false,
            },
            {
              selectionNum: 2,
              targetLetter: s2Result?.targetLetter ?? s2Target.letter,
              targetLetterName: s2Target.name,
              allOptions: selectionOptionsRef.current[s2Key] || [],
              userSelected: s2Result?.userSelected ?? null,
              isCorrect: s2Result?.isCorrect ?? false,
            },
          ],
        };
      });

      return {
        type: "huroof-tahajji-find-letter-bulk",
        lessonType: "find-letter",
        sessions,
        completed,
      };
    },
    [SESSION_LETTERS],
  );

  // ═══════════════════════════════════════════════════════════
  //  🎨 RENDER CARD
  // ═══════════════════════════════════════════════════════════

  const renderCard = (opt: string, index: number) => {
    const isSelected = selected === opt;
    const bgColor = isSelected ? ROYAL_BLUE : "transparent";
    const borderColor = isSelected ? "#FFFFFF" : ROYAL_BLUE;
    const textColor = isSelected ? "#FFFFFF" : ROYAL_BLUE;
    const shadowColor = isSelected ? ROYAL_BLUE_SHADOW : "transparent";

    const isShortLetter = SHORT_LETTERS.includes(opt);
    const isLaam = opt === LAAM_LETTER;
    const isToeZoe = TOE_ZOE_LETTERS.includes(opt);
    const isAlifMadda = opt === ALIF_MADDA;

    const fontSize = isShortLetter
      ? "min(20vh, 150px)"
      : isLaam
        ? "min(10vh, 75px)"
        : isToeZoe
          ? "min(18vh, 135px)"
          : isAlifMadda
            ? "min(16vh, 125px)"
            : "min(13vh, 100px)";

    const upNudge = UP_NUDGE_MARGIN[opt] ?? "0";

    const bounceClass = resetKey > 0 ? "aflb-reset-bounce" : "aflb-pop-in";
    const cardSelectClass = isSelected ? "aflb-card-select" : "";
    const isDisabled = isLocked || isChecking || transitionPhase !== "idle" || isGameComplete();

    let cursorClass = "cursor-pointer";
    if (isDisabled) cursorClass = "cursor-not-allowed";
    else if (isSelected) cursorClass = "cursor-default";

    return (
      <button
        key={`${opt}-${resetKey}`}
        type="button"
        onClick={() => handleCardClick(opt)}
        disabled={isDisabled}
        className={`${bounceClass} ${cardSelectClass} clay-sm relative flex items-center justify-center rounded-3xl border-4 transition-all duration-200 ${cursorClass} ${isDisabled && !isSelected ? "opacity-60" : ""}`}
        style={{
          ["--clay-shadow" as string]: shadowColor,
          width: "180px",
          height: "180px",
          overflow: "visible",
          backgroundColor: bgColor,
          borderStyle: "solid",
          borderWidth: "4px",
          borderColor: borderColor,
        }}
      >
        <div className="pointer-events-none flex items-center justify-center" style={{ width: "85%", height: "85%", overflow: "visible" }}>
          <span
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: textColor,
              textShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.25)" : "0 2px 8px rgba(65, 105, 225, 0.15)",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
              marginBottom: upNudge,
              overflow: "visible",
              transition: "color 0.2s ease",
            }}
          >
            {opt}
          </span>
        </div>
      </button>
    );
  };

  const getContainerClass = () => {
    if (transitionPhase === "fade-out") return "aflb-fade-out";
    if (transitionPhase === "fade-in") return "aflb-fade-in";
    return "";
  };

  const canUndo = undoStack.length > 0 && selected !== null;
  const canRedo = redoStack.length > 0 && selected === null;
  const canClear = selected !== null;
  const canCheck = selected !== null;
  const isTransitioning = transitionPhase !== "idle";

  return (
    <div className={`relative flex h-full w-full select-none items-stretch gap-2 p-4 ${getContainerClass()}`}>
      <style>{GAME_CSS}</style>
      <style>{FONT_CSS}</style>

      {showLockOverlay && <div className="aflb-lock-overlay aflb-lock-overlay-enter" />}

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onCheck={handleCheck}
        canUndo={canUndo}
        canRedo={canRedo}
        canClear={canClear}
        canCheck={canCheck}
        isTransitioning={isTransitioning}
      />

      <div
        dir="rtl"
        className="relative flex flex-1 select-none flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cloud p-6"
      >
        <div className={`flex flex-wrap items-center justify-center gap-3 max-w-4xl w-full ${isChecking ? "pointer-events-none" : ""}`}>
          {options.map((opt, index) => renderCard(opt, index))}
        </div>
      </div>
    </div>
  );
}

export default HuroofETahajjiFindLetterBulkBase;