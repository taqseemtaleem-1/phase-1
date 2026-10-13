// src/components/games/Urdu/Huroof-e-Tahajji-WriteLetter/HuroofETahajjiWriteLetterBase.tsx
// ✅ Urdu version of AlphabetWriteLetterBase — RTL LAYOUT
// 🖊️ 2 BOXES on screen (RTL: LEFT = Write, RIGHT = Practice/Guide)
// 📸 CAPTURE MEIN SIRF 1 BOX (write box) — guide box bilkul nahi
// 📏 2 GREY LINES ONLY (top + bottom, no middle line)
// 🔤 FONT-BASED guide letters (Noto Nastaliq Urdu) — RED color
// 🖊️ THICK STROKE + THICK ERASER
// 📸 Capture → MANUAL CANVAS COMPOSITION → Supabase Storage
// 📝 Session-aware summary
// ❌ NO SAVING POPUP — silent background capture
// ❌ NO WAIT — direct capture

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser } from 'lucide-react';

import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';
import { uploadFaintTraceCapture } from '@/lib/supabase';

const notoFontUrl = "/assets/NotoNastaliq/NotoNastaliqUrdu-Regular.ttf";
const introAudio = "/assets/Huroof-e-Tahajji-WriteLetter Audio/intro.wav";

// ══════════════════════════════════════════════════════════════
//  🔤 GUIDE LETTER CONFIG
// ══════════════════════════════════════════════════════════════

const BASE_GUIDE_FONT_SIZE_VH = 18;
const BASE_GUIDE_LINE_HEIGHT = 1.4;

interface LetterConfig {
  size: number;
  y: number;
}

const DEFAULT_LETTER: LetterConfig = { size: 1.0, y: 0 };

const LETTER_CONFIG: Record<string, LetterConfig> = {
  'ا': { size: 3, y: -0.15 },
  'آ': { size: 2.5, y: -0.07 },
  'ب': { size: 2.5, y: -0.19 },
  'پ': { size: 1.9, y: -0.07 },
  'ت': { size: 2.5, y: -0.19 },
  'ٹ': { size: 2.5, y: -0.19 },
  'ث': { size: 2.5, y: -0.19 },
  'ج': { size: 2.2, y: -0.2 },
  'چ': { size: 2.2, y: -0.2 },
  'ح': { size: 2.2, y: -0.2 },
  'خ': { size: 2.1, y: -0.2 },
  'د': { size: 3, y: -0.3 },
  'ڈ': { size: 2.5, y: -0.23 },
  'ذ': { size: 3, y: -0.3 },
  'ر': { size: 3, y: -0.3 },
  'ڑ': { size: 2.5, y: -0.2 },
  'ز': { size: 3, y: -0.27 },
  'ژ': { size: 2.5, y: -0.2 },
  'س': { size: 2, y: -0.13 },
  'ش': { size: 2, y: -0.13 },
  'ص': { size: 2, y: -0.13 },
  'ض': { size: 2, y: -0.13 },
  'ط': { size: 3, y: -0.27 },
  'ظ': { size: 3, y: -0.27 },
  'ع': { size: 2, y: -0.12 },
  'غ': { size: 2, y: -0.12 },
  'ف': { size: 2, y: -0.06 },
  'ق': { size: 2, y: -0.12 },
  'ک': { size: 1.8, y: -0.0 },
  'گ': { size: 1.8, y: -0.0 },
  'ل': { size: 1.7, y: -0.01 },
  'م': { size: 1.6, y: -0.01 },
  'ن': { size: 2, y: -0.2 },
  'ں': { size: 2, y: -0.2 },
  'و': { size: 3, y: -0.3 },
  'ہ': { size: 3, y: -0.2 },
  'ھ': { size: 3, y: -0.26 },
  'ء': { size: 3, y: -0.2 },
  'ی': { size: 2, y: -0.2 },
  'ے': { size: 2, y: -0.06 },
};

function getLetterConfig(letter: string): LetterConfig {
  return LETTER_CONFIG[letter] ?? DEFAULT_LETTER;
}

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const BOX_BORDER_COLOR = '#CC6B2C';
const BOX_BORDER_WIDTH = 4;
const GUIDE_LETTER_COLOR = '#E30613';

const STROKE_MIN_PX = 16;
const STROKE_SLOT_RATIO = 0.045;
const ERASER_MULTIPLIER = 2.0;

const RULED_LINE_POSITIONS = {
  top: 0.22,
  bottom: 0.78,
};

const LINE_COLOR = '#9CA3AF';

const SWATCHES = [
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'red', color: '#e30613', label: 'Red' },
  { id: 'green', color: '#1aa64b', label: 'Green' },
  { id: 'blue', color: '#1e4dd8', label: 'Blue' },
];

type Tool = { kind: 'pen'; color: string } | { kind: 'eraser' };
type Session = 'letter1' | 'letter2';

interface Props {
  letter1: string;
  letter1Name?: string;
  letter2: string;
  letter2Name?: string;
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
}

// ══════════════════════════════════════════════════════════════
//  BOX LAYOUT (same for on-screen)
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
    label: 'لکھیں',
    rect: {
      x: padding,
      y: padding + topPadding,
      width: boxWidth,
      height: boxHeight,
    },
    isWriteBox: true,
  });

  slots.push({
    id: 1,
    label: 'دیکھیں',
    rect: {
      x: padding + boxWidth + gap,
      y: padding + topPadding,
      width: boxWidth,
      height: boxHeight,
    },
    isWriteBox: false,
  });

  return slots;
}

// ══════════════════════════════════════════════════════════════
//  SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

function buildWriteSummary(
  studentName: string,
  letter1: string,
  letter1Name: string,
  letter2: string,
  letter2Name: string,
  letter1Done: boolean,
  letter2Done: boolean,
): string {
  const l1 = letter1Name ? `'${letter1}' (${letter1Name})` : `'${letter1}'`;
  const l2 = letter2Name ? `'${letter2}' (${letter2Name})` : `'${letter2}'`;

  if (letter1Done && letter2Done) {
    return `${studentName} wrote both letters ${l1} and ${l2}.`;
  }
  if (letter1Done) {
    return `${studentName} wrote the letter ${l1}.`;
  }
  if (letter2Done) {
    return `${studentName} wrote the letter ${l2}.`;
  }
  return `${studentName} wrote the letters ${l1} and ${l2}.`;
}

// ══════════════════════════════════════════════════════════════
//  🔥 MANUAL CANVAS COMPOSITION
//     ✅ SIRF write box (wo box jisme ink thi) capture mein
//     ❌ Guide box BILKUL SHAAMIL NAHI
//     ✅ Write box: white bg + 2 grey lines + ink + orange border
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  writeBox: BoxSlot;    // sirf write box
  inkCanvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function composeCleanCapture(params: CaptureParams): Promise<string | null> {
  const {
    writeBox,
    inkCanvasRefs,
    dpr,
  } = params;

  try {
    const scale = Math.max(2, dpr) * 1.5;

    // 🔥 Sirf write box ke dimensions ka canvas banao
    //    (box ke andar ka area, plus border ke liye thoda margin)
    const borderMargin = 8; // padding around box for border visibility
    const boxW = writeBox.rect.width;
    const boxH = writeBox.rect.height;

    const canvasW = (boxW + borderMargin * 2) * scale;
    const canvasH = (boxH + borderMargin * 2) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(canvasW);
    canvas.height = Math.round(canvasH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // ─── 1. White background ───
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ─── 2. Write box ke andar ka content ───
    const x = borderMargin * scale;
    const y = borderMargin * scale;
    const w = boxW * scale;
    const h = boxH * scale;
    const radius = 16 * scale;

    // 2a. Box bg
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();

    // 2b. 2 grey ruled lines
    const linePositions = [
      RULED_LINE_POSITIONS.top,
      RULED_LINE_POSITIONS.bottom,
    ];
    const lineHeightPx = Math.max(2, h * 0.008);

    for (const pos of linePositions) {
      const ly = y + h * pos;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = LINE_COLOR;
      ctx.fillRect(x, ly, w, lineHeightPx);
      ctx.restore();
    }

    // 2c. Ink (student's writing) — from this box only
    const inkCanvas = inkCanvasRefs.current[writeBox.id];
    if (inkCanvas) {
      ctx.save();
      ctx.drawImage(
        inkCanvas,
        0, 0, inkCanvas.width, inkCanvas.height,
        x, y, w, h,
      );
      ctx.restore();
    }

    // 2d. Box border (rounded rect)
    ctx.save();
    ctx.strokeStyle = BOX_BORDER_COLOR;
    ctx.lineWidth = BOX_BORDER_WIDTH * scale;
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.stroke();
    ctx.restore();

    // ─── 3. Export PNG ───
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[UrduWriteLetter] PNG export failed');
      return null;
    }
    return dataUrl;
  } catch (err) {
    console.error('[UrduWriteLetter] composeCleanCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  CSS
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

const ANIMATION_CSS = `
  @keyframes uwl-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes uwl-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes uwl-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes uwl-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes uwl-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .uwl-pop-in { animation: uwl-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .uwl-overlay-enter { animation: uwl-overlay-in 0.15s ease-out both; }
  .uwl-tool-pop { animation: uwl-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .uwl-fade-out { animation: uwl-fade-out 0.3s ease-out both; }
  .uwl-fade-in { animation: uwl-fade-in 0.4s ease-out both; }
  .uwl-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }

  .uwl-guide-letter {
    font-family: 'Noto Nastaliq Urdu', system-ui, sans-serif;
    font-weight: 400;
    font-style: normal;
    color: ${GUIDE_LETTER_COLOR};
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

export function HuroofETahajjiWriteLetterBase({
  letter1,
  letter1Name,
  letter2,
  letter2Name,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const [session, setSession] = useState<Session>('letter1');
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
  const lineCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  const letter1CaptureUrlRef = useRef<string | null>(null);
  const letter2CaptureUrlRef = useRef<string | null>(null);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const currentLetter = session === 'letter1' ? letter1 : letter2;
  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const letterConfig = useMemo(
    () => getLetterConfig(currentLetter),
    [currentLetter],
  );

  const getStrokeWidth = useCallback((slotId: number): number => {
    const slot = boxSlots.find((s) => s.id === slotId);
    if (!slot) return Math.max(STROKE_MIN_PX, boardSize.height * 0.02) * dpr;
    const slotHeight = slot.rect.height;
    const base = Math.max(STROKE_MIN_PX, slotHeight * STROKE_SLOT_RATIO);
    return base * dpr;
  }, [boxSlots, boardSize.height, dpr]);

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
      audio.preload = 'auto';
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

  useEffect(() => {
    if (boxSlots.length === 0) return;

    const newSlotStates: Record<number, SlotState> = {};
    const newHasInk: Record<number, boolean> = {};

    boxSlots.forEach((slot) => {
      const pixelWidth = Math.max(1, Math.round(slot.rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(slot.rect.height * dpr));

      const lineCanvas = lineCanvasRefs.current[slot.id];
      if (lineCanvas) {
        lineCanvas.width = pixelWidth;
        lineCanvas.height = pixelHeight;
        lineCanvas.style.width = `${slot.rect.width}px`;
        lineCanvas.style.height = `${slot.rect.height}px`;

        const ctx = lineCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, pixelWidth, pixelHeight);

          const linePositions = [
            RULED_LINE_POSITIONS.top,
            RULED_LINE_POSITIONS.bottom,
          ];

          const lineHeight = Math.max(2, pixelHeight * 0.008);

          linePositions.forEach((position) => {
            const y = pixelHeight * position;
            ctx.beginPath();
            ctx.strokeStyle = LINE_COLOR;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = lineHeight;
            ctx.moveTo(0, y);
            ctx.lineTo(pixelWidth, y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          });
        }
      }

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
  }, [boxSlots, dpr, session]);

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

  const checkAll = useCallback(async () => {
    if (isNavigating) return;
    if (isCheckingRef.current) return;

    const writeSlots = boxSlots.filter((s) => s.isWriteBox);
    const allHaveInk = writeSlots.length > 0 && writeSlots.every((s) => slotHasInk[s.id]);
    if (!allHaveInk) return;

    isCheckingRef.current = true;
    setIsNavigating(true);

    stopIntroAudio();

    const newStates = { ...slotStates };
    boxSlots.forEach((slot) => {
      newStates[slot.id] = { ...newStates[slot.id], isCompleted: true };
    });
    setSlotStates(newStates);

    const currentSession = session;

    try {
      // 🔥 SIRF write box capture karo
      const writeBox = boxSlots.find((s) => s.isWriteBox);
      if (!writeBox) {
        console.error('[UrduWriteLetter] No write box found');
        setIsNavigating(false);
        isCheckingRef.current = false;
        return;
      }

      const cleanDataUrl = await composeCleanCapture({
        boardWidth: boardSize.width,
        boardHeight: boardSize.height,
        writeBox,
        inkCanvasRefs,
        dpr,
      });

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
              currentSession,
            );

            if (publicUrl) {
              if (currentSession === 'letter1') {
                letter1CaptureUrlRef.current = publicUrl;
                console.log('[UrduWriteLetter] ✅ Letter1 URL:', publicUrl);
              } else {
                letter2CaptureUrlRef.current = publicUrl;
                console.log('[UrduWriteLetter] ✅ Letter2 URL:', publicUrl);
              }
            } else {
              console.error('[UrduWriteLetter] ❌ Upload failed');
            }
          } catch (err) {
            console.error('[UrduWriteLetter] Upload error:', err);
          }
        }
      } else {
        console.error('[UrduWriteLetter] ❌ No capture');
      }

      if (currentSession === 'letter2') {
        saveBothSessionsProgress();
      }

      if (currentSession === 'letter1') {
        setTransitionPhase('fade-out');
        transitionTimerRef.current = setTimeout(() => {
          setSession('letter2');
          setTransitionPhase('fade-in');
          setIsNavigating(false);
          isCheckingRef.current = false;
          transitionTimerRef.current = setTimeout(() => {
            setTransitionPhase('idle');
          }, 500);
        }, 500);
      } else {
        navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
      }
    } catch (err) {
      console.error('[UrduWriteLetter] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    isNavigating, boxSlots, slotStates, slotHasInk,
    session, subject, level, lessonId, navigate, stopIntroAudio,
    boardSize, dpr,
  ]);

  const saveBothSessionsProgress = useCallback(() => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const studentName = sessionData.student.studentName || "Student";

    const captures: string[] = [];
    if (letter1CaptureUrlRef.current) captures.push(letter1CaptureUrlRef.current);
    if (letter2CaptureUrlRef.current) captures.push(letter2CaptureUrlRef.current);

    const letter1Done = !!letter1CaptureUrlRef.current;
    const letter2Done = !!letter2CaptureUrlRef.current;

    const summary = buildWriteSummary(
      studentName,
      letter1, letter1Name || '',
      letter2, letter2Name || '',
      letter1Done, letter2Done,
    );

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject, level, lessonId,
      status: "completed",
      timeSpentSec: elapsed,
      summary,
      gameData: {
        letter1, letter1Name, letter2, letter2Name,
        captures,
        letter1CaptureUrl: letter1CaptureUrlRef.current,
        letter2CaptureUrl: letter2CaptureUrlRef.current,
        completed: true,
      },
    }).catch((err) => {
      console.error("[UrduWriteLetter] Save completed failed:", err);
    });
  }, [letter1, letter1Name, letter2, letter2Name, subject, level, lessonId]);

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    const introTimer = setTimeout(() => {
      playIntroAudio();
    }, 300);

    return () => {
      isMountedRef.current = false;
      clearTimeout(introTimer);
      stopIntroAudio();

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || "Student";

            const captures: string[] = [];
            if (letter1CaptureUrlRef.current) captures.push(letter1CaptureUrlRef.current);
            if (letter2CaptureUrlRef.current) captures.push(letter2CaptureUrlRef.current);

            const letter1Done = !!letter1CaptureUrlRef.current;
            const letter2Done = !!letter2CaptureUrlRef.current;

            const summary = buildWriteSummary(
              studentName,
              letter1, letter1Name || '',
              letter2, letter2Name || '',
              letter1Done, letter2Done,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject, level, lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter1, letter1Name, letter2, letter2Name,
                captures,
                letter1CaptureUrl: letter1CaptureUrlRef.current,
                letter2CaptureUrl: letter2CaptureUrlRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[UrduWriteLetter] Save partial failed:", err);
            });
          }
        }
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
        className={`uwl-tool-pop relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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
    if (transitionPhase === 'fade-out') return 'uwl-fade-out';
    if (transitionPhase === 'fade-in') return 'uwl-fade-in';
    return '';
  };

  const guideFontSize = `calc(${BASE_GUIDE_FONT_SIZE_VH}vh * ${letterConfig.size})`;
  const guideTransform = `translateY(${letterConfig.y}em)`;

  return (
    <div
      dir="rtl"
      className={`relative flex h-full w-full select-none flex-col ${getTransitionClass()}`}
    >
      <style>{ANIMATION_CSS}</style>
      <style>{FONT_CSS}</style>

      <div className="flex h-full w-full items-stretch" dir="ltr">
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-r-3xl rounded-l-none border-b-[3px] border-r-[3px] border-t-0 border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)] md:w-16 md:gap-4 md:py-4">
            <button
              onClick={() => setTool({ kind: 'eraser' })}
              className={`uwl-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                tool.kind === 'eraser'
                  ? 'border-white bg-pink-500 ring-4 ring-yellow-400 shadow-lg'
                  : 'border-white/60 bg-white hover:border-white shadow'
              }`}
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
              className={`uwl-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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
                  dir="rtl"
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-extrabold tracking-wider"
                  style={{
                    color: BOX_BORDER_COLOR,
                    fontFamily: "'Noto Nastaliq Urdu', system-ui, sans-serif",
                  }}
                >
                  {slot.label}
                </div>

                {!slot.isWriteBox && currentLetter && (
                  <div
                    dir="rtl"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <span
                      className="uwl-guide-letter"
                      style={{
                        fontSize: guideFontSize,
                        lineHeight: BASE_GUIDE_LINE_HEIGHT,
                        transform: guideTransform,
                      }}
                    >
                      {currentLetter}
                    </span>
                  </div>
                )}

                <canvas
                  ref={(el) => {
                    lineCanvasRefs.current[slot.id] = el;
                  }}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 2 }}
                />

                <canvas
                  ref={(el) => {
                    inkCanvasRefs.current[slot.id] = el;
                  }}
                  className="absolute inset-0 w-full h-full touch-none"
                  style={{
                    touchAction: 'none',
                    pointerEvents: isCompleted || !slot.isWriteBox ? 'none' : 'auto',
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

export default HuroofETahajjiWriteLetterBase;