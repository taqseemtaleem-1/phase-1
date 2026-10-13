// src/components/games/English/Alphabet-Assessment/AlphabetWriteLetterBulkBase.tsx
// ✅ ASSESSMENT version of AlphabetWriteLetterBase
// ✅ ONE LESSON = INTERLEAVED SESSIONS (A → a → B → b → ... → Z → z)
//    Session pairs: Capital letter first, then its Small letter
// 🖊️ 2 BOXES PER SESSION (LEFT: RED guide | RIGHT: empty write box)
// 📏 Ruled lines inside each box (3 red/blue lines)
// 🎯 HAR LETTER KA APNA CONTROL (52 letters: A-Z + a-z)
// 🖊️ THICK STROKE + THICK ERASER
// 📸 Capture per session → Supabase Storage (MANUAL CANVAS — clean sharp)
// 📝 Per-session results saved to gameData
// ❌ SAVING POPUP REMOVED — silent background capture
// 🔒 LEFT BOX LOCKED (guide box — no drawing allowed)
//
// ✅ ADDED: Intro audio plays ONCE at lesson start
// ✅ UPDATED (v2): SUMMARY — per-session "Letter A (Capital) - Written"
// ✅ UPDATED (v3): MANUAL CANVAS CAPTURE SYSTEM (from AlphabetWriteLetterBase)
// ✅ UPDATED (v4): SAVING POPUP REMOVED — fast silent flow like base

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser } from 'lucide-react';

// 🎯 Andika font + opentype.js
import * as opentype from 'opentype.js';
import type { Font } from 'opentype.js';
const andikaFontUrl = "/assets/Andika/Andika-Regular.ttf";

// ✅ Intro audio — plays once at lesson start
const introAudio = "/assets/Alphabet-WriteLetter Audio/Intro Audio A-Z.wav";

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

const BOX_BORDER_COLOR = '#4D82F6';
const BOX_BORDER_WIDTH = 4;

const STROKE_MIN_PX = 16;
const STROKE_SLOT_RATIO = 0.045;
const ERASER_MULTIPLIER = 2.0;

const GUIDE_COLOR = '#E30613';

const RULED_LINE_POSITIONS = {
  top: 0.20,
  middle: 0.50,
  bottom: 0.80,
};

// ══════════════════════════════════════════════════════════════
//  🎛️ LETTER CONFIG
// ══════════════════════════════════════════════════════════════

interface LetterControl {
  zoneStart: number;
  zoneEnd: number;
  sizeRatio: number;
  widthRatio: number;
  nudgeY: number;
}

const DEFAULT_CAPITAL: LetterControl = {
  zoneStart: 0.20,
  zoneEnd: 0.50,
  sizeRatio: 0.92,
  widthRatio: 0.78,
  nudgeY: 0,
};

const DEFAULT_SMALL: LetterControl = {
  zoneStart: 0.20,
  zoneEnd: 0.80,
  sizeRatio: 0.92,
  widthRatio: 0.78,
  nudgeY: 0,
};

const LETTER_CONFIG: Record<string, LetterControl> = {
  'A': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'B': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'C': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'D': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'E': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'F': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'G': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'H': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'I': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'J': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'K': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'L': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'M': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'N': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'O': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'P': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'Q': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'R': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'S': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'T': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'U': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'V': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'W': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'X': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'Y': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },
  'Z': { zoneStart: 0.20, zoneEnd: 0.50, sizeRatio: 2, widthRatio: 0.78, nudgeY: +0.16 },

  'a': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'b': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.82, widthRatio: 0.78, nudgeY: +0.07 },
  'c': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'd': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.82, widthRatio: 0.78, nudgeY: +0.07 },
  'e': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'f': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.85, widthRatio: 0.78, nudgeY: +0.09 },
  'g': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.75, widthRatio: 0.78, nudgeY: +0.23 },
  'h': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.82, widthRatio: 0.78, nudgeY: +0.07 },
  'i': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.68, widthRatio: 0.78, nudgeY: +0.11 },
  'j': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.85, widthRatio: 0.78, nudgeY: +0.18 },
  'k': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.92, widthRatio: 0.78, nudgeY: +0.04 },
  'l': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.90, widthRatio: 0.78, nudgeY: +0.04 },
  'm': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'n': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'o': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'p': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.75, widthRatio: 0.78, nudgeY: +0.23 },
  'q': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.75, widthRatio: 0.78, nudgeY: +0.23 },
  'r': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  's': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  't': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.73, widthRatio: 0.78, nudgeY: +0.09 },
  'u': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'v': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'w': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'x': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
  'y': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.75, widthRatio: 0.78, nudgeY: +0.23 },
  'z': { zoneStart: 0.20, zoneEnd: 0.80, sizeRatio: 0.50, widthRatio: 0.78, nudgeY: +0.16 },
};

function getLetterControl(letter: string, isCapital: boolean): LetterControl {
  const config = LETTER_CONFIG[letter];
  if (config) return config;
  return isCapital ? DEFAULT_CAPITAL : DEFAULT_SMALL;
}

// ══════════════════════════════════════════════════════════════
//  SWATCHES
// ══════════════════════════════════════════════════════════════

const SWATCHES = [
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'red', color: '#e30613', label: 'Red' },
  { id: 'green', color: '#1aa64b', label: 'Green' },
  { id: 'blue', color: '#1e4dd8', label: 'Blue' },
];

type Tool = { kind: 'pen'; color: string } | { kind: 'eraser' };
type SessionType = 'capital' | 'small';

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
  isLeft: boolean;
}

interface SessionDescriptor {
  index: number;
  type: SessionType;
  letter: string;
  letterUpper: string;
  label: string;
}

interface SessionCapture {
  index: number;
  type: SessionType;
  letter: string;
  captureUrl: string | null;
  timeSec: number;
}

// ══════════════════════════════════════════════════════════════
//  SESSION DESCRIPTORS — Interleaved (A, a, B, b, ... Z, z)
// ══════════════════════════════════════════════════════════════

function buildSessionDescriptors(letters: string[]): SessionDescriptor[] {
  const cleanLetters = letters.filter(Boolean).map((l) => l.toUpperCase());

  const descriptors: SessionDescriptor[] = [];

  cleanLetters.forEach((upper, i) => {
    const lower = upper.toLowerCase();

    descriptors.push({
      index: i * 2,
      type: 'capital',
      letter: upper,
      letterUpper: upper,
      label: `${upper} (Capital)`,
    });

    descriptors.push({
      index: i * 2 + 1,
      type: 'small',
      letter: lower,
      letterUpper: upper,
      label: `${lower} (Small)`,
    });
  });

  return descriptors;
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
  letter: string,
  control: LetterControl,
  boxWidth: number,
  boxHeight: number,
): string | null {
  if (!letter || !font.hasChar(letter)) return null;

  const glyph = font.charToGlyph(letter);
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
//  🔥 MANUAL CANVAS COMPOSITION — Clean high-quality capture
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  boxSlots: BoxSlot[];
  guidePaths: Record<number, string | null>;
  inkCanvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  lineCanvasRefs: React.MutableRefObject<Record<number, HTMLCanvasElement | null>>;
  dpr: number;
}

async function composeCleanCapture(params: CaptureParams): Promise<string | null> {
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

    // 1. White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Per-box: border, ruled lines, guide, ink
    for (const slot of boxSlots) {
      const x = slot.rect.x * scale;
      const y = slot.rect.y * scale;
      const w = slot.rect.width * scale;
      const h = slot.rect.height * scale;

      // 2a. Box background
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

      // 2b. Ruled lines
      const linePositions = [
        { position: RULED_LINE_POSITIONS.top, color: '#FF2B2B' },
        { position: RULED_LINE_POSITIONS.middle, color: '#1E4DD8' },
        { position: RULED_LINE_POSITIONS.bottom, color: '#1E4DD8' },
      ];
      const lineHeight = Math.max(2, h * 0.008);

      for (const line of linePositions) {
        const ly = y + h * line.position;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = line.color;
        ctx.lineWidth = lineHeight;
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + w, ly);
        ctx.stroke();
        ctx.restore();
      }

      // 2c. Guide letter (left box only)
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

      // 2d. Ink
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
          h
        );
        ctx.restore();
      }

      // 2e. Box border (on top)
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

    // 3. Export as PNG
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[WriteLetterBulk] PNG export failed');
      return null;
    }

    return dataUrl;
  } catch (err) {
    console.error('[WriteLetterBulk] composeCleanCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  🔥 SUMMARY BUILDER
// ══════════════════════════════════════════════════════════════

function buildBulkSummary(
  studentName: string,
  sessions: SessionDescriptor[],
  captures: SessionCapture[],
  completed: boolean,
): string {
  if (!completed) {
    return `${studentName} did not complete the Write Letter lesson.`;
  }

  const lines: string[] = [];

  for (const s of sessions) {
    const cap = captures.find((c) => c.index === s.index);
    const status = cap?.captureUrl ? 'Written' : 'Missed';
    const typeLabel = s.type === 'capital' ? 'Capital' : 'Small';
    lines.push(`Letter ${s.letter} (${typeLabel}) - ${status}`);
  }

  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════
//  CSS (popup CSS removed)
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
  @keyframes wl-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes wl-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .wl-pop-in { animation: wl-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .wl-tool-pop { animation: wl-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .wl-fade-out { animation: wl-fade-out 0.3s ease-out both; }
  .wl-fade-in { animation: wl-fade-in 0.4s ease-out both; }
`;

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function AlphabetWriteLetterBulkBase({
  letters,
  subject,
  level,
  lessonId,
}: Props) {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);
  const font = useAndikaFont();

  const sessions = useMemo(() => buildSessionDescriptors(letters), [letters]);
  const totalSessions = sessions.length;

  const [sessionIndex, setSessionIndex] = useState(0);
  const currentSession = sessions[sessionIndex] || sessions[0];

  const currentLetter = currentSession?.letter || 'A';
  const isCapitalSession = currentSession?.type === 'capital';
  const currentSessionType = currentSession?.type || 'capital';

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
  const lineCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  const sessionCapturesRef = useRef<SessionCapture[]>(
    sessions.map((s) => ({
      index: s.index,
      type: s.type,
      letter: s.letter,
      captureUrl: null,
      timeSec: 0,
    })),
  );

  const sessionStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeForCurrentRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const letterControl = useMemo(
    () => getLetterControl(currentLetter, isCapitalSession),
    [currentLetter, isCapitalSession],
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

  useEffect(() => {
    isMountedRef.current = true;

    sessionStartTimeRef.current = Date.now();
    sessionStartTimeForCurrentRef.current = Date.now();
    completedRef.current = false;
    progressSavedRef.current = false;

    // 🔥 Intro audio — plays once, fire-and-forget
    try {
      const audio = new Audio(introAudio);
      introAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch {}

    return () => {
      isMountedRef.current = false;
      stopIntroAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

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
        currentLetter,
        letterControl,
        slot.rect.width,
        slot.rect.height,
      );
      map[slot.id] = path;
    });

    return map;
  }, [font, boxSlots, currentLetter, letterControl]);

  // CANVAS SETUP (runs on session change to reset)
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
            { position: RULED_LINE_POSITIONS.top, color: '#FF2B2B' },
            { position: RULED_LINE_POSITIONS.middle, color: '#1E4DD8' },
            { position: RULED_LINE_POSITIONS.bottom, color: '#1E4DD8' },
          ];

          const lineHeight = Math.max(2, pixelHeight * 0.008);

          linePositions.forEach((line) => {
            const y = pixelHeight * line.position;
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.globalAlpha = 0.5;
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

  // ══════════════════════════════════════════════════════════
  //  CHECK — Silent background capture + fast advance
  //  🔥 NO POPUP — same as AlphabetWriteLetterBase
  // ══════════════════════════════════════════════════════════
  const checkAll = useCallback(async () => {
    if (isNavigating) return;
    if (isCheckingRef.current) return;

    const writeSlots = boxSlots.filter((s) => !s.isLeft);
    const allHaveInk = writeSlots.length > 0 && writeSlots.every((s) => slotHasInk[s.id]);
    if (!allHaveInk) return;

    isCheckingRef.current = true;
    setIsNavigating(true);

    // Mark slots complete (visual feedback)
    const newStates = { ...slotStates };
    boxSlots.forEach((slot) => {
      newStates[slot.id] = { ...newStates[slot.id], isCompleted: true };
    });
    setSlotStates(newStates);

    const currentIdx = sessionIndex;
    const currentType = currentSessionType;
    const currentLtr = currentLetter;

    try {
      // 🔥 Manual canvas composition — clean capture
      let cleanDataUrl: string | null = null;
      if (boardSize.width > 0 && boardSize.height > 0) {
        cleanDataUrl = await composeCleanCapture({
          boardWidth: boardSize.width,
          boardHeight: boardSize.height,
          boxSlots,
          guidePaths,
          inkCanvasRefs,
          lineCanvasRefs,
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
              `${currentType}-${currentLtr}`,
            );

            if (publicUrl) {
              const elapsed = Math.floor(
                (Date.now() - sessionStartTimeForCurrentRef.current) / 1000,
              );
              sessionCapturesRef.current[currentIdx] = {
                index: currentIdx,
                type: currentType,
                letter: currentLtr,
                captureUrl: publicUrl,
                timeSec: elapsed,
              };
              console.log(
                `[WriteLetterBulk] ✅ Session ${currentIdx + 1} (${currentType} ${currentLtr}) URL:`,
                publicUrl,
              );
            } else {
              console.error(
                `[WriteLetterBulk] ❌ Upload failed for session ${currentIdx + 1}`,
              );
            }
          } catch (err) {
            console.error('[WriteLetterBulk] Upload error:', err);
          }
        }
      } else {
        console.error('[WriteLetterBulk] ❌ No capture to upload');
      }

      const isLastSession = currentIdx >= totalSessions - 1;

      // 🔥 Save progress if last session
      if (isLastSession) {
        saveFinalProgress();
      }

      // 🔥 Navigate immediately — NO POPUP, NO DELAY
      if (isLastSession) {
        navigate({ to: "/levels", search: { subject, level, openPopup: "true" } });
      } else {
        setTransitionPhase('fade-out');
        transitionTimerRef.current = setTimeout(() => {
          const nextIdx = currentIdx + 1;
          setSessionIndex(nextIdx);
          sessionStartTimeForCurrentRef.current = Date.now();
          setTransitionPhase('fade-in');
          setIsNavigating(false);
          isCheckingRef.current = false;
          transitionTimerRef.current = setTimeout(() => {
            setTransitionPhase('idle');
          }, 500);
        }, 500);
      }
    } catch (err) {
      console.error('[WriteLetterBulk] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    isNavigating,
    boxSlots,
    slotStates,
    slotHasInk,
    sessionIndex,
    currentSessionType,
    currentLetter,
    totalSessions,
    subject,
    level,
    lessonId,
    navigate,
    boardSize,
    guidePaths,
    dpr,
  ]);

  // ══════════════════════════════════════════════════════════
  //  SAVE FINAL PROGRESS (bulk)
  // ══════════════════════════════════════════════════════════
  const saveFinalProgress = useCallback(() => {
    if (completedRef.current || progressSavedRef.current) return;
    completedRef.current = true;
    progressSavedRef.current = true;

    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    const sessionData = getSession();
    if (!sessionData?.student) return;

    const studentName = sessionData.student.studentName || 'Student';

    const cleanLetters = letters.filter(Boolean).map((l) => l.toUpperCase());

    const captures = sessionCapturesRef.current.map((c) => ({
      index: c.index,
      type: c.type,
      letter: c.letter,
      captureUrl: c.captureUrl,
      timeSec: c.timeSec,
    }));

    const capitalDone = cleanLetters.every((upper) => {
      const capitalIdx = sessions.findIndex(
        (s) => s.type === 'capital' && s.letter === upper,
      );
      return capitalIdx >= 0 && !!sessionCapturesRef.current[capitalIdx]?.captureUrl;
    });
    const smallDone = cleanLetters.every((upper) => {
      const smallIdx = sessions.findIndex(
        (s) => s.type === 'small' && s.letterUpper === upper,
      );
      return smallIdx >= 0 && !!sessionCapturesRef.current[smallIdx]?.captureUrl;
    });

    const summary = buildBulkSummary(
      studentName,
      sessions,
      sessionCapturesRef.current,
      true,
    );

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
        type: 'alphabet-write-letter-bulk',
        lessonType: 'write-letter-bulk',
        letters: cleanLetters,
        totalSessions,
        sessions,
        captures,
        completed: true,
        capitalDone,
        smallDone,
      },
    }).catch((err) => {
      console.error('[WriteLetterBulk] Save completed failed:', err);
    });
  }, [letters, sessions, totalSessions, subject, level, lessonId]);

  // ══════════════════════════════════════════════════════════
  //  PARTIAL SAVE ON UNMOUNT
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (!completedRef.current && !progressSavedRef.current) {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        if (elapsed >= 1) {
          const sessionData = getSession();
          if (sessionData?.student) {
            progressSavedRef.current = true;
            const studentName = sessionData.student.studentName || 'Student';
            const cleanLetters = letters.filter(Boolean).map((l) => l.toUpperCase());

            const captures = sessionCapturesRef.current.map((c) => ({
              index: c.index,
              type: c.type,
              letter: c.letter,
              captureUrl: c.captureUrl,
              timeSec: c.timeSec,
            }));

            const summary = buildBulkSummary(
              studentName,
              sessions,
              sessionCapturesRef.current,
              false,
            );

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
                type: 'alphabet-write-letter-bulk',
                lessonType: 'write-letter-bulk',
                letters: cleanLetters,
                totalSessions,
                sessions,
                captures,
                completed: false,
              },
            }).catch((err) => {
              console.warn('[WriteLetterBulk] Save partial failed:', err);
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

  const getTransitionClass = () => {
    if (transitionPhase === 'fade-out') return 'wl-fade-out';
    if (transitionPhase === 'fade-in') return 'wl-fade-in';
    return '';
  };

  return (
    <div className={`relative flex h-full w-full select-none flex-col ${getTransitionClass()}`}>
      <style>{ANIMATION_CSS}</style>

      <div className="flex h-full w-full items-stretch">
        {/* Tools */}
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

        {/* Board */}
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

export default AlphabetWriteLetterBulkBase;