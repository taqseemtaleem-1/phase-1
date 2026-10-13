// src/components/games/Math/Numbers-WriteLetter/MathNumbersWriteLetterBase.tsx
// ✅ SINGLE SESSION — ek hi number, ek hi baar likhna
// 🖊️ 2 BOXES (LEFT: RED guide | RIGHT: empty write box)
// 📏 NO ruled lines — clean white boxes
// 🎯 HAR NUMBER KA APNA CONTROL (0-9)
// 🖊️ THICK STROKE + THICK ERASER
// 🔥 CLEAN MANUAL CANVAS CAPTURE — no html-to-image
// 📝 Summary: Simple "wrote" pattern
// 🚀 NO saving popup — silent fast flow
// 🔒 LEFT BOX LOCKED (guide box — no drawing allowed)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser } from 'lucide-react';

// 🎯 Andika font + opentype.js
import * as opentype from 'opentype.js';
import type { Font } from 'opentype.js';
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// 🔥 SINGLE INTRO AUDIO
const IntroAudio = "/assets/Math Assets/Numbers WriteLetter/intro.wav";

// 🔥 Progress sync
import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';

// 🔥 Storage upload
import { uploadFaintTraceCapture } from '@/lib/supabase';

// ══════════════════════════════════════════════════════════════
//  ANDIKA FONT LOADER
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const BOX_BORDER_COLOR = '#2E8B57';
const BOX_BORDER_WIDTH = 2;

const STROKE_MIN_PX = 16;
const STROKE_SLOT_RATIO = 0.045;
const ERASER_MULTIPLIER = 2.0;

const GUIDE_COLOR = '#E30613';

interface NumberControl {
  zoneStart: number;
  zoneEnd: number;
  sizeRatio: number;
  widthRatio: number;
  nudgeY: number;
}

const DEFAULT_NUMBER: NumberControl = {
  zoneStart: 0.10,
  zoneEnd: 0.90,
  sizeRatio: 0.72,
  widthRatio: 0.78,
  nudgeY: 0,
};

const NUMBER_CONFIG: Record<string, NumberControl> = {
  '0': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '1': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '2': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '3': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '4': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '5': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '6': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '7': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '8': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
  '9': { zoneStart: 0.10, zoneEnd: 0.90, sizeRatio: 0.72, widthRatio: 0.78, nudgeY: 0 },
};

function getNumberControl(number: string): NumberControl {
  return NUMBER_CONFIG[number] ?? DEFAULT_NUMBER;
}

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
}

interface BoxSlot {
  id: number;
  label: string;
  rect: { x: number; y: number; width: number; height: number };
  isLeft: boolean;
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
    label: 'Practice',
    rect: {
      x: padding,
      y: padding + topPadding,
      width: boxWidth,
      height: boxHeight,
    },
    isLeft: true,
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
    isLeft: false,
  });

  return slots;
}

// ══════════════════════════════════════════════════════════════
//  GUIDE GLYPH PATH
// ══════════════════════════════════════════════════════════════

function buildGlyphPath(
  font: Font,
  number: string,
  control: NumberControl,
  boxWidth: number,
  boxHeight: number,
): string | null {
  if (!number || !font.hasChar(number)) return null;

  const glyph = font.charToGlyph(number);
  const unitsPerEm = font.unitsPerEm;

  const rawPath = glyph.getPath(0, 0, unitsPerEm);
  const rawBBox = rawPath.getBoundingBox();
  const glyphUnitHeight = rawBBox.y2 - rawBBox.y1;
  const glyphUnitWidth = rawBBox.x2 - rawBBox.x1;

  if (!(glyphUnitHeight > 0) || !(glyphUnitWidth > 0)) return null;

  const zoneTop = control.zoneStart * boxHeight;
  const zoneHeight = (control.zoneEnd - control.zoneStart) * boxHeight;

  const targetHeight = zoneHeight * control.sizeRatio;
  const targetMaxWidth = boxWidth * control.widthRatio;

  const scale = Math.min(targetHeight / glyphUnitHeight, targetMaxWidth / glyphUnitWidth);
  const fontSize = unitsPerEm * scale;

  const zoneCenterY = zoneTop + zoneHeight / 2 + control.nudgeY * boxHeight;
  const boxCenterX = boxWidth / 2;

  const scaledBBoxCenterX = ((rawBBox.x1 + rawBBox.x2) / 2) * scale;
  const scaledBBoxCenterY = ((rawBBox.y1 + rawBBox.y2) / 2) * scale;

  const originX = boxCenterX - scaledBBoxCenterX;
  const originY = zoneCenterY - scaledBBoxCenterY;

  const finalPath = glyph.getPath(originX, originY, fontSize);
  return finalPath.toPathData(2);
}

// ══════════════════════════════════════════════════════════════
//  🔥 CLEAN MANUAL CANVAS CAPTURE
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  boxSlots: BoxSlot[];
  guidePaths: Record<number, string | null>;
  inkCanvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

async function composeCleanWriteCapture(params: CaptureParams): Promise<string | null> {
  const {
    boardWidth,
    boardHeight,
    boxSlots,
    guidePaths,
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

    for (const slot of boxSlots) {
      const x = slot.rect.x * scale;
      const y = slot.rect.y * scale;
      const w = slot.rect.width * scale;
      const h = slot.rect.height * scale;

      // Box background (white with subtle fill)
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

      // Guide letter (left box only)
      if (slot.isLeft) {
        const guideD = guidePaths[slot.id];
        if (guideD) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          const path2d = new Path2D(guideD);
          ctx.fillStyle = GUIDE_COLOR;
          ctx.fill(path2d);
          ctx.restore();
        }
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
      ctx.lineWidth = BOX_BORDER_WIDTH * scale * 2;
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

    // Export as PNG
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[MathWriteLetter] PNG export failed');
      return null;
    }
    return dataUrl;
  } catch (err) {
    console.error('[MathWriteLetter] composeCleanWriteCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

function buildWriteSummary(
  studentName: string,
  numberDisplay: string,
  completed: boolean,
): string {
  if (completed) {
    return `${studentName} wrote the number '${numberDisplay}'.`;
  }
  return `${studentName} did not complete the lesson.`;
}

// ══════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════

const ANIMATION_CSS = `
  @keyframes wl-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes wl-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  .wl-pop-in { animation: wl-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .wl-tool-pop { animation: wl-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
`;

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function MathNumbersWriteLetterBase({
  number,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);
  const font = useAndikaFont();

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const [tool, setTool] = useState<Tool>({ kind: 'pen', color: '#1a1a1a' });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const [boxSlots, setBoxSlots] = useState<BoxSlot[]>([]);

  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [slotHasInk, setSlotHasInk] = useState<Record<number, boolean>>({});

  const [isNavigating, setIsNavigating] = useState(false);

  const isCheckingRef = useRef<boolean>(false);

  const inkCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  const captureUrlRef = useRef<string | null>(null);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const currentNumber = number;
  const numberDisplay = number;

  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const numberControl = useMemo(
    () => getNumberControl(currentNumber),
    [currentNumber],
  );

  const getStrokeWidth = useCallback((slotId: number): number => {
    const slot = boxSlots.find((s) => s.id === slotId);
    if (!slot) return Math.max(STROKE_MIN_PX, boardSize.height * 0.02) * dpr;
    const slotHeight = slot.rect.height;
    const base = Math.max(STROKE_MIN_PX, slotHeight * STROKE_SLOT_RATIO);
    return base * dpr;
  }, [boxSlots, boardSize.height, dpr]);

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
    const slots = calculateBoxLayout(boardSize.width, boardSize.height);
    setBoxSlots(slots);
  }, [boardSize]);

  const guidePaths = useMemo(() => {
    const map: Record<number, string | null> = {};
    if (!font || boxSlots.length === 0) return map;

    boxSlots.forEach((slot) => {
      if (!slot.isLeft) {
        map[slot.id] = null;
        return;
      }

      const path = buildGlyphPath(
        font,
        currentNumber,
        numberControl,
        slot.rect.width,
        slot.rect.height,
      );
      map[slot.id] = path;
    });

    return map;
  }, [font, boxSlots, currentNumber, numberControl]);

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
  }, [boxSlots, dpr]);

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
      if (slot?.isLeft) return;

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
      if (slot?.isLeft) return;

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

  // ═══════════════════════════════════════════════════════════
  //  CHECK — Clean manual capture
  // ═══════════════════════════════════════════════════════════
  const checkAll = useCallback(async () => {
    if (isNavigating) return;
    if (isCheckingRef.current) return;

    const writeSlots = boxSlots.filter((s) => !s.isLeft);
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

    try {
      // 🔥 MANUAL CLEAN CAPTURE
      let cleanDataUrl: string | null = null;
      if (boardSize.width > 0 && boardSize.height > 0) {
        cleanDataUrl = await composeCleanWriteCapture({
          boardWidth: boardSize.width,
          boardHeight: boardSize.height,
          boxSlots,
          guidePaths,
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
              'number',
            );

            if (publicUrl) {
              captureUrlRef.current = publicUrl;
              console.log('[MathWriteLetter] ✅ Capture URL:', publicUrl);
            } else {
              console.error('[MathWriteLetter] ❌ Upload failed');
            }
          } catch (err) {
            console.error('[MathWriteLetter] Upload error:', err);
          }
        }
      } else {
        console.error('[MathWriteLetter] ❌ No capture to upload');
      }

      saveFinalProgress();

      stopIntroAudio();

      navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
    } catch (err) {
      console.error('[MathWriteLetter] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    isNavigating, boxSlots, slotStates, slotHasInk,
    subject, level, lessonId, navigate, stopIntroAudio,
    boardSize, guidePaths, dpr,
  ]);

  const saveFinalProgress = useCallback(() => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const studentName = sessionData.student.studentName || "Student";

    const captures: string[] = [];
    if (captureUrlRef.current) captures.push(captureUrlRef.current);

    const summary = buildWriteSummary(studentName, numberDisplay, true);

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
        number: numberDisplay,
        captures,
        captureUrl: captureUrlRef.current,
        completed: true,
      },
    }).catch((err) => {
      console.error("[MathWriteLetter] Save completed failed:", err);
    });
  }, [numberDisplay, subject, level, lessonId]);

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
            if (captureUrlRef.current) captures.push(captureUrlRef.current);

            const summary = buildWriteSummary(studentName, numberDisplay, false);

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
                number: numberDisplay,
                captures,
                captureUrl: captureUrlRef.current,
                completed: false,
              },
            }).catch((err) => {
              console.warn("[MathWriteLetter] Save partial failed:", err);
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
        className={`wl-tool-pop relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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

  const writeSlots = boxSlots.filter((s) => !s.isLeft);
  const allHaveInk = writeSlots.length > 0 && writeSlots.every((s) => slotHasInk[s.id]);
  const isGameLocked = isNavigating;

  return (
    <div className="relative flex h-full w-full select-none flex-col">
      <style>{ANIMATION_CSS}</style>

      <div className="flex h-full w-full items-stretch">
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-r-3xl rounded-l-none border-b-[3px] border-r-[3px] border-t-0 border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)] md:w-16 md:gap-4 md:py-4">
            <button
              onClick={() => setTool({ kind: 'eraser' })}
              className={`wl-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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
              className={`wl-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                allHaveInk && !isGameLocked
                  ? 'border-white bg-green-500 shadow-lg hover:bg-green-600'
                  : 'border-white/40 bg-gray-400 cursor-not-allowed opacity-60'
              }`}
              aria-label={allHaveInk ? 'Check' : 'Write in the right box first'}
              title={allHaveInk ? 'Check' : 'Write in the right box first'}
            >
              <Check className="h-5 w-5 text-white" strokeWidth={4} />
            </button>
          </div>
        </div>

        <div
          ref={boardRef}
          className="relative flex-1 overflow-hidden rounded-3xl border-b-4 border-l-4 border-r-4 border-white bg-transparent mt-6"
          style={{ touchAction: 'none' }}
        >
          {boxSlots.map((slot) => {
            const state = slotStates[slot.id];
            const isCompleted = state?.isCompleted || false;
            const guideD = guidePaths[slot.id];

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
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-extrabold uppercase tracking-wider"
                  style={{ color: BOX_BORDER_COLOR }}
                >
                  {slot.label}
                </div>

                {slot.isLeft && guideD && (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${slot.rect.width} ${slot.rect.height}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    <path d={guideD} fill={GUIDE_COLOR} />
                  </svg>
                )}

                <canvas
                  ref={(el) => {
                    inkCanvasRefs.current[slot.id] = el;
                  }}
                  className="absolute inset-0 w-full h-full touch-none"
                  style={{
                    touchAction: 'none',
                    pointerEvents: isCompleted || slot.isLeft ? 'none' : 'auto',
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

export default MathNumbersWriteLetterBase;