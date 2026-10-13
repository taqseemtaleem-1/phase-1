// src/components/games/Math/Numbers-Faint-VanishTrace/MathNumbersFaintVanishTraceBase.tsx
// 🔥 Math version of AlphabetFaintVanishTrace — SINGLE SESSION
// 🔢 Trace a single number using Andika font glyph
// ✨ VANISH FEATURE: Guide number fades away on pen touch + 2s idle timer
// 🔥 CLEAN MANUAL CANVAS CAPTURE — no html-to-image
// ⚡ Check button active on FIRST ink stroke anywhere
// 📝 Summary: Simple "Ahmed traced the number '3'." pattern
// 🚀 NO saving popup — silent fast flow

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  Eraser,
} from 'lucide-react';

// 🔥 opentype.js for glyph paths
import * as opentype from 'opentype.js';
import type { Font } from 'opentype.js';

// 🔥 Andika font
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🔥 SINGLE INTRO AUDIO
const IntroAudio = "/assets/Math Assets/Numbers FaintTrace/intro.wav";

// 🔥 Progress sync
import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// 🔥 Storage upload
import { uploadFaintTraceCapture } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
//  🔤 ANDIKA FONT LOADER
// ═══════════════════════════════════════════════════════════════

let fontPromise: Promise<Font> | null = null;

function loadAndikaFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = fetch(andikaFontUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => opentype.parse(buffer));
  }
  return fontPromise;
}

function useAndikaFont(): Font | null {
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAndikaFont()
      .then((f) => {
        if (!cancelled) setFont(f);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return font;
}

// ═══════════════════════════════════════════════════════════════
//  📐 LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════════

type SlotKind = 'solid' | 'practice';

interface RuledLineSlot {
  id: number;
  row: 0 | 1;
  index: number;
  kind: SlotKind;
  rect: { x: number; y: number; width: number; height: number };
  letter: string;
}

interface RuledLineLayout {
  rows: { top: number; height: number; slots: RuledLineSlot[] }[];
  allSlots: RuledLineSlot[];
  practiceSlots: RuledLineSlot[];
  solidSlot: RuledLineSlot | null;
}

const SLOTS_PER_ROW = 3;
const ROW_COUNT = 2;
const SLOT_PADDING = 10;
const SLOT_GAP = 8;

function calculateLayout(
  boardWidth: number,
  boardHeight: number,
  letter: string,
): RuledLineLayout {
  const rowHeight = boardHeight / ROW_COUNT;
  const slotPadding = SLOT_PADDING;
  const slotGap = SLOT_GAP;

  const slots: RuledLineSlot[] = [];
  let slotId = 0;

  for (let row = 0; row < ROW_COUNT; row++) {
    const rowTop = row * rowHeight;
    const totalWidth = boardWidth - slotPadding * 2;
    const slotWidth = (totalWidth - slotGap * (SLOTS_PER_ROW - 1)) / SLOTS_PER_ROW;

    for (let index = 0; index < SLOTS_PER_ROW; index++) {
      const slotX = slotPadding + index * (slotWidth + slotGap);
      const slotY = rowTop + slotPadding;
      const slotHeight = rowHeight - slotPadding * 2;

      slots.push({
        id: slotId++,
        row: row as 0 | 1,
        index,
        kind: 'practice',
        rect: { x: slotX, y: slotY, width: slotWidth, height: slotHeight },
        letter,
      });
    }
  }

  return {
    rows: [
      { top: 0, height: rowHeight, slots: slots.filter((s) => s.row === 0) },
      { top: rowHeight, height: rowHeight, slots: slots.filter((s) => s.row === 1) },
    ],
    allSlots: slots,
    practiceSlots: slots.filter((s) => s.kind === 'practice'),
    solidSlot: slots.find((s) => s.kind === 'solid') || null,
  };
}

const LINE_TOP = 0.04;
const LINE_BASELINE = 0.66;
const LINE_2ND = 0.33;
const LINE_BOTTOM = 0.96;

const DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y']);
const ASCENDERS = new Set(['b', 'd', 'f', 'h', 'k', 'l', 't']);

function getLetterZone(letter: string, isCapital: boolean): [number, number] {
  if (isCapital) {
    return [LINE_TOP, LINE_BASELINE];
  }

  const ch = letter.toLowerCase();
  if (DESCENDERS.has(ch)) {
    return [LINE_2ND, LINE_BOTTOM];
  }
  if (ASCENDERS.has(ch)) {
    return [LINE_TOP, LINE_BASELINE];
  }
  return [LINE_2ND, LINE_BASELINE];
}

const CENTERED_FILL_RATIO = 0.62;
const CENTERED_MAX_WIDTH_RATIO = 0.62;

function buildGlyphPath(
  font: Font,
  letter: string,
  _zoneStart: number,
  _zoneEnd: number,
  rowHeight: number,
  _verticalOffset: number,
  boxWidth: number,
): string | null {
  if (!letter || !font.hasChar(letter)) return null;

  const glyph = font.charToGlyph(letter);
  const unitsPerEm = font.unitsPerEm;

  const rawPath = glyph.getPath(0, 0, unitsPerEm);
  const rawBBox = rawPath.getBoundingBox();
  const glyphUnitHeight = rawBBox.y2 - rawBBox.y1;
  const glyphUnitWidth = rawBBox.x2 - rawBBox.x1;

  if (!(glyphUnitHeight > 0) || !(glyphUnitWidth > 0)) return null;

  const boxHeight = rowHeight;

  const targetHeight = boxHeight * CENTERED_FILL_RATIO;
  const targetMaxWidth = boxWidth * CENTERED_MAX_WIDTH_RATIO;

  const scale = Math.min(targetHeight / glyphUnitHeight, targetMaxWidth / glyphUnitWidth);
  const fontSize = unitsPerEm * scale;

  const boxCenterX = boxWidth / 2;
  const boxCenterY = boxHeight / 2;

  const scaledBBoxCenterX = ((rawBBox.x1 + rawBBox.x2) / 2) * scale;
  const scaledBBoxCenterY = ((rawBBox.y1 + rawBBox.y2) / 2) * scale;

  const originX = boxCenterX - scaledBBoxCenterX;
  const originY = boxCenterY - scaledBBoxCenterY;

  const finalPath = glyph.getPath(originX, originY, fontSize);
  return finalPath.toPathData(2);
}

// ═══════════════════════════════════════════════════════════════
//  🔥 CLEAN MANUAL CANVAS CAPTURE
// ═══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  layout: RuledLineLayout;
  glyphPathsCss: Record<number, string>;
  canvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

async function composeCleanTraceCapture(params: CaptureParams): Promise<string | null> {
  const {
    boardWidth,
    boardHeight,
    layout,
    glyphPathsCss,
    canvasRefs,
    dpr,
  } = params;

  try {
    const scale = Math.max(2, dpr) * 1.5;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(boardWidth * scale);
    canvas.height = Math.round(boardHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const slot of layout.practiceSlots) {
      const x = slot.rect.x * scale;
      const y = slot.rect.y * scale;
      const w = slot.rect.width * scale;
      const h = slot.rect.height * scale;

      ctx.save();
      ctx.strokeStyle = BOX_BORDER_COLOR;
      ctx.lineWidth = BOX_BORDER_WIDTH * scale * 2;
      const radius = 8 * scale;
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

      const guideD = glyphPathsCss[slot.id];
      if (guideD) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const path2d = new Path2D(guideD);
        ctx.fillStyle = GUIDE_COLOR;
        ctx.globalAlpha = GUIDE_OPACITY;
        ctx.fill(path2d);
        ctx.restore();
      }

      const inkCanvas = canvasRefs.current[slot.id];
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
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[MathFaintVanish] PNG export failed');
      return null;
    }
    return dataUrl;
  } catch (err) {
    console.error('[MathFaintVanish] composeCleanTraceCapture failed:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  🎨 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const GUIDE_COLOR = '#94A3B8';
const GUIDE_OPACITY = 0.5;

const BOX_BORDER_COLOR = '#1a1a1a';
const BOX_BORDER_WIDTH = 1.5;

const MAX_HISTORY = 20;

const IDLE_TIMEOUT_MS = 2000;
const FADE_DURATION_MS = 300;

const ANIMATION_CSS = `
  @keyframes flt-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes flt-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  .flt-pop-in { animation: flt-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .flt-tool-pop { animation: flt-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }

  .mftv-guide {
    transition: opacity ${FADE_DURATION_MS}ms ease-in-out;
  }
  .mftv-guide-hidden {
    opacity: 0 !important;
  }
`;

const SWATCHES = [
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'red', color: '#e30613', label: 'Red' },
  { id: 'green', color: '#1aa64b', label: 'Green' },
  { id: 'blue', color: '#1e4dd8', label: 'Blue' },
];

type Tool = { kind: 'pen'; color: string } | { kind: 'eraser' };

interface Props {
  number: string;
  subject: string;
  level: number;
  lessonId: number;
}

interface SlotState {
  isCompleted: boolean;
  isGuideVisible: boolean;
}

function buildTraceSummary(
  studentName: string,
  numberDisplay: string,
  completed: boolean,
): string {
  if (completed) {
    return `${studentName} traced the number '${numberDisplay}'.`;
  }
  return `${studentName} did not complete the lesson.`;
}

export function MathNumbersFaintVanishTraceBase({
  number,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);
  const [layout, setLayout] = useState<RuledLineLayout | null>(null);
  const font = useAndikaFont();

  const [tool, setTool] = useState<Tool>({ kind: 'pen', color: '#1a1a1a' });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const [undoStacks, setUndoStacks] = useState<Record<number, ImageData[]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<number, ImageData[]>>({});

  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [slotHasInk, setSlotHasInk] = useState<Record<number, boolean>>({});
  const [hasInkAnywhere, setHasInkAnywhere] = useState(false);
  const [currentSlotId, setCurrentSlotId] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const [isNavigating, setIsNavigating] = useState(false);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const hitCanvasesRef = useRef<Record<number, HTMLCanvasElement>>({});
  const hitDataRefs = useRef<Record<number, ImageData | null>>({});

  const idleTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastMoveTimeRef = useRef<Record<number, number>>({});

  const captureUrlRef = useRef<string | null>(null);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const isCheckingRef = useRef<boolean>(false);

  const currentNumber = number;
  const activeColor = tool.kind === 'pen' ? tool.color : null;
  const numberDisplay = number;

  const getStrokeWidth = useCallback(
    (slotId: number): number => {
      const slot = layout?.practiceSlots.find((s) => s.id === slotId);
      if (!slot) return 6 * dpr;
      const slotHeight = slot.rect.height;
      const strokeWidth = Math.max(8, slotHeight * 0.045);
      return strokeWidth * dpr;
    },
    [layout, dpr],
  );

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

  const playIntroAudio = useCallback(() => {
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;

    try {
      const audio = new Audio(IntroAudio);
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

  const glyphPaths = useMemo(() => {
    const css: Record<number, string> = {};
    const canvasPx: Record<number, string> = {};
    if (!font || !layout || boardSize.height === 0) return { css, canvasPx };

    const [zoneStart, zoneEnd] = getLetterZone(currentNumber, true);
    const rowHeightCss = boardSize.height / 2;

    layout.allSlots.forEach((slot) => {
      const dCss = buildGlyphPath(
        font,
        currentNumber,
        zoneStart,
        zoneEnd,
        rowHeightCss,
        SLOT_PADDING,
        slot.rect.width,
      );
      if (dCss) css[slot.id] = dCss;

      if (slot.kind === 'practice') {
        const dPx = buildGlyphPath(
          font,
          currentNumber,
          zoneStart,
          zoneEnd,
          rowHeightCss * dpr,
          SLOT_PADDING * dpr,
          slot.rect.width * dpr,
        );
        if (dPx) canvasPx[slot.id] = dPx;
      }
    });

    return { css, canvasPx };
  }, [font, layout, currentNumber, dpr, boardSize.height]);

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
      Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
      stopIntroAudio();
    };
  }, [stopIntroAudio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        playIntroAudio();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [playIntroAudio]);

  useEffect(() => {
    if (boardSize.width === 0 || boardSize.height === 0) return;
    const newLayout = calculateLayout(boardSize.width, boardSize.height, currentNumber);
    setLayout(newLayout);
  }, [boardSize, currentNumber]);

  // ═══════════════════════════════════════════════════════════
  //  ✨ VANISH HELPERS
  // ═══════════════════════════════════════════════════════════

  const clearIdleTimer = useCallback((slotId: number) => {
    if (idleTimersRef.current[slotId]) {
      clearTimeout(idleTimersRef.current[slotId]);
      delete idleTimersRef.current[slotId];
    }
  }, []);

  const clearAllIdleTimers = useCallback(() => {
    Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
    idleTimersRef.current = {};
  }, []);

  const startIdleTimer = useCallback(
    (slotId: number) => {
      clearIdleTimer(slotId);
      idleTimersRef.current[slotId] = setTimeout(() => {
        setSlotStates((prev) => {
          const state = prev[slotId];
          if (!state || state.isCompleted) return prev;
          if (state.isGuideVisible) return prev;

          const lastMove = lastMoveTimeRef.current[slotId] || 0;
          const idleTime = Date.now() - lastMove;

          if (idleTime >= IDLE_TIMEOUT_MS) {
            return {
              ...prev,
              [slotId]: {
                ...prev[slotId],
                isGuideVisible: true,
              },
            };
          }
          return prev;
        });
        delete idleTimersRef.current[slotId];
      }, IDLE_TIMEOUT_MS);
    },
    [clearIdleTimer],
  );

  const vanishGuide = useCallback((slotId: number) => {
    setSlotStates((prev) => {
      const state = prev[slotId];
      if (!state || state.isCompleted || !state.isGuideVisible) return prev;
      return {
        ...prev,
        [slotId]: {
          ...prev[slotId],
          isGuideVisible: false,
        },
      };
    });
  }, []);

  const updateLastMoveTime = useCallback(
    (slotId: number) => {
      lastMoveTimeRef.current[slotId] = Date.now();
      clearIdleTimer(slotId);
      startIdleTimer(slotId);
    },
    [clearIdleTimer, startIdleTimer],
  );

  const forceShowAllGuides = useCallback(() => {
    clearAllIdleTimers();

    setSlotStates((prev) => {
      const next: Record<number, SlotState> = { ...prev };
      Object.keys(next).forEach((key) => {
        const id = Number(key);
        if (!next[id].isCompleted && !next[id].isGuideVisible) {
          next[id] = {
            ...next[id],
            isGuideVisible: true,
          };
        }
      });
      return next;
    });
  }, [clearAllIdleTimers]);

  useEffect(() => {
    if (!layout || !font) return;

    const newSlotStates: Record<number, SlotState> = {};
    const newUndo: Record<number, ImageData[]> = {};
    const newRedo: Record<number, ImageData[]> = {};
    const newHasInk: Record<number, boolean> = {};

    layout.practiceSlots.forEach((slot) => {
      const canvas = canvasRefs.current[slot.id];
      if (!canvas) return;

      const pixelWidth = Math.max(1, Math.round(slot.rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(slot.rect.height * dpr));
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${slot.rect.width}px`;
      canvas.style.height = `${slot.rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, pixelWidth, pixelHeight);

      const d = glyphPaths.canvasPx[slot.id];
      if (d) {
        if (!hitCanvasesRef.current[slot.id]) {
          hitCanvasesRef.current[slot.id] = document.createElement('canvas');
        }
        const hitCanvas = hitCanvasesRef.current[slot.id];
        hitCanvas.width = pixelWidth;
        hitCanvas.height = pixelHeight;
        const hitCtx = hitCanvas.getContext('2d');
        if (hitCtx) {
          hitCtx.clearRect(0, 0, pixelWidth, pixelHeight);
          hitCtx.fillStyle = '#000';
          hitCtx.fill(new Path2D(d));
          hitDataRefs.current[slot.id] = hitCtx.getImageData(0, 0, pixelWidth, pixelHeight);
        }
      } else {
        hitDataRefs.current[slot.id] = null;
      }

      newSlotStates[slot.id] = {
        isCompleted: false,
        isGuideVisible: true,
      };
      newUndo[slot.id] = [];
      newRedo[slot.id] = [];
      newHasInk[slot.id] = false;
    });

    setSlotStates(newSlotStates);
    setUndoStacks(newUndo);
    setRedoStacks(newRedo);
    setSlotHasInk(newHasInk);
    setHasInkAnywhere(false);
    setCurrentSlotId(layout.practiceSlots[0]?.id ?? null);

    clearAllIdleTimers();
    lastMoveTimeRef.current = {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, font, glyphPaths, dpr, resetToken]);

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

  const pushUndo = useCallback((slotId: number, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStacks((prev) => ({
      ...prev,
      [slotId]: [...(prev[slotId] || []), snap].slice(-MAX_HISTORY),
    }));
    setRedoStacks((prev) => ({ ...prev, [slotId]: [] }));
  }, []);

  const applyStroke = useCallback(
    (ctx: CanvasRenderingContext2D, slotId: number) => {
      const strokeWidth = getStrokeWidth(slotId);

      if (tool.kind === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = strokeWidth * 1.5;
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
      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);

      setCurrentSlotId(slotId);
      setSlotHasInk((prev) => ({ ...prev, [slotId]: true }));
      setHasInkAnywhere(true);

      if (tool.kind === 'pen') {
        vanishGuide(slotId);
        updateLastMoveTime(slotId);
      }

      pushUndo(slotId, canvas);
      setIsDrawing(true);
      setLastPoint(point);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      applyStroke(ctx, slotId);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.01, point.y + 0.01);
      ctx.stroke();

      canvas.setPointerCapture(e.pointerId);
    },
    [
      slotStates, getCanvasPoint, pushUndo, applyStroke,
      vanishGuide, updateLastMoveTime, tool,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, slotId: number) => {
      if (!isDrawing) return;
      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);
      if (!lastPoint) return;

      setSlotHasInk((prev) => (prev[slotId] ? prev : { ...prev, [slotId]: true }));
      setHasInkAnywhere(true);

      if (tool.kind === 'pen') {
        vanishGuide(slotId);
        updateLastMoveTime(slotId);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      applyStroke(ctx, slotId);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
    },
    [
      isDrawing, slotStates, getCanvasPoint, lastPoint, applyStroke,
      vanishGuide, updateLastMoveTime, tool,
    ],
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // ═══════════════════════════════════════════════════════════
  //  🎯 CHECK ALL — CLEAN CAPTURE
  // ═══════════════════════════════════════════════════════════
  const checkAll = useCallback(async () => {
    if (!layout) return;
    if (isNavigating) return;
    if (isCheckingRef.current) return;
    if (!hasInkAnywhere) return;

    const pending = layout.practiceSlots.filter((s) => !slotStates[s.id]?.isCompleted);
    if (pending.length === 0) return;

    isCheckingRef.current = true;
    setIsNavigating(true);

    const newStates = { ...slotStates };
    pending.forEach((slot) => {
      newStates[slot.id] = {
        ...newStates[slot.id],
        isCompleted: true,
        isGuideVisible: false,
      };
    });
    setSlotStates(newStates);

    await new Promise((r) => setTimeout(r, 80));

    forceShowAllGuides();
    await new Promise((r) => setTimeout(r, FADE_DURATION_MS + 150));

    try {
      let cleanDataUrl: string | null = null;
      if (boardSize.width > 0 && boardSize.height > 0) {
        cleanDataUrl = await composeCleanTraceCapture({
          boardWidth: boardSize.width,
          boardHeight: boardSize.height,
          layout,
          glyphPathsCss: glyphPaths.css,
          canvasRefs,
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
              'number',
            );

            if (publicUrl) {
              captureUrlRef.current = publicUrl;
              console.log('[MathFaintVanish] ✅ Capture URL:', publicUrl);
            } else {
              console.error('[MathFaintVanish] ❌ Upload failed');
            }
          } catch (err) {
            console.error('[MathFaintVanish] Upload error:', err);
          }
        }
      } else {
        console.error('[MathFaintVanish] ❌ No capture to upload');
      }

      saveProgressData();

      stopIntroAudio();

      navigate({
        to: "/levels",
        search: { subject, level, openPopup: "true" },
      });
    } catch (err) {
      console.error('[MathFaintVanish] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    layout, slotStates, hasInkAnywhere, isNavigating,
    subject, level, lessonId, navigate, stopIntroAudio,
    boardSize, glyphPaths, dpr, forceShowAllGuides,
  ]);

  const saveProgressData = useCallback(() => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const studentName = sessionData.student.studentName || 'Student';

    const captures: string[] = [];
    if (captureUrlRef.current) captures.push(captureUrlRef.current);

    const summary = buildTraceSummary(studentName, numberDisplay, true);

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject,
      level,
      lessonId,
      status: 'completed',
      timeSpentSec: elapsed,
      summary,
      gameData: {
        number: numberDisplay,
        captures,
        captureUrl: captureUrlRef.current,
        completed: true,
      },
    }).catch((err) => {
      console.error('[MathFaintVanish] Save completed failed:', err);
    });
  }, [numberDisplay, subject, level, lessonId]);

  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    return () => {
      isMountedRef.current = false;

      Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
      idleTimersRef.current = {};

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;

            const studentName = sessionData.student.studentName || 'Student';

            const captures: string[] = [];
            if (captureUrlRef.current) captures.push(captureUrlRef.current);

            const summary = buildTraceSummary(studentName, numberDisplay, false);

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject,
              level,
              lessonId,
              status: 'uncompleted',
              timeSpentSec: elapsed,
              summary,
              gameData: {
                number: numberDisplay,
                captures,
                captureUrl: captureUrlRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn('[MathFaintVanish] Save partial failed:', err);
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
        className={`flt-tool-pop relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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

  const isCheckReady = hasInkAnywhere;
  const isGameLocked = isNavigating;

  return (
    <div className="relative flex h-full w-full select-none flex-col">
      <style>{ANIMATION_CSS}</style>

      <div className="flex h-full w-full items-stretch">
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-r-3xl rounded-l-none border-b-[3px] border-r-[3px] border-t-0 border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)] md:w-16 md:gap-4 md:py-4">

            <button
              onClick={() => setTool({ kind: 'eraser' })}
              className={`flt-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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
              disabled={!isCheckReady || isGameLocked}
              className={`flt-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                isCheckReady && !isGameLocked
                  ? 'border-white bg-green-500 shadow-lg hover:bg-green-600'
                  : 'border-white/40 bg-gray-400 cursor-not-allowed opacity-60'
              }`}
              aria-label={isCheckReady ? 'Check' : 'Trace anywhere to enable'}
              title={isCheckReady ? 'Check' : 'Trace anywhere to enable'}
            >
              <Check className="h-5 w-5 text-white" strokeWidth={4} />
            </button>
          </div>
        </div>

        <div
          ref={boardRef}
          className="relative flex-1 overflow-hidden rounded-3xl border-b-4 border-l-4 border-r-4 border-white bg-transparent mt-10"
          style={{ touchAction: 'none' }}
        >
          {layout?.practiceSlots.map((slot) => (
            <div
              key={`box-${slot.id}`}
              className="absolute pointer-events-none"
              style={{
                left: slot.rect.x,
                top: slot.rect.y,
                width: slot.rect.width,
                height: slot.rect.height,
                border: `${BOX_BORDER_WIDTH}px solid ${BOX_BORDER_COLOR}`,
                opacity: 0.75,
                borderRadius: '8px',
                boxSizing: 'border-box',
                zIndex: 5,
              }}
            />
          ))}

          {layout?.allSlots.map((slot) => {
            const state = slotStates[slot.id];
            const isCompleted = state?.isCompleted || false;
            const isGuideVisible = state?.isGuideVisible ?? true;
            const guideD = glyphPaths.css[slot.id];

            return (
              <div
                key={`practice-${slot.id}`}
                className="absolute"
                style={{
                  left: slot.rect.x,
                  top: slot.rect.y,
                  width: slot.rect.width,
                  height: slot.rect.height,
                  opacity: isCompleted ? 0.5 : 1,
                  zIndex: 6,
                }}
              >
                {guideD && (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${slot.rect.width} ${slot.rect.height}`}
                    className={`absolute inset-0 pointer-events-none mftv-guide ${
                      !isGuideVisible ? 'mftv-guide-hidden' : ''
                    }`}
                  >
                    <path d={guideD} fill={GUIDE_COLOR} opacity={GUIDE_OPACITY} />
                  </svg>
                )}

                <canvas
                  ref={(el) => {
                    canvasRefs.current[slot.id] = el;
                  }}
                  className="absolute inset-0 w-full h-full touch-none"
                  style={{
                    touchAction: 'none',
                    pointerEvents: isCompleted ? 'none' : 'auto',
                    zIndex: 10,
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

export default MathNumbersFaintVanishTraceBase;