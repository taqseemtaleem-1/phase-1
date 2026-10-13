// src/components/games/Math/Numbers-Assessment/NumbersWriteLetterBulkBase.tsx
// ✅ Math version of HuroofETahajjiWriteLetterBulkBase
// ✅ Bulk write-letter — Numbers version
// 🎵 Intro audio plays ONCE on lesson start (no lock, fire-and-forget)
//    • Level 21 → [1, 2, 3, 4]  → 4 sessions
//    • Level 22 → [5, 6, 7, 8]  → 4 sessions
//    • Level 23 → [9, 0]        → 2 sessions
// 🖊️ 2 BOXES per session (LTR: LEFT = Guide/Locked, RIGHT = Practice/Draw)
// 📏 NO GREY LINES — clean white boxes
// 🔤 FONT-BASED guide numbers (Andika) — RED color — ONLY LEFT box
// 🔒 LEFT box (with number) → LOCKED (no drawing)
// ✏️ RIGHT box (blank) → DRAW ALLOWED
// 🎯 SIMPLE 2-VALUE CONFIG PER NUMBER: { size, y }
// 🖊️ THICK STROKE + THICK ERASER
// 📸 CLEAN MANUAL CANVAS CAPTURE — no html-to-image
// 🔧 Toolbar on LEFT side
// 📝 Summary: Simple "Written/Missed" per-number pattern
// 🚀 NO saving popup — silent fast flow
// ➡️ Final action → next lesson navigate

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser } from 'lucide-react';

// 🔥 Progress sync
import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// 🔥 Storage upload
import { uploadFaintTraceCapture } from '@/lib/supabase';

// 🔤 Andika Font — used for the RED guide number (Math standard)
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🎵 Intro audio — plays ONCE on lesson start
const introAudio = "/assets/Math Assets/Numbers WriteLetter/intro.wav";

// ══════════════════════════════════════════════════════════════
//  🔤 GUIDE NUMBER CONFIG — SIMPLE 2-VALUE SYSTEM
// ══════════════════════════════════════════════════════════════

const BASE_GUIDE_FONT_SIZE = 'clamp(6rem, 18vh, 14rem)';
const BASE_GUIDE_LINE_HEIGHT = 1.2;

interface NumberConfig {
  size: number;
  y: number;
}

const DEFAULT_NUMBER: NumberConfig = { size: 1.0, y: 0 };

const NUMBER_CONFIG: Record<string, NumberConfig> = {
  '0': { size: 2.5, y: -0.05 },
  '1': { size: 2.2, y: -0.02 },
  '2': { size: 2.4, y: -0.05 },
  '3': { size: 2.4, y: -0.05 },
  '4': { size: 2.5, y: -0.05 },
  '5': { size: 2.4, y: -0.05 },
  '6': { size: 2.5, y: -0.05 },
  '7': { size: 2.4, y: -0.02 },
  '8': { size: 2.5, y: -0.05 },
  '9': { size: 2.5, y: -0.05 },
};

function getNumberConfig(num: string): NumberConfig {
  return NUMBER_CONFIG[num] ?? DEFAULT_NUMBER;
}

function buildFontSize(multiplier: number): string {
  if (multiplier === 1.0) return BASE_GUIDE_FONT_SIZE;
  return `calc(${BASE_GUIDE_FONT_SIZE} * ${multiplier})`;
}

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const BOX_BORDER_COLOR = '#2E8B57';
const BOX_BORDER_WIDTH = 4;

const GUIDE_NUMBER_COLOR = '#E30613';

const STROKE_MIN_PX = 16;
const STROKE_SLOT_RATIO = 0.045;
const ERASER_MULTIPLIER = 2.0;

const SWATCHES = [
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'red', color: '#e30613', label: 'Red' },
  { id: 'green', color: '#1aa64b', label: 'Green' },
  { id: 'blue', color: '#1e4dd8', label: 'Blue' },
];

type Tool = { kind: 'pen'; color: string } | { kind: 'eraser' };

interface Props {
  letters: string[];
  subject: string;
  level: number;
  lessonId: number;
}

interface SlotState {
  isCompleted: boolean;
}

interface BoxSlot {
  id: number;
  label: string;
  rect: { x: number; y: number; width: number; height: number };
  isWriteBox: boolean;
  isGuideBox: boolean;
}

// ══════════════════════════════════════════════════════════════
//  BOX LAYOUT
// ══════════════════════════════════════════════════════════════

function calculateBoxLayout(boardWidth: number, boardHeight: number): BoxSlot[] {
  const padding = 30;
  const gap = 30;
  const topPadding = 0;

  const totalWidth = boardWidth - padding * 2;
  const boxWidth = (totalWidth - gap) / 2;
  const boxHeight = boardHeight - padding * 2 - topPadding - 30;

  const slots: BoxSlot[] = [];

  slots.push({
    id: 0,
    label: 'Guide',
    rect: {
      x: padding,
      y: padding + topPadding,
      width: boxWidth,
      height: boxHeight,
    },
    isWriteBox: false,
    isGuideBox: true,
  });

  slots.push({
    id: 1,
    label: 'Write',
    rect: {
      x: padding + boxWidth + gap,
      y: padding + topPadding,
      width: boxWidth,
      height: boxHeight,
    },
    isWriteBox: true,
    isGuideBox: false,
  });

  return slots;
}

// ══════════════════════════════════════════════════════════════
//  🔥 CLEAN MANUAL CANVAS CAPTURE
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  boxSlots: BoxSlot[];
  guideText: string;
  guideFontSize: string;
  guideTransform: string;
  inkCanvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

async function composeCleanWriteCapture(params: CaptureParams): Promise<string | null> {
  const {
    boardWidth,
    boardHeight,
    boxSlots,
    guideText,
    guideFontSize,
    guideTransform,
    inkCanvasRefs,
    dpr,
  } = params;

  try {
    const scale = Math.max(2, dpr) * 1.5;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(boardWidth * scale);
    canvas.height = Math.round(boardHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // For each box
    for (const slot of boxSlots) {
      const x = slot.rect.x * scale;
      const y = slot.rect.y * scale;
      const w = slot.rect.width * scale;
      const h = slot.rect.height * scale;

      // Box background (white with slight transparency look)
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const radius = 16 * scale;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Guide number (left box only) — manual text rendering
      if (slot.isGuideBox && guideText) {
        ctx.save();
        ctx.fillStyle = GUIDE_NUMBER_COLOR;

        // Extract numeric multiplier from fontSize (e.g., "calc(clamp(...) * 2.5)")
        // We'll use a base font size and multiply by ratio
        // The fontSize string has multiplier embedded — we compute equivalent in pixels
        const baseFontPx = h * 0.75; // approximate: boxHeight * 0.75
        // Extract multiplier from NUMBER_CONFIG — it's baked into the string
        // Simplest: just draw at baseFontPx * (some scaling). But we don't have it here.
        // Instead: measure using a temporary span
        // Actually — simpler approach: draw using a fixed reference and scale via transform

        // Use textAlign/vertical centering
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Since guideFontSize is a CSS string we can't easily parse,
        // we approximate: draw the guide at (boxHeight * 0.85) font size,
        // which visually matches the on-screen guide.
        // Note: this is a visual approximation for capture only.
        const approximateFontPx = h * 0.85;

        // Parse transform Y offset from guideTransform (e.g., "translateY(-0.05em)")
        let yOffsetFactor = 0;
        const match = guideTransform.match(/translateY\((-?[\d.]+)em\)/);
        if (match) {
          yOffsetFactor = parseFloat(match[1]);
        }
        const yOffset = yOffsetFactor * approximateFontPx;

        ctx.font = `400 ${approximateFontPx}px 'Andika', system-ui, sans-serif`;
        ctx.fillText(guideText, x + w / 2, y + h / 2 + yOffset);
        ctx.restore();
      }

      // Ink (user drawing)
      const inkCanvas = inkCanvasRefs.current[slot.id];
      if (inkCanvas) {
        ctx.save();
        ctx.drawImage(
          inkCanvas,
          0,
          0,
          inkCanvas.width,
          inkCanvas.height,
          x,
          y,
          w,
          h,
        );
        ctx.restore();
      }

      // Border (on top)
      ctx.save();
      ctx.strokeStyle = BOX_BORDER_COLOR;
      ctx.lineWidth = BOX_BORDER_WIDTH * scale;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Export as PNG (lossless)
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[MathWriteLetterBulk] PNG export failed');
      return null;
    }

    return dataUrl;
  } catch (err) {
    console.error('[MathWriteLetterBulk] composeCleanWriteCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  📝 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

function buildSummary(
  studentName: string,
  numbers: string[],
  captureUrls: Record<number, string | null>,
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Write Number lesson.`;
  }

  const header = `${studentName} completed the Write Number lesson.`;

  const lines: string[] = [];
  numbers.forEach((num, idx) => {
    const url = captureUrls[idx];
    const status = url ? 'Written' : 'Missed';
    lines.push(`Number ${num} - ${status}`);
  });

  return `${header}\n\n${lines.join('\n')}`;
}

// ══════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════

const FONT_CSS = `
  @font-face {
    font-family: 'Andika';
    src: url('${andikaFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;

const ANIMATION_CSS = `
  @keyframes nwlb-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes nwlb-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes nwlb-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes nwlb-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .nwlb-pop-in { animation: nwlb-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .nwlb-tool-pop { animation: nwlb-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .nwlb-fade-out { animation: nwlb-fade-out 0.3s ease-out both; }
  .nwlb-fade-in { animation: nwlb-fade-in 0.4s ease-out both; }

  .nwlb-guide-number {
    font-family: 'Andika', 'Fredoka', 'Baloo 2', system-ui, sans-serif;
    font-weight: 400;
    font-style: normal;
    color: ${GUIDE_NUMBER_COLOR};
    display: inline-block;
    text-shadow: none;
    letter-spacing: 0.02em;
    user-select: none;
    pointer-events: none;
    overflow: visible;
    white-space: nowrap;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
`;

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function NumbersWriteLetterBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);

  // 🔥 Clean numbers (dedup, max 4)
  const cleanNumbers = useMemo(() => {
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

  const totalSessions = cleanNumbers.length;

  const [sessionIndex, setSessionIndex] = useState(0);
  const currentNumber = cleanNumbers[sessionIndex] || '1';

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade-out' | 'fade-in'>('idle');

  const [tool, setTool] = useState<Tool>({ kind: 'pen', color: '#1a1a1a' });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const [boxSlots, setBoxSlots] = useState<BoxSlot[]>([]);

  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [slotHasInk, setSlotHasInk] = useState<Record<number, boolean>>({});

  const [isNavigating, setIsNavigating] = useState(false);
  const isCheckingRef = useRef<boolean>(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inkCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  // 🔥 Capture URLs per session
  const captureUrlsRef = useRef<Record<number, string | null>>({});

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  // 🎵 Intro audio refs
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const numberConfig = useMemo(
    () => getNumberConfig(currentNumber),
    [currentNumber],
  );

  const guideFontSize = useMemo(
    () => buildFontSize(numberConfig.size),
    [numberConfig.size],
  );

  const guideTransform = useMemo(
    () => `translateY(${numberConfig.y}em)`,
    [numberConfig.y],
  );

  const getStrokeWidth = useCallback((slotId: number): number => {
    const slot = boxSlots.find((s) => s.id === slotId);
    if (!slot) return Math.max(STROKE_MIN_PX, boardSize.height * 0.02) * dpr;
    const slotHeight = slot.rect.height;
    const base = Math.max(STROKE_MIN_PX, slotHeight * STROKE_SLOT_RATIO);
    return base * dpr;
  }, [boxSlots, boardSize.height, dpr]);

  // ══════════════════════════════════════════════════════════════
  //  🎵 INTRO AUDIO
  // ══════════════════════════════════════════════════════════════

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

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const rect = board.getBoundingClientRect();
      const newDpr = window.devicePixelRatio || 1;
      setBoardSize({ width: rect.width, height: rect.height });
      setDpr(newDpr);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (boardSize.width === 0 || boardSize.height === 0) return;
    const slots = calculateBoxLayout(boardSize.width, boardSize.height);
    setBoxSlots(slots);
  }, [boardSize]);

  // CANVAS SETUP
  useEffect(() => {
    if (boxSlots.length === 0) return;

    const newSlotStates: Record<number, SlotState> = {};
    const newHasInk: Record<number, boolean> = {};

    boxSlots.forEach((slot) => {
      const pixelWidth = Math.max(1, Math.round(slot.rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(slot.rect.height * dpr));

      const inkCanvas = inkCanvasRefs.current[slot.id];
      if (inkCanvas) {
        inkCanvas.width = pixelWidth;
        inkCanvas.height = pixelHeight;
        inkCanvas.style.width = `${slot.rect.width}px`;
        inkCanvas.style.height = `${slot.rect.height}px`;

        const ctx = inkCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, pixelWidth, pixelHeight);
        }
      }

      newSlotStates[slot.id] = { isCompleted: false };
      newHasInk[slot.id] = false;
    });

    setSlotStates(newSlotStates);
    setSlotHasInk(newHasInk);
  }, [boxSlots, dpr, sessionIndex]);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const applyStroke = useCallback(
    (ctx: CanvasRenderingContext2D, slotId: number) => {
      const strokeWidth = getStrokeWidth(slotId);
      if (tool.kind === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = strokeWidth * ERASER_MULTIPLIER;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = strokeWidth;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    },
    [tool, getStrokeWidth],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, slotId: number) => {
      const slot = boxSlots.find((s) => s.id === slotId);
      if (!slot?.isWriteBox) return;

      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);

      setIsDrawing(true);
      setLastPoint(point);
      setSlotHasInk((prev) => ({ ...prev, [slotId]: true }));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      applyStroke(ctx, slotId);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.01, point.y + 0.01);
      ctx.stroke();

      canvas.setPointerCapture(e.pointerId);
    },
    [slotStates, getCanvasPoint, applyStroke, boxSlots],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, slotId: number) => {
      if (!isDrawing) return;
      const slot = boxSlots.find((s) => s.id === slotId);
      if (!slot?.isWriteBox) return;

      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);
      if (!lastPoint) return;

      setSlotHasInk((prev) => (prev[slotId] ? prev : { ...prev, [slotId]: true }));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      applyStroke(ctx, slotId);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
    },
    [isDrawing, slotStates, getCanvasPoint, lastPoint, applyStroke, boxSlots],
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  SAVE FINAL PROGRESS
  // ══════════════════════════════════════════════════════════════

  const saveFinalProgress = useCallback(async () => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) {
      console.warn('[MathWriteLetterBulk] No session — cannot save');
      return;
    }

    const studentName = sessionData.student.studentName || 'Student';

    const captures: Array<{ number: string; url: string | null }> =
      cleanNumbers.map((num, idx) => ({
        number: num,
        url: captureUrlsRef.current[idx] ?? null,
      }));

    const summary = buildSummary(
      studentName,
      cleanNumbers,
      captureUrlsRef.current,
      true,
    );

    try {
      await saveProgress({
        studentId: sessionData.student.studentId,
        deviceToken: sessionData.student.token,
        subject,
        level,
        lessonId,
        status: 'completed',
        timeSpentSec: elapsed,
        summary,
        gameData: {
          type: 'numbers-write-letter-bulk',
          lessonType: 'write-number',
          numbers: cleanNumbers,
          captures,
          totalSessions: cleanNumbers.length,
          completed: true,
        },
      });
      console.log('[MathWriteLetterBulk] ✅ Final progress saved');
    } catch (err) {
      console.error('[MathWriteLetterBulk] ❌ Final save failed:', err);
    }
  }, [cleanNumbers, subject, level, lessonId]);

  const savePartialProgress = useCallback(async () => {
    if (progressSavedRef.current) return;
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    if (elapsed < 1) return;
    progressSavedRef.current = true;

    const studentName = sessionData.student.studentName || 'Student';

    const captures: Array<{ number: string; url: string | null }> =
      cleanNumbers.map((num, idx) => ({
        number: num,
        url: captureUrlsRef.current[idx] ?? null,
      }));

    const summary = buildSummary(
      studentName,
      cleanNumbers,
      captureUrlsRef.current,
      false,
    );

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
        gameData: {
          type: 'numbers-write-letter-bulk',
          lessonType: 'write-number',
          numbers: cleanNumbers,
          captures,
          totalSessions: cleanNumbers.length,
          completed: false,
        },
      });
    } catch (err) {
      console.warn('[MathWriteLetterBulk] Partial save failed:', err);
    }
  }, [cleanNumbers, subject, level, lessonId]);

  // ══════════════════════════════════════════════════════════════
  //  CHECK — Clean manual capture + advance
  // ══════════════════════════════════════════════════════════════
  const checkAll = useCallback(async () => {
    if (isNavigating) return;
    if (isCheckingRef.current) return;

    const writeSlots = boxSlots.filter((s) => s.isWriteBox);
    const allHaveInk = writeSlots.length > 0 && writeSlots.every((s) => slotHasInk[s.id]);
    if (!allHaveInk) return;

    isCheckingRef.current = true;
    setIsNavigating(true);

    const newStates = { ...slotStates };
    boxSlots.forEach((slot) => {
      newStates[slot.id] = { ...newStates[slot.id], isCompleted: true };
    });
    setSlotStates(newStates);

    await new Promise((r) => setTimeout(r, 80));

    const currentSessionIndex = sessionIndex;

    try {
      // 🔥 CLEAN MANUAL CAPTURE
      let cleanDataUrl: string | null = null;
      if (boardSize.width > 0 && boardSize.height > 0) {
        cleanDataUrl = await composeCleanWriteCapture({
          boardWidth: boardSize.width,
          boardHeight: boardSize.height,
          boxSlots,
          guideText: currentNumber,
          guideFontSize,
          guideTransform,
          inkCanvasRefs,
          dpr,
        });
      }

      if (cleanDataUrl) {
        const sessionData = getSession();
        if (sessionData?.student) {
          try {
            const publicUrl = await uploadFaintTraceCapture(
              cleanDataUrl,
              sessionData.student.studentId,
              subject,
              level,
              lessonId,
              `number-${currentSessionIndex + 1}-${currentNumber}`,
            );

            if (publicUrl) {
              captureUrlsRef.current[currentSessionIndex] = publicUrl;
              console.log(
                `[MathWriteLetterBulk] ✅ Number ${currentSessionIndex + 1} (${currentNumber}) URL:`,
                publicUrl,
              );
            } else {
              console.error(
                `[MathWriteLetterBulk] ❌ Upload failed for number ${currentNumber}`,
              );
            }
          } catch (err) {
            console.error('[MathWriteLetterBulk] Upload error:', err);
          }
        }
      } else {
        console.error('[MathWriteLetterBulk] ❌ No capture to upload');
      }

      const isLastSession = currentSessionIndex >= totalSessions - 1;

      if (isLastSession) {
        await saveFinalProgress();
      }

      stopIntroAudio();

      if (isLastSession) {
        navigate({
          to: "/levels",
          search: { subject, level, openPopup: "true" },
        });
      } else {
        setTransitionPhase('fade-out');
        transitionTimerRef.current = setTimeout(() => {
          setSessionIndex((prev) => prev + 1);
          setTransitionPhase('fade-in');
          setIsNavigating(false);
          isCheckingRef.current = false;
          transitionTimerRef.current = setTimeout(() => {
            setTransitionPhase('idle');
          }, 500);
        }, 500);
      }
    } catch (err) {
      console.error('[MathWriteLetterBulk] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    isNavigating, boxSlots, slotStates, slotHasInk,
    sessionIndex, currentNumber, totalSessions,
    subject, level, lessonId, navigate, saveFinalProgress,
    boardSize, guideFontSize, guideTransform, dpr, stopIntroAudio,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;
    captureUrlsRef.current = {};

    // 🎵 Play intro ONCE on lesson start
    const introTimer = setTimeout(() => {
      playIntroAudio();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopIntroAudio();
      if (!completedRef.current && !progressSavedRef.current) {
        savePartialProgress();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swatchButton = (p: { id: string; color: string; label: string }) => {
    const isActive = activeColor === p.color;
    return (
      <button
        key={p.id}
        onClick={() => setTool({ kind: 'pen', color: p.color })}
        className={`nwlb-tool-pop relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
          isActive
            ? 'border-white ring-4 ring-yellow-400 shadow-lg'
            : 'border-white/50 hover:border-white shadow'
        }`}
        style={{
          backgroundColor: p.color,
          boxShadow: isActive
            ? '0 4px 12px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.15)',
        }}
        aria-label={`Pen color ${p.label}`}
      >
        {isActive && <Check className="h-3 w-3 text-white drop-shadow-md" strokeWidth={4} />}
      </button>
    );
  };

  const writeSlots = boxSlots.filter((s) => s.isWriteBox);
  const allHaveInk = writeSlots.length > 0 && writeSlots.every((s) => slotHasInk[s.id]);
  const isGameLocked = isNavigating;

  const getTransitionClass = () => {
    if (transitionPhase === 'fade-out') return 'nwlb-fade-out';
    if (transitionPhase === 'fade-in') return 'nwlb-fade-in';
    return '';
  };

  if (totalSessions === 0) {
    return (
      <div className="relative flex h-full w-full select-none flex-col items-center justify-center p-4">
        <style>{ANIMATION_CSS}</style>
        <style>{FONT_CSS}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="text-sm font-bold text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      className={`relative flex h-full w-full select-none flex-col ${getTransitionClass()}`}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      {/* LTR layout: toolbar LEFT, board RIGHT */}
      <div className="flex h-full w-full items-stretch" dir="ltr">
        {/* 🔧 Tools — LEFT side */}
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-r-3xl rounded-l-none border-b-[3px] border-r-[3px] border-t-0 border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)] md:w-16 md:gap-4 md:py-4">
            <button
              onClick={() => setTool({ kind: 'eraser' })}
              className={`nwlb-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                tool.kind === 'eraser'
                  ? 'border-white bg-pink-500 ring-4 ring-yellow-400 shadow-lg'
                  : 'border-white/60 bg-white hover:border-white shadow'
              }`}
              aria-label="Eraser"
            >
              <Eraser className={`h-5 w-5 ${tool.kind === 'eraser' ? 'text-white' : 'text-pink-500'}`} />
            </button>

            <div className="h-px w-10 bg-white/30 rounded-full" />

            <div className="flex flex-col items-center gap-2.5">
              {SWATCHES.map((p) => swatchButton(p))}
            </div>

            <div className="h-px w-10 bg-white/30 rounded-full" />

            <button
              onClick={checkAll}
              disabled={!allHaveInk || isGameLocked}
              className={`nwlb-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                allHaveInk && !isGameLocked
                  ? 'border-white bg-green-500 shadow-lg hover:bg-green-600'
                  : 'border-white/40 bg-gray-400 cursor-not-allowed opacity-60'
              }`}
              aria-label={allHaveInk ? 'Check' : 'Write in the write box first'}
              title={allHaveInk ? 'Check' : 'Write in the write box first'}
            >
              <Check className="h-5 w-5 text-white" strokeWidth={4} />
            </button>
          </div>
        </div>

        {/* Board */}
        <div
          ref={boardRef}
          dir="ltr"
          className="relative flex-1 overflow-hidden rounded-3xl border-b-4 border-l-4 border-r-4 border-white bg-transparent mt-6"
          style={{ touchAction: 'none' }}
        >
          {boxSlots.map((slot) => {
            const state = slotStates[slot.id];
            const isCompleted = state?.isCompleted || false;

            return (
              <div
                key={`box-${slot.id}`}
                className="absolute rounded-2xl overflow-hidden"
                style={{
                  left: slot.rect.x,
                  top: slot.rect.y,
                  width: slot.rect.width,
                  height: slot.rect.height,
                  opacity: isCompleted ? 0.5 : 1,
                  border: `${BOX_BORDER_WIDTH}px solid ${BOX_BORDER_COLOR}`,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                <div
                  dir="ltr"
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-extrabold tracking-wider"
                  style={{
                    color: BOX_BORDER_COLOR,
                    fontFamily: "'Andika', system-ui, sans-serif",
                  }}
                >
                  {slot.label}
                </div>

                {slot.isGuideBox && currentNumber && (
                  <div
                    dir="ltr"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <span
                      className="nwlb-guide-number"
                      style={{
                        fontSize: guideFontSize,
                        lineHeight: BASE_GUIDE_LINE_HEIGHT,
                        transform: guideTransform,
                      }}
                    >
                      {currentNumber}
                    </span>
                  </div>
                )}

                <canvas
                  ref={(el) => {
                    inkCanvasRefs.current[slot.id] = el;
                  }}
                  className="absolute inset-0 w-full h-full touch-none"
                  style={{
                    touchAction: 'none',
                    pointerEvents:
                      isCompleted || !slot.isWriteBox ? 'none' : 'auto',
                    zIndex: 3,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, slot.id)}
                  onPointerMove={(e) => handlePointerMove(e, slot.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NumbersWriteLetterBulkBase;