// src/components/games/English/Alphabet-FaintVanishTrace/AlphabetFaintVanishTraceBase.tsx
// 🔥 Upload captures to Supabase Storage (faint-trace-captures bucket)
// 🔥 URLs saved in gameData.captures (not base64)
// 🔥 On complete → navigate to /levels popup
// 🎯 MANUAL CANVAS COMPOSITION — clean high-quality captures
// ⚡ Check button active on FIRST ink stroke anywhere
// 📝 Session-aware summary (Uppercase / Lowercase / Both)
// ✨ Vanish-specific feature BARKARAR: guide letter 2s baad wapas aata hai
// 🎯 Check dabate hi saare vanished guides FORCE-SHOW hote hain
//    Phir 450ms wait → capture lo → guides capture mein aayein
// ❌ SAVING POPUP REMOVED — silent background capture
// ❌ LOCK OVERLAY REMOVED — board is interactive from frame 1

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  Eraser,
} from 'lucide-react';
import {
  calculateLayout,
  getLetterZone,
  buildGlyphPath,
  SLOT_PADDING,
  type RuledLineLayout,
} from './ruledLineHelpers';
import { useAndikaFont } from './useAndikaGlyphs';

// 🔥 Audio
const CapitalTraceAudio = "/assets/Alphabet-FaintTrace Audios/Capital Trace.wav";
const SmallTraceAudio = "/assets/Alphabet-FaintTrace Audios/Small Trace.wav";

// 🔥 Progress sync
import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// 🔥 Storage upload
import { uploadFaintTraceCapture } from '@/lib/supabase';

const SOLID_COLOR = '#E30613';
const GUIDE_COLOR = '#94A3B8';
const GUIDE_OPACITY = 0.4;

const MAX_HISTORY = 20;

// 🔥 Idle timeout for letter reappearance (2 seconds) — VANISH FEATURE
const IDLE_TIMEOUT_MS = 2000;

// 🎯 Wait time after force-show before capture (fade-in + re-render)
const GUIDE_RESTORE_WAIT_MS = 450;

// ─── CSS Animations ──────────────────────────────────────────
const ANIMATION_CSS = `
  @keyframes flt-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes flt-slide-up {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes flt-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes flt-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes flt-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  @keyframes flt-fade-out-guide {
    0%   { opacity: 0.4; }
    100% { opacity: 0; }
  }
  
  @keyframes flt-fade-in-guide {
    0%   { opacity: 0; }
    100% { opacity: 0.4; }
  }
  
  .flt-pop-in { animation: flt-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .flt-slide-up { animation: flt-slide-up 0.5s ease-out both; }
  .flt-fade-out { animation: flt-fade-out 0.3s ease-out both; }
  .flt-fade-in { animation: flt-fade-in 0.4s ease-out both; }
  .flt-tool-pop { animation: flt-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  
  .flt-fade-out-guide { animation: flt-fade-out-guide 0.8s ease-in-out both; }
  .flt-fade-in-guide { animation: flt-fade-in-guide 0.8s ease-in-out both; }
`;

// ─── Color Palette ──────────────────────────────────────────
const SWATCHES = [
  { id: 'black', color: '#1a1a1a' },
  { id: 'red', color: '#e30613' },
  { id: 'green', color: '#1aa64b' },
  { id: 'blue', color: '#1e4dd8' },
];

type Tool = { kind: 'pen'; color: string } | { kind: 'eraser' };

interface Props {
  letter: string;
  subject: string;
  level: number;
  lessonId: number;
}

type Session = 'capital' | 'small';

interface SlotState {
  isCompleted: boolean;
  isGuideVisible: boolean;
  hasEverDrawn: boolean;
}

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER — Session-aware
// ══════════════════════════════════════════════════════════════

function buildTraceSummary(
  studentName: string,
  capitalLetter: string,
  smallLetter: string,
  letterDisplay: string,
  capitalDone: boolean,
  smallDone: boolean,
): string {
  if (capitalDone && smallDone) {
    return `${studentName} traced both Uppercase and Lowercase '${letterDisplay}'.`;
  }
  if (capitalDone) {
    return `${studentName} traced the Uppercase '${capitalLetter}'.`;
  }
  if (smallDone) {
    return `${studentName} traced the Lowercase '${smallLetter}'.`;
  }
  return `${studentName} traced the letter '${letterDisplay}'.`;
}

// ══════════════════════════════════════════════════════════════
//  🔥 MANUAL CANVAS COMPOSITION — Clean high-quality capture
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  layout: RuledLineLayout;
  glyphPathsCss: Record<number, string>;
  canvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

async function composeCleanCapture(params: CaptureParams): Promise<string | null> {
  const {
    boardWidth,
    boardHeight,
    layout,
    glyphPathsCss,
    canvasRefs,
    dpr,
  } = params;

  try {
    // 🔥 High-resolution canvas — 2x DPR for crisp output
    const scale = Math.max(2, dpr) * 1.5;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(boardWidth * scale);
    canvas.height = Math.round(boardHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // ─── 1. White background ───
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ─── 2. Ruled lines (red top, blue middle, red bottom) ───
    const rowHeight = boardHeight / 2;
    for (let row = 0; row < 2; row++) {
      const rowTop = row * rowHeight;
      const isFirstRow = row === 0;
      const isLastRow = row === 1;
      const positions = [0, 1 / 3, 2 / 3, 1];

      positions.forEach((frac, idx) => {
        const isTopEdge = idx === 0;
        const isBottomEdge = idx === 3;
        const isTop = isTopEdge && isFirstRow;
        const isBottom = isBottomEdge && isLastRow;

        if (isBottom) return;

        let y = rowTop + frac * rowHeight;
        if (isTop) y = rowTop;

        const isEdge = isTopEdge || isBottomEdge;
        const color = isEdge ? '#FF2B2B' : '#1E4DD8';
        const opacity = isEdge ? 0.55 : 0.4;
        const lineHeight = Math.max(1.5, boardHeight * 0.006);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.fillRect(0, y * scale, canvas.width, lineHeight * scale);
        ctx.restore();
      });
    }

    // ─── 3. Solid letters (red, e.g. "A" at start) ───
    for (const slot of layout.allSlots) {
      if (slot.kind !== 'solid') continue;
      const d = glyphPathsCss[slot.id];
      if (!d) continue;

      ctx.save();
      ctx.translate(slot.rect.x * scale, slot.rect.y * scale);
      ctx.scale(scale, scale);

      const path2d = new Path2D(d);
      ctx.fillStyle = SOLID_COLOR;
      ctx.fill(path2d);
      ctx.restore();
    }

    // ─── 4. Guide letters (grey faint) — ALWAYS draw (vanish feature) ───
    //    Even if user has vanished them on screen, we always include them in capture
    for (const slot of layout.practiceSlots) {
      const d = glyphPathsCss[slot.id];
      if (!d) continue;

      ctx.save();
      ctx.globalAlpha = GUIDE_OPACITY;
      ctx.translate(slot.rect.x * scale, slot.rect.y * scale);
      ctx.scale(scale, scale);

      const path2d = new Path2D(d);
      ctx.fillStyle = GUIDE_COLOR;
      ctx.fill(path2d);
      ctx.restore();
    }

    // ─── 5. Ink (bacha ne jo draw kiya) — copy each canvas ───
    for (const slot of layout.practiceSlots) {
      const inkCanvas = canvasRefs.current[slot.id];
      if (!inkCanvas) continue;

      ctx.save();
      ctx.translate(slot.rect.x * scale, slot.rect.y * scale);
      ctx.drawImage(
        inkCanvas,
        0,
        0,
        inkCanvas.width,
        inkCanvas.height,
        0,
        0,
        slot.rect.width * scale,
        slot.rect.height * scale
      );
      ctx.restore();
    }

    // ─── 6. Export as PNG (lossless) ───
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[FaintVanish] PNG export failed');
      return null;
    }

    return dataUrl;
  } catch (err) {
    console.error('[FaintVanish] composeCleanCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function AlphabetFaintVanishTraceBase({ letter, subject, level, lessonId }: Props) {
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

  const [session, setSession] = useState<Session>('capital');
  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [slotHasInk, setSlotHasInk] = useState<Record<number, boolean>>({});
  const [hasInkAnywhere, setHasInkAnywhere] = useState(false);
  const [currentSlotId, setCurrentSlotId] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const [showBoard, setShowBoard] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const isCheckingRef = useRef<boolean>(false);

  // ✨ VANISH FEATURE — idle timers for guide letter reappearance
  const idleTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastMoveTimeRef = useRef<Record<number, number>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<{ capital: boolean; small: boolean }>({ capital: false, small: false });

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const hitCanvasesRef = useRef<Record<number, HTMLCanvasElement>>({});
  const hitDataRefs = useRef<Record<number, ImageData | null>>({});
  const guideRefs = useRef<Record<number, SVGSVGElement | null>>({});

  const capitalCaptureUrlRef = useRef<string | null>(null);
  const smallCaptureUrlRef = useRef<string | null>(null);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const currentLetter = session === 'capital' ? letter.toUpperCase() : letter.toLowerCase();
  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const capitalLetter = letter.toUpperCase();
  const smallLetter = letter.toLowerCase();
  const letterDisplay = `${capitalLetter}${smallLetter}`;

  const getStrokeWidth = useCallback((slotId: number): number => {
    const slot = layout?.practiceSlots.find(s => s.id === slotId);
    if (!slot) return 6 * dpr;
    const slotHeight = slot.rect.height;
    const strokeWidth = Math.max(8, slotHeight * 0.045);
    return strokeWidth * dpr;
  }, [layout, dpr]);

  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    } catch {}
  }, []);

  const playIntroAudio = useCallback(() => {
    if (session === 'capital' && introPlayedRef.current.capital) return;
    if (session === 'small' && introPlayedRef.current.small) return;
    const audioSrc = session === 'capital' ? CapitalTraceAudio : SmallTraceAudio;
    if (audioRef.current) {
      stopAudio(audioRef.current);
      audioRef.current = null;
    }
    try {
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      audio.play().catch(() => {});
      if (session === 'capital') {
        introPlayedRef.current.capital = true;
      } else {
        introPlayedRef.current.small = true;
      }
    } catch {}
  }, [session, stopAudio]);

  const hasAnyInk = useCallback((slotId: number): boolean => {
    const canvas = canvasRefs.current[slotId];
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) return true;
    }
    return false;
  }, []);

  const glyphPaths = useMemo(() => {
    const css: Record<number, string> = {};
    const canvasPx: Record<number, string> = {};
    if (!font || !layout || boardSize.height === 0) return { css, canvasPx };

    const isCapital = currentLetter === currentLetter.toUpperCase();
    const [zoneStart, zoneEnd] = getLetterZone(currentLetter, isCapital);
    const rowHeightCss = boardSize.height / 2;

    layout.allSlots.forEach((slot) => {
      const dCss = buildGlyphPath(font, currentLetter, zoneStart, zoneEnd, rowHeightCss, SLOT_PADDING, slot.rect.width);
      if (dCss) css[slot.id] = dCss;
      if (slot.kind === 'practice') {
        const dPx = buildGlyphPath(
          font,
          currentLetter,
          zoneStart,
          zoneEnd,
          rowHeightCss * dpr,
          SLOT_PADDING * dpr,
          slot.rect.width * dpr
        );
        if (dPx) canvasPx[slot.id] = dPx;
      }
    });
    return { css, canvasPx };
  }, [font, layout, currentLetter, dpr, boardSize.height]);

  // ─── Measure board ──────────────────────────────────────────
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

  // ─── Cleanup timers ──────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (audioRef.current) {
        stopAudio(audioRef.current);
        audioRef.current = null;
      }
    };
  }, [stopAudio]);

  // ─── Play intro when session changes ──────────────────────
  useEffect(() => {
    if (showBoard) {
      const timer = setTimeout(() => {
        playIntroAudio();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [session, showBoard, playIntroAudio]);

  // ─── Calculate layout ──────────────────────────────────────
  useEffect(() => {
    if (boardSize.width === 0 || boardSize.height === 0) return;
    const newLayout = calculateLayout(boardSize.width, boardSize.height, currentLetter);
    setLayout(newLayout);
  }, [boardSize, currentLetter]);

  // ─── Clear idle timer ─────────────────────────
  const clearIdleTimer = useCallback((slotId: number) => {
    if (idleTimersRef.current[slotId]) {
      clearTimeout(idleTimersRef.current[slotId]);
      delete idleTimersRef.current[slotId];
    }
  }, []);

  // ─── Clear ALL idle timers ──────────────────
  const clearAllIdleTimers = useCallback(() => {
    Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
    idleTimersRef.current = {};
  }, []);

  // ─── Start idle timer ──────────────────────────
  const startIdleTimer = useCallback((slotId: number) => {
    clearIdleTimer(slotId);

    idleTimersRef.current[slotId] = setTimeout(() => {
      const state = slotStates[slotId];
      const lastMove = lastMoveTimeRef.current[slotId] || 0;
      const now = Date.now();
      const idleTime = now - lastMove;

      if (state && !state.isCompleted && !state.isGuideVisible && state.hasEverDrawn && idleTime >= IDLE_TIMEOUT_MS) {
        setSlotStates((prev) => ({
          ...prev,
          [slotId]: {
            ...prev[slotId],
            isGuideVisible: true
          }
        }));

        const guideElement = guideRefs.current[slotId];
        if (guideElement) {
          guideElement.classList.add('flt-fade-in-guide');
          setTimeout(() => {
            guideElement.classList.remove('flt-fade-in-guide');
          }, 800);
        }
      }

      delete idleTimersRef.current[slotId];
    }, IDLE_TIMEOUT_MS);
  }, [slotStates, clearIdleTimer]);

  // ─── Vanish guide ───────────────────
  const vanishGuide = useCallback((slotId: number) => {
    const state = slotStates[slotId];
    if (state?.isCompleted || !state?.isGuideVisible) return;

    setSlotStates((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        isGuideVisible: false
      }
    }));

    const guideElement = guideRefs.current[slotId];
    if (guideElement) {
      guideElement.classList.add('flt-fade-out-guide');
      setTimeout(() => {
        guideElement.classList.remove('flt-fade-out-guide');
      }, 800);
    }
  }, [slotStates]);

  const ensureGuideVanished = useCallback((slotId: number) => {
    const state = slotStates[slotId];
    if (state && !state.isCompleted && state.isGuideVisible) {
      vanishGuide(slotId);
    }
  }, [slotStates, vanishGuide]);

  const updateLastMoveTime = useCallback((slotId: number) => {
    lastMoveTimeRef.current[slotId] = Date.now();
    clearIdleTimer(slotId);
    startIdleTimer(slotId);
  }, [clearIdleTimer, startIdleTimer]);

  // ─── Setup slots ────────────────────
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
        hasEverDrawn: false,
      };
      newUndo[slot.id] = [];
      newRedo[slot.id] = [];
      newHasInk[slot.id] = false;

      guideRefs.current[slot.id] = null;
      lastMoveTimeRef.current[slot.id] = Date.now();
    });

    setSlotStates(newSlotStates);
    setUndoStacks(newUndo);
    setRedoStacks(newRedo);
    setSlotHasInk(newHasInk);
    setHasInkAnywhere(false);
    setCurrentSlotId(layout.practiceSlots[0]?.id ?? null);
    setSessionComplete(false);
    setShowBoard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, font, glyphPaths, dpr, resetToken]);

  // ─── Drawing functions ──────────────────────────────────────
  const getCanvasPoint = useCallback((clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const pushUndo = useCallback((slotId: number, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStacks((prev) => ({ ...prev, [slotId]: [...(prev[slotId] || []), snap].slice(-MAX_HISTORY) }));
    setRedoStacks((prev) => ({ ...prev, [slotId]: [] }));
  }, []);

  const applyStroke = useCallback((ctx: CanvasRenderingContext2D, slotId: number) => {
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
  }, [tool, getStrokeWidth]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, slotId: number) => {
      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);

      setCurrentSlotId(slotId);

      setSlotHasInk((prev) => ({ ...prev, [slotId]: true }));
      setHasInkAnywhere(true);

      if (!state?.hasEverDrawn && tool.kind === 'pen') {
        setSlotStates((prev) => ({
          ...prev,
          [slotId]: {
            ...prev[slotId],
            hasEverDrawn: true
          }
        }));
      }

      if (tool.kind === 'pen') {
        ensureGuideVanished(slotId);
      }

      updateLastMoveTime(slotId);

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
    [slotStates, getCanvasPoint, pushUndo, applyStroke, ensureGuideVanished, updateLastMoveTime, tool]
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
        ensureGuideVanished(slotId);
      }

      updateLastMoveTime(slotId);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      applyStroke(ctx, slotId);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
    },
    [isDrawing, slotStates, getCanvasPoint, lastPoint, applyStroke, ensureGuideVanished, updateLastMoveTime, tool]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);

    if (currentSlotId !== null) {
      const state = slotStates[currentSlotId];
      if (state && !state.isCompleted && !state.isGuideVisible) {
        startIdleTimer(currentSlotId);
      }
    }
  }, [currentSlotId, slotStates, startIdleTimer]);

  const undo = useCallback(() => {
    if (currentSlotId === null) return;

    const canvas = canvasRefs.current[currentSlotId];
    const ctx = canvas?.getContext('2d');
    const stack = undoStacks[currentSlotId] || [];
    if (!canvas || !ctx || stack.length === 0) return;

    const prevSnap = stack[stack.length - 1];
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(prevSnap, 0, 0);

    setUndoStacks((prev) => ({ ...prev, [currentSlotId]: prev[currentSlotId].slice(0, -1) }));
    setRedoStacks((prev) => ({ ...prev, [currentSlotId]: [...(prev[currentSlotId] || []), current] }));

    setSlotStates((prev) => ({
      ...prev,
      [currentSlotId]: {
        ...prev[currentSlotId],
        isGuideVisible: true,
        hasEverDrawn: false,
      }
    }));

    const guideElement = guideRefs.current[currentSlotId];
    if (guideElement) {
      guideElement.classList.add('flt-fade-in-guide');
      setTimeout(() => {
        guideElement.classList.remove('flt-fade-in-guide');
      }, 800);
    }
  }, [currentSlotId, undoStacks]);

  const redo = useCallback(() => {
    if (currentSlotId === null) return;

    const canvas = canvasRefs.current[currentSlotId];
    const ctx = canvas?.getContext('2d');
    const stack = redoStacks[currentSlotId] || [];
    if (!canvas || !ctx || stack.length === 0) return;

    const nextSnap = stack[stack.length - 1];
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(nextSnap, 0, 0);

    setRedoStacks((prev) => ({ ...prev, [currentSlotId]: prev[currentSlotId].slice(0, -1) }));
    setUndoStacks((prev) => ({ ...prev, [currentSlotId]: [...(prev[currentSlotId] || []), current] }));
  }, [currentSlotId, redoStacks]);

  const clearSlot = useCallback(
    (slotId: number | null = currentSlotId) => {
      if (slotId === null) return;

      const state = slotStates[slotId];
      if (state?.isCompleted) return;

      const canvas = canvasRefs.current[slotId];
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      pushUndo(slotId, canvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSlotHasInk((prev) => ({ ...prev, [slotId]: false }));

      clearIdleTimer(slotId);
      setSlotStates((prev) => ({
        ...prev,
        [slotId]: {
          ...prev[slotId],
          isGuideVisible: true,
          hasEverDrawn: false,
        }
      }));

      const guideElement = guideRefs.current[slotId];
      if (guideElement) {
        guideElement.classList.add('flt-fade-in-guide');
        setTimeout(() => {
          guideElement.classList.remove('flt-fade-in-guide');
        }, 800);
      }
    },
    [currentSlotId, slotStates, pushUndo, clearIdleTimer]
  );

  const wipeSlotInk = useCallback((slotId: number) => {
    const canvas = canvasRefs.current[slotId];
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSlotHasInk((prev) => ({ ...prev, [slotId]: false }));

    clearIdleTimer(slotId);
    setSlotStates((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        isGuideVisible: true,
        hasEverDrawn: false,
      }
    }));

    const guideElement = guideRefs.current[slotId];
    if (guideElement) {
      guideElement.classList.add('flt-fade-in-guide');
      setTimeout(() => {
        guideElement.classList.remove('flt-fade-in-guide');
      }, 800);
    }
  }, [clearIdleTimer]);

  // ═══════════════════════════════════════════════════════════
  //  🎯 FORCE-SHOW ALL GUIDES (vanish → visible)
  // ═══════════════════════════════════════════════════════════
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

    Object.values(guideRefs.current).forEach((el) => {
      if (!el) return;
      el.classList.remove('flt-fade-out-guide');
      el.classList.add('flt-fade-in-guide');
      try {
        (el as SVGSVGElement).style.opacity = String(GUIDE_OPACITY);
      } catch {}
      setTimeout(() => {
        try {
          el.classList.remove('flt-fade-in-guide');
        } catch {}
      }, 800);
    });

    console.log('[FaintVanish] ✅ All guides force-shown for capture');
  }, [clearAllIdleTimers]);

  // ═══════════════════════════════════════════════════════════
  //  🎯 CHECK ALL — Silent background capture
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

    // 🎯 Force-show guides for capture
    forceShowAllGuides();

    await new Promise((r) => setTimeout(r, GUIDE_RESTORE_WAIT_MS));

    const currentSession = session;

    // Mark slots complete (visual feedback)
    const newStates = { ...slotStates };
    pending.forEach((slot) => {
      newStates[slot.id] = {
        ...newStates[slot.id],
        isCompleted: true,
        isGuideVisible: false,
      };
    });
    setSlotStates(newStates);

    try {
      // 🔥 Manual canvas composition — clean capture
      let cleanDataUrl: string | null = null;
      if (layout && boardSize.width > 0 && boardSize.height > 0) {
        cleanDataUrl = await composeCleanCapture({
          boardWidth: boardSize.width,
          boardHeight: boardSize.height,
          layout,
          glyphPathsCss: glyphPaths.css,
          canvasRefs,
          dpr,
        });
      }

      // 🔥 Upload + Save in background
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
              if (currentSession === 'capital') {
                capitalCaptureUrlRef.current = publicUrl;
                console.log('[FaintVanish] ✅ Capital URL:', publicUrl);
              } else {
                smallCaptureUrlRef.current = publicUrl;
                console.log('[FaintVanish] ✅ Small URL:', publicUrl);
              }
            } else {
              console.error('[FaintVanish] ❌ Upload failed');
            }
          } catch (err) {
            console.error('[FaintVanish] Upload error:', err);
          }
        } else {
          console.warn('[FaintVanish] No session — cannot upload');
        }
      } else {
        console.error('[FaintVanish] ❌ No capture to upload');
      }

      // 🔥 Save progress (agar small session complete hui)
      if (currentSession === 'small') {
        saveBothSessionsProgress();
      }

      // 🔥 Navigate immediately — no popup
      const allComplete = layout.practiceSlots.every((s) => newStates[s.id]?.isCompleted);

      if (allComplete) {
        setSessionComplete(true);
        setShowBoard(false);

        setTimeout(() => {
          if (currentSession === 'capital') {
            introPlayedRef.current.small = false;
            setSession('small');
            setResetToken((t) => t + 1);
            setSessionComplete(false);
            setIsNavigating(false);
            isCheckingRef.current = false;
            setTimeout(() => {
              setShowBoard(true);
            }, 100);
          } else {
            if (audioRef.current) {
              stopAudio(audioRef.current);
              audioRef.current = null;
            }
            navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
          }
        }, 300);
      } else {
        setIsNavigating(false);
        isCheckingRef.current = false;
      }
    } catch (err) {
      console.error('[FaintVanish] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    layout, slotStates, hasInkAnywhere, isNavigating,
    session, subject, level, lessonId, navigate, stopAudio,
    forceShowAllGuides, boardSize, glyphPaths.css, dpr,
  ]);

  // ─── 🔥 SAVE PROGRESS WITH CAPTURE URLS ──────────────────────
  const saveBothSessionsProgress = useCallback(() => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) {
      console.warn('[FaintVanish] No session — cannot save');
      return;
    }

    const studentName = sessionData.student.studentName || "Student";

    const captures: string[] = [];
    if (capitalCaptureUrlRef.current) captures.push(capitalCaptureUrlRef.current);
    if (smallCaptureUrlRef.current) captures.push(smallCaptureUrlRef.current);

    const capitalDone = !!capitalCaptureUrlRef.current;
    const smallDone = !!smallCaptureUrlRef.current;

    const summary = buildTraceSummary(
      studentName,
      capitalLetter,
      smallLetter,
      letterDisplay,
      capitalDone,
      smallDone,
    );

    console.log('[FaintVanish] Summary:', summary);

    saveProgress({
      studentId: sessionData.student.studentId,
      deviceToken: sessionData.student.token,
      subject,
      level,
      lessonId,
      status: "completed",
      timeSpentSec: elapsed,
      summary,
      gameData: {
        letter: letterDisplay,
        captures,
        capitalCaptureUrl: capitalCaptureUrlRef.current,
        smallCaptureUrl: smallCaptureUrlRef.current,
        completed: true,
      },
    }).then(() => {
      console.log('[FaintVanish] ✅ Progress saved:', summary);
    }).catch((err) => {
      console.error("[FaintVanish] Save completed failed:", err);
    });
  }, [capitalLetter, smallLetter, letterDisplay, subject, level, lessonId]);

  // ─── 🔥 SAVE PARTIAL ON UNMOUNT ──────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    sessionStartTimeRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    return () => {
      isMountedRef.current = false;

      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;

            const studentName = sessionData.student.studentName || "Student";

            const captures: string[] = [];
            if (capitalCaptureUrlRef.current) captures.push(capitalCaptureUrlRef.current);
            if (smallCaptureUrlRef.current) captures.push(smallCaptureUrlRef.current);

            const capitalDone = !!capitalCaptureUrlRef.current;
            const smallDone = !!smallCaptureUrlRef.current;

            const summary = buildTraceSummary(
              studentName,
              capitalLetter,
              smallLetter,
              letterDisplay,
              capitalDone,
              smallDone,
            );

            saveProgress({
              studentId: sessionData.student.studentId,
              deviceToken: sessionData.student.token,
              subject,
              level,
              lessonId,
              status: "uncompleted",
              timeSpentSec: elapsed,
              summary,
              gameData: {
                letter: letterDisplay,
                captures,
                capitalCaptureUrl: capitalCaptureUrlRef.current,
                smallCaptureUrl: smallCaptureUrlRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[FaintVanish] Save partial failed:", err);
            });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Swatch button ──────────────────────────────────────────
  const swatchButton = (p: { id: string; color: string }) => {
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
            : '0 2px 8px rgba(0,0,0,0.15)'
        }}
        aria-label={`Pen color ${p.id}`}
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
          {layout && boardSize.height > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {(() => {
                const rowHeight = boardSize.height / 2;
                const lines: ReactElement[] = [];

                for (let row = 0; row < 2; row++) {
                  const rowTop = row * rowHeight;
                  const isFirstRow = row === 0;
                  const isLastRow = row === 1;
                  const positions = [0, 1 / 3, 2 / 3, 1];

                  positions.forEach((frac, idx) => {
                    const isTopEdge = idx === 0;
                    const isBottomEdge = idx === 3;
                    const isTop = isTopEdge && isFirstRow;
                    const isBottom = isBottomEdge && isLastRow;

                    if (isBottom) return;

                    let y = rowTop + frac * rowHeight;
                    if (isTop) y = rowTop;
                    if (isBottom) y = rowTop + rowHeight - 8;

                    const isEdge = isTopEdge || isBottomEdge;
                    const color = isEdge ? '#FF2B2B' : '#1E4DD8';
                    const opacity = isEdge ? 0.55 : 0.4;
                    const lineHeight = Math.max(1.5, boardSize.height * 0.006);

                    lines.push(
                      <div
                        key={`line-${row}-${idx}`}
                        className="absolute left-0 right-0"
                        style={{ top: y, height: lineHeight, background: color, opacity }}
                      />
                    );
                  });
                }
                return lines;
              })()}
            </div>
          )}

          {layout?.allSlots.map((slot) => {
            if (slot.kind === 'solid') {
              const d = glyphPaths.css[slot.id];
              return (
                <div
                  key={`solid-${slot.id}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: slot.rect.x,
                    top: slot.rect.y,
                    width: slot.rect.width,
                    height: slot.rect.height,
                  }}
                >
                  {d && (
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${slot.rect.width} ${slot.rect.height}`}
                      style={{ display: 'block' }}
                    >
                      <path d={d} fill={SOLID_COLOR} />
                    </svg>
                  )}
                </div>
              );
            }

            const state = slotStates[slot.id];
            const isCompleted = state?.isCompleted || false;
            const isGuideVisible = state?.isGuideVisible ?? true;
            const guideD = glyphPaths.css[slot.id];

            return (
              <div
                key={`practice-${slot.id}`}
                data-slot-id={slot.id}
                className="absolute rounded-lg overflow-hidden"
                style={{
                  left: slot.rect.x,
                  top: slot.rect.y,
                  width: slot.rect.width,
                  height: slot.rect.height,
                  opacity: isCompleted ? 0.5 : 1,
                }}
              >
                {guideD && (
                  <svg
                    ref={(el) => { guideRefs.current[slot.id] = el; }}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${slot.rect.width} ${slot.rect.height}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: isGuideVisible ? GUIDE_OPACITY : 0,
                      transition: 'opacity 0.8s ease-in-out',
                    }}
                  >
                    <path d={guideD} fill={GUIDE_COLOR} />
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

export default AlphabetFaintVanishTraceBase;