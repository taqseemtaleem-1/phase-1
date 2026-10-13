// src/components/games/Urdu/Huroof-e-Tahajji-Assessment/HuroofETahajjiDragCorrectLetterBulkBase.tsx
// ✅ Urdu version — Drag Correct Letter (MULTI-SESSION, one letter per session)
// 🎵 Per-session intro audio from: src/assets/Huroof-e-Tahajji-Drag Correct Letter Audios/{1-40}.wav
// 🔥 SAME UI as NumbersDragCorrectNumberBulkBase + LEFT TOOLBAR
// 🔥 ONE letter per session, sessions run in order
// ✅ FULLY SILENT — no correct/wrong visual feedback anywhere
// ✅ LEFT TOOLBAR: Undo / Redo / Eraser / Check
// ✅ Check button dabane tak next session nahi
// 🔓 NO LOCK — board interactive from frame 1
// ✅ On last session complete → /levels popup
// 💾 SUMMARY — simple per-letter status (Correct/Wrong/Missed)
// 🔥 UPDATED: Check activates on ANY drop (correct OR wrong) — no feedback shown

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

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";

// ═══════════════════════════════════════════════════════════════
//  🎵 INTRO AUDIOS — Urdu letters 1-40
// ═══════════════════════════════════════════════════════════════

const URDU_DRAG_INTRO_MODULES = import.meta.glob<string>(
  "/src/assets/Huroof-e-Tahajji-Drag Correct Letter Audios/Letter (*).wav",
  { eager: true, query: "?url", import: "default" },
);

function buildUrduDragIntroMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, url] of Object.entries(URDU_DRAG_INTRO_MODULES)) {
    const filename = path.split("/").pop() || "";
    const match = filename.match(/^Letter\s*\((\d+)\)\.wav$/i);
    if (match) map[match[1]] = url;
  }
  return map;
}

const URDU_DRAG_INTRO: Record<string, string> = buildUrduDragIntroMap();

// 🔥 Letter → audio number mapping (Urdu alphabet order, 1-40)
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
//  🔤 URDU LETTER NAMES — for summary
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
//  📝 SUMMARY BUILDER — simple per-letter status
// ═══════════════════════════════════════════════════════════════

interface LetterResult {
  letter: string;
  result: 'correct' | 'wrong' | 'missed';
}

function buildFullSummary(
  studentName: string,
  sessionLetters: string[],
  letterResults: Record<string, LetterResult>,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Drag Correct Letter lesson.`;
  }

  const lines: string[] = [];
  for (const letter of sessionLetters) {
    const r = letterResults[letter];
    let status: string;
    if (!r) status = 'Missed';
    else if (r.result === 'correct') status = 'Correct';
    else if (r.result === 'wrong') status = 'Wrong';
    else status = 'Missed';

    lines.push(`Letter ${getLetterLabel(letter)} - ${status}`);
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  🔥 DISTRACTORS MAP
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

const ROYAL_BLUE = "#4169E1";

// ═══════════════════════════════════════════════════════════════
//  🎨 SUBJECT COLORS
// ═══════════════════════════════════════════════════════════════
function getSubjectColor(subject: string = "urdu") {
  const colors: Record<string, { cardBg: string; cardShadow: string; emptyBoxBorder: string }> = {
    urdu: { cardBg: "#CC6B2C", cardShadow: "oklch(0.4 0.18 40 / 0.85)", emptyBoxBorder: "#CC6B2C" },
    english: { cardBg: "#4D82F6", cardShadow: "oklch(0.35 0.18 260 / 0.85)", emptyBoxBorder: "#4D82F6" },
    math: { cardBg: "#2E8B57", cardShadow: "oklch(0.32 0.18 148 / 0.85)", emptyBoxBorder: "#2E8B57" },
  };
  return colors[subject] || colors.urdu;
}

// ═══════════════════════════════════════════════════════════════
//  🔤 FONT + CSS
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

const GAME_CSS = `
  @keyframes udb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes udb-drop-success {
    0%   { transform: scale(0.85); }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes udb-target-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(204, 107, 44, 0);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(204, 107, 44, 0.15);
      transform: scale(1.02);
    }
  }
  @keyframes udb-card-reappear {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes udb-session-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes udb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes udb-tool-pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }

  .udb-pop-in { animation: udb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .udb-drop-success { animation: udb-drop-success 0.35s cubic-bezier(.34,1.4,.64,1) both; }
  .udb-target-pulse { animation: udb-target-pulse 1.8s ease-in-out infinite; }
  .udb-card-reappear { animation: udb-card-reappear 0.45s cubic-bezier(.34,1.4,.64,1) both; }
  .udb-session-fade-in { animation: udb-session-fade-in 0.3s ease-out both; }
  .udb-tool-pop { animation: udb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .udb-tool-pulse-red { animation: udb-tool-pulse-red 1.4s ease-out infinite; }

  .udb-card-hidden {
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

interface BoxSnapshot {
  matchedLetter: string | null;
  matchedCardId: string | null;
  isCorrect: boolean;
  cards: Array<{ id: string; letter: string; wasDropped: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
//  🧰 TOOLBAR
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
  onClick, disabled, active, danger, ariaLabel, children,
}: ToolButtonProps) {
  const base = "udb-tool-pop relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] transition-all duration-200 active:scale-95";
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
      className={`${base} ${style} ${danger && !disabled ? "udb-tool-pulse-red" : ""}`}
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
  onUndo, onRedo, onToggleRemove, onCheck,
  canUndo, canRedo, tool, hasBoxContent, canCheck,
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
        <ToolButton onClick={onCheck} active={canCheck} disabled={!canCheck} ariaLabel="Check">
          <Check className="h-5 w-5" strokeWidth={3} />
        </ToolButton>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HuroofETahajjiDragCorrectLetterBulkBase({
  letters, subject, level, lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const subjectColor = getSubjectColor(subject);

  const SESSION_LETTERS = useMemo(() => {
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

  const [sessionIndex, setSessionIndex] = useState(0);
  const [transitionKey, setTransitionKey] = useState(0);

  const [cards, setCards] = useState<Array<{ id: string; letter: string; wasDropped: boolean }>>([]);

  const [boxState, setBoxState] = useState<{
    matched: boolean;
    isCorrect: boolean;
    matchedLetter: string | null;
    matchedCardId: string | null;
  }>({
    matched: false,
    isCorrect: false,
    matchedLetter: null,
    matchedCardId: null,
  });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    letter: string | null;
    cardId: string | null;
    position: Point | null;
  }>({ isDragging: false, letter: null, cardId: null, position: null });

  const [hoveredBox, setHoveredBox] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [tool, setTool] = useState<"draw" | "remove">("draw");
  const [undoStack, setUndoStack] = useState<BoxSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BoxSnapshot[]>([]);

  const currentTarget = SESSION_LETTERS[sessionIndex] || "";

  // 🔥 UPDATED: Check activates on ANY drop (correct OR wrong) — silent feedback
  const canCheck = boxState.matched && boxState.matchedLetter !== null;
  const hasBoxContent = boxState.matched && boxState.matchedLetter !== null;

  const sessionStartTimeRef = useRef<number>(Date.now());
  const progressSavedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // 🔥 Per-letter results
  const letterResultsRef = useRef<Record<string, LetterResult>>({});

  const statsRef = useRef<SessionStats>(emptyStats());

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const introPlayedForSessionRef = useRef<number>(-1);

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

  const playIntroAudio = useCallback((targetLetter: string) => {
    stopAllAudio();
    const letterNum = LETTER_TO_NUMBER[targetLetter];
    if (!letterNum) return;
    const src = URDU_DRAG_INTRO[String(letterNum)];
    if (!src) return;

    try {
      const audio = new Audio(src);
      audioRefs.current.push(audio);
      const cleanup = () => {
        const idx = audioRefs.current.indexOf(audio);
        if (idx !== -1) audioRefs.current.splice(idx, 1);
        try { audio.onended = null; audio.onerror = null; } catch {}
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
    } catch {}
  }, [stopAllAudio]);

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

  const buildCards = useCallback((targetLetter: string) => {
    const distractors = URDU_DISTRACTORS_MAP[targetLetter] || ["ل", "م", "ن"];
    const picks = [targetLetter, distractors[0], distractors[1], distractors[2]];
    const shuffled = shuffleArray(picks);
    return shuffled.map((l, idx) => ({
      id: `card-${idx}-${l}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      letter: l,
      wasDropped: false,
    }));
  }, [shuffleArray]);

  // ══════════════════════════════════════════════════════════════
  //  🎬 START SESSION
  // ══════════════════════════════════════════════════════════════

  const startSession = useCallback(
    (index: number) => {
      const targetLetter = SESSION_LETTERS[index];
      if (!targetLetter) return;

      setSessionIndex(index);
      setCards(buildCards(targetLetter));
      setBoxState({ matched: false, isCorrect: false, matchedLetter: null, matchedCardId: null });
      setHoveredBox(false);
      setDragState({ isDragging: false, letter: null, cardId: null, position: null });
      setTool("draw");
      setUndoStack([]);
      setRedoStack([]);
      setTransitionKey((k) => k + 1);

      if (introPlayedForSessionRef.current !== index) {
        introPlayedForSessionRef.current = index;
        setTimeout(() => {
          if (isMountedRef.current) playIntroAudio(targetLetter);
        }, 300);
      }
    },
    [SESSION_LETTERS, buildCards, playIntroAudio],
  );

  // ══════════════════════════════════════════════════════════════
  //  🚀 INIT / UNMOUNT
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    progressSavedRef.current = false;
    completedRef.current = false;
    letterResultsRef.current = {};
    statsRef.current = emptyStats();
    statsRef.current.totalSessions = SESSION_LETTERS.length;
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

  const buildGameData = useCallback((completed: boolean) => {
    const stats = statsRef.current;
    const letterResults = Object.entries(letterResultsRef.current).map(([letter, r]) => ({
      letter,
      letterName: URDU_LETTER_NAMES[letter] || '',
      result: r.result,
    }));

    return {
      type: "huroof-tahajji-drag-correct-letter-bulk-sessions",
      lessonType: "drag-drop",
      sessionLetters: SESSION_LETTERS,
      totalSessions: SESSION_LETTERS.length,
      completedSessions: stats.completedSessions,
      letterResults,
      stats: { ...stats },
      completed,
    };
  }, [SESSION_LETTERS]);

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
    const summary = buildFullSummary(
      studentName,
      SESSION_LETTERS,
      letterResultsRef.current,
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
    } catch (err) {
      console.error("[UrduDragBulk] ❌ Final save failed:", err);
    }
  }, [SESSION_LETTERS, subject, level, lessonId, buildGameData]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;

    progressSavedRef.current = true;
    statsRef.current.timeSec = elapsed;

    const studentName = sessionData.student.studentName || "Student";

    // 🔥 NEW SUMMARY — partial
    const summary = buildFullSummary(
      studentName,
      SESSION_LETTERS,
      letterResultsRef.current,
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
    } catch (err) {
      console.warn("[UrduDragBulk] ⚠️ Partial save failed:", err);
    }
  }, [SESSION_LETTERS, subject, level, lessonId, buildGameData]);

  const savePartialProgressRef = useRef(savePartialProgress);
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // ══════════════════════════════════════════════════════════════
  //  ✅ CHECK BUTTON
  // ══════════════════════════════════════════════════════════════

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    if (isTransitioning) return;

    // 🔥 Record result based on boxState.isCorrect (silently)
    letterResultsRef.current[currentTarget] = {
      letter: currentTarget,
      result: boxState.isCorrect ? 'correct' : 'wrong',
    };
    statsRef.current.completedSessions += 1;

    setIsTransitioning(true);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      const nextIndex = sessionIndex + 1;

      if (nextIndex >= SESSION_LETTERS.length) {
        completedRef.current = true;
        saveFinalProgress().then(() => {
          navigateTimerRef.current = setTimeout(() => {
            navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
          }, 500);
        });
      } else {
        startSession(nextIndex);
      }
    }, 400);
  }, [
    canCheck,
    isTransitioning,
    sessionIndex,
    currentTarget,
    boxState.isCorrect,
    SESSION_LETTERS.length,
    startSession,
    saveFinalProgress,
    navigate,
    subject,
    level,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  ↩️ UNDO / REDO / ERASER
  // ══════════════════════════════════════════════════════════════

  const captureSnapshot = useCallback((): BoxSnapshot => ({
    matchedLetter: boxState.matchedLetter,
    matchedCardId: boxState.matchedCardId,
    isCorrect: boxState.isCorrect,
    cards: cards.map((c) => ({ ...c })),
  }), [boxState, cards]);

  const applySnapshot = useCallback((snap: BoxSnapshot) => {
    setBoxState({
      matched: snap.matchedLetter !== null,
      isCorrect: snap.isCorrect,
      matchedLetter: snap.matchedLetter,
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

  const handleEraser = useCallback(() => {
    if (!hasBoxContent) return;
    statsRef.current.eraserActivations += 1;
    const snap = captureSnapshot();
    setUndoStack((s) => [...s, snap]);
    setRedoStack([]);
    setBoxState({ matched: false, isCorrect: false, matchedLetter: null, matchedCardId: null });
    setCards((prev) =>
      prev.map((c) => c.id === boxState.matchedCardId ? { ...c, wasDropped: false } : c),
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
    (e: React.PointerEvent | PointerEvent): Point => ({ x: e.clientX - 50, y: e.clientY - 50 }),
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, card: { id: string; letter: string; wasDropped: boolean }) => {
      if (isTransitioning) return;
      if (boxState.matched) return;
      if (dragState.isDragging) return;
      if (card.wasDropped) return;

      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: true,
        letter: card.letter,
        cardId: card.id,
        position: getPointerPosition(e),
      });
    },
    [isTransitioning, boxState.matched, dragState.isDragging, getPointerPosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter) return;
      e.preventDefault();
      setDragState((prev) => ({ ...prev, position: getPointerPosition(e) }));

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
    [dragState.isDragging, dragState.letter, boxState.matched, getPointerPosition],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging || !dragState.letter || !dragState.cardId) {
        setDragState({ isDragging: false, letter: null, cardId: null, position: null });
        setHoveredBox(false);
        return;
      }

      const droppedCardId = dragState.cardId;
      const droppedLetter = dragState.letter;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const target = currentTarget;

      setDragState({ isDragging: false, letter: null, cardId: null, position: null });
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

      const preSnap = captureSnapshot();
      setUndoStack((s) => [...s, preSnap]);
      setRedoStack([]);

      const isCorrect = droppedLetter === target;
      statsRef.current.totalAttempts += 1;
      if (isCorrect) statsRef.current.correctDrops += 1;
      else statsRef.current.wrongDrops += 1;

      // 🔥 Record result silently (correct overwrites, wrong only if not already correct)
      if (isCorrect) {
        letterResultsRef.current[target] = { letter: target, result: 'correct' };
      } else if (!letterResultsRef.current[target] || letterResultsRef.current[target].result !== 'correct') {
        letterResultsRef.current[target] = { letter: target, result: 'wrong' };
      }

      setBoxState({
        matched: true,
        isCorrect,
        matchedLetter: droppedLetter,
        matchedCardId: droppedCardId,
      });

      setCards((prev) =>
        prev.map((c) => c.id === droppedCardId ? { ...c, wasDropped: true } : c),
      );
    },
    [dragState, currentTarget, boxState.matched, captureSnapshot],
  );

  // ══════════════════════════════════════════════════════════════
  //  🎨 RENDER HELPERS
  // ══════════════════════════════════════════════════════════════

  const getBoxFontSize = useCallback(() => {
    return `clamp(1.6rem, 14vh, 200px)`;
  }, []);

  const getSmallFontSize = useCallback(() => {
    const count = Math.max(cards.length, 1);
    const scale =
      count <= 4 ? 1.15 :
      count === 5 ? 1.05 :
      count === 6 ? 0.95 : 0.82;
    const vh = 12 * scale;
    const px = 170 * scale;
    return `clamp(1.5rem, ${vh}vh, ${px}px)`;
  }, [cards.length]);

  // 🔥 SILENT BOX — same look whether correct or wrong
  const renderBox = () => {
    const isFilled = boxState.matched;
    const isHovered = hoveredBox && dragState.isDragging && !isFilled;
    const displayLetter = boxState.matchedLetter || "";
    const fontSize = getBoxFontSize();

    let bgColor = "transparent";
    let borderColor = subjectColor.emptyBoxBorder;
    let textColor = "#FFFFFF";
    let shadowColor = "rgba(0,0,0,0.05)";
    let scaleClass = "";

    if (isFilled) {
      // 🔥 Same neutral blue whether correct or wrong — silent
      bgColor = ROYAL_BLUE;
      borderColor = "#FFFFFF";
      textColor = "#FFFFFF";
      shadowColor = "oklch(0.4 0.18 260 / 0.9)";
      scaleClass = "udb-drop-success";
    } else if (isHovered) {
      borderColor = subjectColor.cardBg;
      shadowColor = "rgba(204, 107, 44, 0.3)";
      scaleClass = "udb-target-pulse";
    } else {
      scaleClass = "udb-target-pulse";
      shadowColor = "rgba(204, 107, 44, 0.15)";
    }

    return (
      <div
        data-box
        className={`udb-pop-in clay-sm relative flex w-full flex-col items-center justify-center rounded-2xl border-4 transition-all duration-200 ${scaleClass}`}
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
        {displayLetter && (
          <span
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
              fontWeight: 400,
              fontSize,
              color: textColor,
              textShadow: "0 2px 8px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.4,
              maxWidth: "100%",
              maxHeight: "100%",
              transform: "translateY(-8%)",
            }}
          >
            {displayLetter}
          </span>
        )}
      </div>
    );
  };

  const renderSmallCard = (card: { id: string; letter: string; wasDropped: boolean }, index: number) => {
    const isDraggingThis = dragState.cardId === card.id && dragState.isDragging;
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
          ${isDropped ? "udb-card-hidden" : "udb-card-reappear"}
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
        onPointerDown={(e) => !isDisabled && !isDraggingThis && !isDropped && handlePointerDown(e, card)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!isDraggingThis && !isDropped && (
          <span
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: fontSize,
              color: ROYAL_BLUE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.6,
              maxWidth: "100%",
              overflow: "visible",
            }}
          >
            {card.letter}
          </span>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  🖼️ RENDER
  // ══════════════════════════════════════════════════════════════

  if (SESSION_LETTERS.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <style>{GAME_CSS}</style>
        <style>{FONT_CSS}</style>
        <p className="text-lg text-slate-500">No letters configured.</p>
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

      <div
        dir="rtl"
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-4 border-white bg-cloud px-4 py-6"
        style={{ touchAction: "none" }}
      >
        <div
          key={`box-session-${sessionIndex}-${transitionKey}`}
          className="udb-session-fade-in flex w-full flex-1 items-center justify-center px-6 sm:px-10 md:px-14"
        >
          <div
            className="grid place-items-center"
            style={{ gridTemplateColumns: "1fr", width: "min(100%, 220px)" }}
          >
            {renderBox()}
          </div>
        </div>

        <div
          key={`cards-session-${sessionIndex}-${transitionKey}`}
          className="udb-session-fade-in flex w-full items-center justify-center pb-4"
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

      {dragState.isDragging && dragState.letter && dragState.position && (
        <span
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: dragState.position.x,
            top: dragState.position.y,
            fontFamily: "'Noto Nastaliq Urdu', 'Andika', 'Fredoka', system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(4rem, 14vh, 8rem)",
            color: ROYAL_BLUE,
            lineHeight: 1.4,
            transform: "translate(-50%, -50%) scale(1.15) rotate(-3deg)",
            textShadow: "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.05)",
            transition: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            overflow: "visible",
          }}
        >
          {dragState.letter}
        </span>
      )}
    </div>
  );
}

export default HuroofETahajjiDragCorrectLetterBulkBase;