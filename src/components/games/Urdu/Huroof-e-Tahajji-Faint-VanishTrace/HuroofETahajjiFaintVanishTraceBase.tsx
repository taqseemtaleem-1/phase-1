// src/components/games/Urdu/Huroof-e-Tahajji-Faint-VanishTrace/HuroofETahajjiFaintVanishTraceBase.tsx
// ✅ 6-SLOT SYSTEM — 2 rows × 3 columns
// ✅ SIRF 2 LINES
// ✅ ROW-WISE CONTROL
// 🖼️ 100% PNG-BASED
// ✨ VANISH FEATURE
// 🎨 TOOLS: sirf Eraser + 4 colors + Check
// 🖊️ THICK STROKE + THICK ERASER
// 📸 Capture → MANUAL CANVAS COMPOSITION → Supabase Storage
// 📸 CAPTURE MEIN SIRF INK + RULED LINES — guide PNGs SHAAMIL NAHI
// 📝 Session-aware summary
// ❌ NO SAVING POPUP — silent background capture
// ❌ NO WAIT — vanish feature ka koi force-show ki zaroorat nahi

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser } from 'lucide-react';

import { saveProgress } from '@/lib/progressSync';
import { getSession } from '@/lib/auth';
import { uploadFaintTraceCapture } from '@/lib/supabase';

const introAudio = "/assets/Huroof-e-Tahajji-Faint-Trace Audio/intro.wav";

// ══════════════════════════════════════════════════════════════
//  🖼️ URDU LETTER PNG MODULES
// ══════════════════════════════════════════════════════════════

const LETTER_PNG_MODULES = import.meta.glob<string>(
  '@/assets/Urdu Letters PNG/*.png',
  { eager: true, query: '?url', import: 'default' },
);

function buildLetterPngMap(): Record<number, string> {
  const map: Record<number, string> = {};
  for (const [path, url] of Object.entries(LETTER_PNG_MODULES)) {
    const filename = path.split('/').pop() || '';
    const match = filename.match(/^(\d+)\.png$/i);
    if (match) {
      const num = Number(match[1]);
      if (num >= 1 && num <= 40) {
        map[num] = url;
      }
    }
  }
  return map;
}

const LETTER_PNG: Record<number, string> = buildLetterPngMap();

const LETTER_TO_NUMBER: Record<string, number> = {
  'ا': 1,  'آ': 2,  'ب': 3,  'پ': 4,
  'ت': 5,  'ٹ': 6,  'ث': 7,  'ج': 8,
  'چ': 9,  'ح': 10, 'خ': 11, 'د': 12,
  'ڈ': 13, 'ذ': 14, 'ر': 15, 'ڑ': 16,
  'ز': 17, 'ژ': 18, 'س': 19, 'ش': 20,
  'ص': 21, 'ض': 22, 'ط': 23, 'ظ': 24,
  'ع': 25, 'غ': 26, 'ف': 27, 'ق': 28,
  'ک': 29, 'گ': 30, 'ل': 31, 'م': 32,
  'ن': 33, 'ں': 34, 'و': 35, 'ہ': 36,
  'ھ': 37, 'ء': 38, 'ی': 39, 'ے': 40,
};

function getLetterPngUrl(letter: string): string {
  const num = LETTER_TO_NUMBER[letter];
  if (!num) return '';
  return LETTER_PNG[num] || '';
}

// ══════════════════════════════════════════════════════════════
//  LAYOUT CONFIG
// ══════════════════════════════════════════════════════════════

interface RowConfig {
  lettersTopPct: number;
  lettersHeightPct: number;
  bottomLinePct: number;
  letterSizeRatio: number;
  letterNudgeY: string;
}

interface LayoutConfig {
  row1: RowConfig;
  row2: RowConfig;
}

const DEFAULT_CONFIG: LayoutConfig = {
  row1: { lettersTopPct: 10, lettersHeightPct: 34, bottomLinePct: 46, letterSizeRatio: 1.0, letterNudgeY: '0%' },
  row2: { lettersTopPct: 58, lettersHeightPct: 34, bottomLinePct: 94, letterSizeRatio: 1.0, letterNudgeY: '0%' },
};

const PER_LETTER_CONFIG: Record<string, LayoutConfig> = {
  'ا': {
    row1: { lettersTopPct: 6, lettersHeightPct: 35, bottomLinePct: 40, letterSizeRatio: 1.6, letterNudgeY: '0%' },
    row2: { lettersTopPct: 56, lettersHeightPct: 35, bottomLinePct: 90, letterSizeRatio: 1.6, letterNudgeY: '0%' },
  },
  'آ': {
    row1: { lettersTopPct: 6, lettersHeightPct: 35, bottomLinePct: 40, letterSizeRatio: 1.4, letterNudgeY: '0%' },
    row2: { lettersTopPct: 56, lettersHeightPct: 35, bottomLinePct: 90, letterSizeRatio: 1.4, letterNudgeY: '0%' },
  },
  'ب': {
    row1: { lettersTopPct: 15, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.6, letterNudgeY: '4%' },
    row2: { lettersTopPct: 60, lettersHeightPct: 30, bottomLinePct: 80, letterSizeRatio: 1.6, letterNudgeY: '4%' },
  },
  'پ': {
    row1: { lettersTopPct: 20, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.4, letterNudgeY: '4%' },
    row2: { lettersTopPct: 65, lettersHeightPct: 30, bottomLinePct: 80, letterSizeRatio: 1.4, letterNudgeY: '4%' },
  },
  'ت': {
    row1: { lettersTopPct: 5, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.4, letterNudgeY: '2%' },
    row2: { lettersTopPct: 60, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.4, letterNudgeY: '2%' },
  },
  'ٹ': {
    row1: { lettersTopPct: 5, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.4, letterNudgeY: '2%' },
    row2: { lettersTopPct: 60, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.4, letterNudgeY: '2%' },
  },
  'ث': {
    row1: { lettersTopPct: 5, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.4, letterNudgeY: '2%' },
    row2: { lettersTopPct: 60, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.4, letterNudgeY: '2%' },
  },
  'ج': {
    row1: { lettersTopPct: 12, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.2, letterNudgeY: '4%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 30, bottomLinePct: 80, letterSizeRatio: 1.2, letterNudgeY: '4%' },
  },
  'چ': {
    row1: { lettersTopPct: 12, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.2, letterNudgeY: '4%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 30, bottomLinePct: 80, letterSizeRatio: 1.2, letterNudgeY: '4%' },
  },
  'ح': {
    row1: { lettersTopPct: 12, lettersHeightPct: 30, bottomLinePct: 35, letterSizeRatio: 1.2, letterNudgeY: '4%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 30, bottomLinePct: 80, letterSizeRatio: 1.2, letterNudgeY: '4%' },
  },
  'خ': {
    row1: { lettersTopPct: 8, lettersHeightPct: 33, bottomLinePct: 35, letterSizeRatio: 1.2, letterNudgeY: '4%' },
    row2: { lettersTopPct: 55, lettersHeightPct: 33, bottomLinePct: 80, letterSizeRatio: 1.2, letterNudgeY: '4%' },
  },
  'د': {
    row1: { lettersTopPct: 12, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 61, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ڈ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ذ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ر': {
    row1: { lettersTopPct: 12, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 61, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ڑ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ز': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ژ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'س': {
    row1: { lettersTopPct: 20, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 69, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ش': {
    row1: { lettersTopPct: 15, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 65, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ص': {
    row1: { lettersTopPct: 20, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 69, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ض': {
    row1: { lettersTopPct: 15, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 65, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ط': {
    row1: { lettersTopPct: 13, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 62, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ظ': {
    row1: { lettersTopPct: 13, lettersHeightPct: 30, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 62, lettersHeightPct: 30, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ع': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.1, letterNudgeY: '4%' },
    row2: { lettersTopPct: 62, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.1, letterNudgeY: '4%' },
  },
  'غ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 38, bottomLinePct: 35, letterSizeRatio: 1.1, letterNudgeY: '4%' },
    row2: { lettersTopPct: 56, lettersHeightPct: 38, bottomLinePct: 85, letterSizeRatio: 1.1, letterNudgeY: '4%' },
  },
  'ف': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ق': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ک': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'گ': {
    row1: { lettersTopPct: 7, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 57, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ل': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'م': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 23, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 34, bottomLinePct: 73, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ن': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ں': {
    row1: { lettersTopPct: 13, lettersHeightPct: 34, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 34, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'و': {
    row1: { lettersTopPct: 13, lettersHeightPct: 31, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 31, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ہ': {
    row1: { lettersTopPct: 13, lettersHeightPct: 31, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 63, lettersHeightPct: 31, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ھ': {
    row1: { lettersTopPct: 16, lettersHeightPct: 25, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 66, lettersHeightPct: 25, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ء': {
    row1: { lettersTopPct: 22, lettersHeightPct: 25, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 70, lettersHeightPct: 25, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ی': {
    row1: { lettersTopPct: 18, lettersHeightPct: 32, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 67, lettersHeightPct: 32, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
  'ے': {
    row1: { lettersTopPct: 23, lettersHeightPct: 18, bottomLinePct: 40, letterSizeRatio: 1.7, letterNudgeY: '0%' },
    row2: { lettersTopPct: 72, lettersHeightPct: 18, bottomLinePct: 90, letterSizeRatio: 1.7, letterNudgeY: '0%' },
  },
};

function getLetterConfig(letter: string): LayoutConfig {
  const specific = PER_LETTER_CONFIG[letter];
  if (specific) return specific;
  return DEFAULT_CONFIG;
}

// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════

const LOCK_DURATION = 5000;
const GUIDE_OPACITY = 0.55;

const IDLE_TIMEOUT_MS = 2000;
const FADE_DURATION_MS = 300;

const HORIZONTAL_PADDING_PCT = 2;
const HORIZONTAL_GAP_PCT = 2;

const LINE_COLOR = '#9CA3AF';

const STROKE_MIN_PX = 16;
const STROKE_BOARD_RATIO = 0.028;
const ERASER_MULTIPLIER = 2.0;

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
  isGuideVisible: boolean;
}

interface SlotRect {
  id: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ══════════════════════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════════════════════

function buildTraceSummary(
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
    return `${studentName} traced both letters ${l1} and ${l2}.`;
  }
  if (letter1Done) {
    return `${studentName} traced the letter ${l1}.`;
  }
  if (letter2Done) {
    return `${studentName} traced the letter ${l2}.`;
  }
  return `${studentName} traced the letters ${l1} and ${l2}.`;
}

// ══════════════════════════════════════════════════════════════
//  🔥 MANUAL CANVAS COMPOSITION
//     ✅ Capture mein sirf: White bg + 2 grey ruled lines + Ink
//     ❌ Guide PNGs SHAAMIL NAHI
// ══════════════════════════════════════════════════════════════

interface CaptureParams {
  boardWidth: number;
  boardHeight: number;
  rowConfigs: { row1: RowConfig; row2: RowConfig };
  boardCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  dpr: number;
}

async function composeCleanCapture(params: CaptureParams): Promise<string | null> {
  const {
    boardWidth,
    boardHeight,
    rowConfigs,
    boardCanvasRef,
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

    // Ruled lines
    const lineHeightPx = Math.max(2, boardHeight * 0.004) * scale;

    const r1LineY = (rowConfigs.row1.bottomLinePct / 100) * boardHeight * scale;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = LINE_COLOR;
    ctx.fillRect(0, r1LineY, canvas.width, lineHeightPx);
    ctx.restore();

    const r2LineY = (rowConfigs.row2.bottomLinePct / 100) * boardHeight * scale;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = LINE_COLOR;
    ctx.fillRect(0, r2LineY, canvas.width, lineHeightPx);
    ctx.restore();

    // Ink
    const boardCanvas = boardCanvasRef.current;
    if (boardCanvas) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(
        boardCanvas,
        0, 0, boardCanvas.width, boardCanvas.height,
        0, 0, canvas.width, canvas.height,
      );
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      console.error('[UrduFaintVanish] PNG export failed');
      return null;
    }
    return dataUrl;
  } catch (err) {
    console.error('[UrduFaintVanish] composeCleanCapture failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════

const ANIMATION_CSS = `
  @keyframes uft-pop-in {
    0%   { opacity: 0; transform: scale(0.55); }
    65%  { opacity: 1; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes uft-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes uft-tool-pop {
    0%   { opacity: 0; transform: scale(0.8) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes uft-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
  }
  @keyframes uft-fade-in {
    0%   { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  .uft-pop-in { animation: uft-pop-in 0.4s cubic-bezier(.34,1.4,.64,1) both; }
  .uft-overlay-enter { animation: uft-overlay-in 0.15s ease-out both; }
  .uft-tool-pop { animation: uft-tool-pop 0.3s cubic-bezier(.34,1.4,.64,1) both; }
  .uft-fade-out { animation: uft-fade-out 0.3s ease-out both; }
  .uft-fade-in { animation: uft-fade-in 0.4s ease-out both; }
  .uft-lock-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    cursor: default;
    pointer-events: auto;
    border-radius: inherit;
  }

  .ufv-guide {
    transition: opacity ${FADE_DURATION_MS}ms ease-in-out;
  }
  .ufv-guide-hidden {
    opacity: 0 !important;
  }
`;

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export function HuroofETahajjiFaintVanishTraceBase({
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
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [dpr, setDpr] = useState(1);

  const [session, setSession] = useState<Session>('letter1');
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade-out' | 'fade-in'>('idle');

  const [tool, setTool] = useState<Tool>({ kind: 'pen', color: '#1a1a1a' });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [slotHasInk, setSlotHasInk] = useState<Record<number, boolean>>({});
  const [hasInkAnywhere, setHasInkAnywhere] = useState(false);

  const [isLocked, setIsLocked] = useState(true);
  const [showLockOverlay, setShowLockOverlay] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const [slotRects, setSlotRects] = useState<SlotRect[]>([]);

  const isCheckingRef = useRef<boolean>(false);

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idleTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastMoveTimeRef = useRef<Record<number, number>>({});

  const letter1CaptureUrlRef = useRef<string | null>(null);
  const letter2CaptureUrlRef = useRef<string | null>(null);

  const sessionStartTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const progressSavedRef = useRef<boolean>(false);
  const isMountedRef = useRef(true);

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introPlayedRef = useRef<boolean>(false);

  const currentLetter = session === 'letter1' ? letter1 : letter2;
  const currentConfig = getLetterConfig(currentLetter);
  const activeColor = tool.kind === 'pen' ? tool.color : null;

  const currentLetterPngUrl = useMemo(
    () => getLetterPngUrl(currentLetter),
    [currentLetter],
  );

  useEffect(() => {
    if (!currentLetterPngUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentLetterPngUrl;
  }, [currentLetterPngUrl]);

  const getStrokeWidth = useCallback((): number => {
    const base = Math.max(STROKE_MIN_PX, boardSize.height * STROKE_BOARD_RATIO);
    return base * dpr;
  }, [boardSize.height, dpr]);

  const startLock = useCallback(() => {
    setIsLocked(true);
    setShowLockOverlay(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setShowLockOverlay(false);
    }, LOCK_DURATION);
  }, []);

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
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    startLock();
  }, [session, startLock]);

  useEffect(() => {
    if (boardSize.width === 0 || boardSize.height === 0) return;

    const slotsPerRow = 3;
    const hPad = (HORIZONTAL_PADDING_PCT / 100) * boardSize.width;
    const hGap = (HORIZONTAL_GAP_PCT / 100) * boardSize.width;
    const totalWidth = boardSize.width - hPad * 2;
    const slotWidth = (totalWidth - hGap * (slotsPerRow - 1)) / slotsPerRow;

    const rowConfigs = [
      { top: currentConfig.row1.lettersTopPct, height: currentConfig.row1.lettersHeightPct, rowIndex: 0 },
      { top: currentConfig.row2.lettersTopPct, height: currentConfig.row2.lettersHeightPct, rowIndex: 1 },
    ];

    const rects: SlotRect[] = [];
    let slotId = 0;

    rowConfigs.forEach((rowCfg) => {
      const rowTopY = (rowCfg.top / 100) * boardSize.height;
      const rowHeight = (rowCfg.height / 100) * boardSize.height;

      for (let i = 0; i < slotsPerRow; i++) {
        const slotX = hPad + i * (slotWidth + hGap);
        rects.push({
          id: slotId++,
          row: rowCfg.rowIndex,
          x: slotX,
          y: rowTopY,
          width: slotWidth,
          height: rowHeight,
        });
      }
    });

    setSlotRects(rects);
  }, [boardSize, currentConfig]);

  useEffect(() => {
    if (slotRects.length === 0 || boardSize.width === 0 || boardSize.height === 0) return;

    const canvas = boardCanvasRef.current;
    if (!canvas) return;

    const pixelWidth = Math.max(1, Math.round(boardSize.width * dpr));
    const pixelHeight = Math.max(1, Math.round(boardSize.height * dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${boardSize.width}px`;
    canvas.style.height = `${boardSize.height}px`;

    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, pixelWidth, pixelHeight);

    const newSlotStates: Record<number, SlotState> = {};
    const newHasInk: Record<number, boolean> = {};
    slotRects.forEach((slot) => {
      newSlotStates[slot.id] = {
        isCompleted: false,
        isGuideVisible: true,
      };
      newHasInk[slot.id] = false;
    });
    setSlotStates(newSlotStates);
    setSlotHasInk(newHasInk);
    setHasInkAnywhere(false);

    Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
    idleTimersRef.current = {};
    lastMoveTimeRef.current = {};
  }, [slotRects, dpr, boardSize, session]);

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

  const ensureGuideVanished = useCallback(
    (slotId: number) => {
      vanishGuide(slotId);
    },
    [vanishGuide],
  );

  const updateLastMoveTime = useCallback(
    (slotId: number) => {
      lastMoveTimeRef.current[slotId] = Date.now();
      clearIdleTimer(slotId);
      startIdleTimer(slotId);
    },
    [clearIdleTimer, startIdleTimer],
  );

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
    (ctx: CanvasRenderingContext2D) => {
      const strokeWidth = getStrokeWidth();
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

  const findSlotAtPoint = useCallback(
    (x: number, y: number): number | null => {
      for (const slot of slotRects) {
        if (x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height) {
          return slot.id;
        }
      }
      return null;
    },
    [slotRects],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isLocked) return;
      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);
      const hitSlotId = findSlotAtPoint(point.x / dpr, point.y / dpr);
      if (hitSlotId !== null && slotStates[hitSlotId]?.isCompleted) return;

      setIsDrawing(true);
      setLastPoint(point);
      setHasInkAnywhere(true);

      if (hitSlotId !== null) {
        setSlotHasInk((prev) => ({ ...prev, [hitSlotId]: true }));
        if (tool.kind === 'pen') {
          ensureGuideVanished(hitSlotId);
          updateLastMoveTime(hitSlotId);
        }
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      applyStroke(ctx);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.01, point.y + 0.01);
      ctx.stroke();
      canvas.setPointerCapture(e.pointerId);
    },
    [
      isLocked, getCanvasPoint, findSlotAtPoint, slotStates,
      applyStroke, ensureGuideVanished, updateLastMoveTime, tool,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || isLocked) return;
      const canvas = e.currentTarget;
      const point = getCanvasPoint(e.clientX, e.clientY, canvas);
      if (!lastPoint) return;

      const hitSlotId = findSlotAtPoint(point.x / dpr, point.y / dpr);
      if (hitSlotId !== null) {
        setSlotHasInk((prev) =>
          prev[hitSlotId] ? prev : { ...prev, [hitSlotId]: true },
        );
        if (tool.kind === 'pen') {
          ensureGuideVanished(hitSlotId);
          updateLastMoveTime(hitSlotId);
        }
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      applyStroke(ctx);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setLastPoint(point);
    },
    [
      isDrawing, isLocked, getCanvasPoint, lastPoint, applyStroke, findSlotAtPoint,
      ensureGuideVanished, updateLastMoveTime, tool,
    ],
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const checkAll = useCallback(async () => {
    if (isLocked || isNavigating) return;
    if (isCheckingRef.current) return;
    if (!hasInkAnywhere) return;

    const pending = slotRects.filter((s) => !slotStates[s.id]?.isCompleted);
    if (pending.length === 0) return;

    isCheckingRef.current = true;
    setIsNavigating(true);

    stopIntroAudio();
    clearAllIdleTimers();

    const newStates = { ...slotStates };
    pending.forEach((slot) => {
      newStates[slot.id] = {
        ...newStates[slot.id],
        isCompleted: true,
        isGuideVisible: false,
      };
    });
    setSlotStates(newStates);

    const currentSession = session;

    try {
      // 🔥 CAPTURE — sirf ink + ruled lines, koi guide PNG nahi
      const cleanDataUrl = await composeCleanCapture({
        boardWidth: boardSize.width,
        boardHeight: boardSize.height,
        rowConfigs: { row1: currentConfig.row1, row2: currentConfig.row2 },
        boardCanvasRef,
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
                console.log('[UrduFaintVanish] ✅ Letter1 URL:', publicUrl);
              } else {
                letter2CaptureUrlRef.current = publicUrl;
                console.log('[UrduFaintVanish] ✅ Letter2 URL:', publicUrl);
              }
            } else {
              console.error('[UrduFaintVanish] ❌ Upload failed');
            }
          } catch (err) {
            console.error('[UrduFaintVanish] Upload error:', err);
          }
        }
      } else {
        console.error('[UrduFaintVanish] ❌ No capture');
      }

      if (currentSession === 'letter2') {
        saveBothSessionsProgress();
      }

      if (currentSession === 'letter1') {
        setIsLocked(true);
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
      console.error('[UrduFaintVanish] checkAll failed:', err);
      setIsNavigating(false);
      isCheckingRef.current = false;
    }
  }, [
    isLocked, isNavigating, slotRects, slotStates, hasInkAnywhere,
    session, subject, level, lessonId, navigate, stopIntroAudio,
    clearAllIdleTimers, boardSize, currentConfig, dpr,
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

    const summary = buildTraceSummary(
      studentName,
      letter1, letter1Name || "",
      letter2, letter2Name || "",
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
      console.error("[UrduFaintVanish] Save completed failed:", err);
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

      Object.values(idleTimersRef.current).forEach((t) => clearTimeout(t));
      idleTimersRef.current = {};

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

            const summary = buildTraceSummary(
              studentName,
              letter1, letter1Name || "",
              letter2, letter2Name || "",
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
              console.warn("[UrduFaintVanish] Save partial failed:", err);
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
        className={`uft-tool-pop relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
          isActive ? 'border-white ring-4 ring-yellow-400 shadow-lg' : 'border-white/50 hover:border-white shadow'
        }`}
        style={{
          backgroundColor: p.color,
          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
        }}
        aria-label={`Pen color ${p.label}`}
      >
        {isActive && <Check className="h-3 w-3 text-white drop-shadow-md" strokeWidth={4} />}
      </button>
    );
  };

  const pendingSlots = slotRects.filter((s) => !slotStates[s.id]?.isCompleted);
  const isCheckReady = pendingSlots.length > 0 && hasInkAnywhere;
  const isGameLocked = isLocked || isNavigating;

  const getTransitionClass = () => {
    if (transitionPhase === 'fade-out') return 'uft-fade-out';
    if (transitionPhase === 'fade-in') return 'uft-fade-in';
    return '';
  };

  const slotHeightRow1Px = boardSize.height * (currentConfig.row1.lettersHeightPct / 100);
  const slotHeightRow2Px = boardSize.height * (currentConfig.row2.lettersHeightPct / 100);

  return (
    <div className={`relative flex h-full w-full select-none flex-col ${getTransitionClass()}`} dir="rtl">
      <style>{ANIMATION_CSS}</style>

      {showLockOverlay && <div className="uft-lock-overlay uft-overlay-enter" />}

      <div className="flex h-full w-full items-stretch" dir="ltr">
        <div className="flex h-full w-14 shrink-0 items-center justify-center">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-r-3xl rounded-l-none border-b-[3px] border-r-[3px] border-t-0 border-white bg-gradient-to-b from-[#3fd0cf] to-[#35b8b7] px-2 py-3 shadow-[0_6px_0_rgba(0,0,0,0.12)] md:w-16 md:gap-4 md:py-4">
            <button
              onClick={() => setTool({ kind: 'eraser' })}
              className={`uft-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
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
              disabled={!isCheckReady || isGameLocked}
              className={`uft-tool-pop flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                isCheckReady && !isGameLocked
                  ? 'border-white bg-green-500 shadow-lg hover:bg-green-600'
                  : 'border-white/40 bg-gray-400 cursor-not-allowed opacity-60'
              }`}
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
          {boardSize.height > 0 && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <div
                className="absolute left-0 right-0"
                style={{
                  top: `${currentConfig.row1.bottomLinePct}%`,
                  height: '3px',
                  background: LINE_COLOR,
                  opacity: 0.75,
                }}
              />
              <div
                className="absolute left-0 right-0"
                style={{
                  top: `${currentConfig.row2.bottomLinePct}%`,
                  height: '3px',
                  background: LINE_COLOR,
                  opacity: 0.75,
                }}
              />
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none z-10">
            {currentLetterPngUrl &&
              slotRects.map((slot) => {
                const slotConfig =
                  slot.row === 0 ? currentConfig.row1 : currentConfig.row2;
                const slotHeightPx =
                  slot.row === 0 ? slotHeightRow1Px : slotHeightRow2Px;
                const letterHeight = Math.max(
                  24,
                  slotHeightPx * slotConfig.letterSizeRatio,
                );

                const state = slotStates[slot.id];
                const isGuideVisible = state?.isGuideVisible ?? true;

                return (
                  <div
                    key={`guide-${slot.id}`}
                    className="absolute flex items-center justify-center pointer-events-none"
                    style={{
                      left: slot.x,
                      top: slot.y,
                      width: slot.width,
                      height: slot.height,
                      transform: `translateY(${slotConfig.letterNudgeY})`,
                    }}
                  >
                    <img
                      src={currentLetterPngUrl}
                      alt=""
                      draggable={false}
                      className={`ufv-guide ${!isGuideVisible ? 'ufv-guide-hidden' : ''}`}
                      style={{
                        height: `${letterHeight}px`,
                        width: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        opacity: GUIDE_OPACITY,
                        display: 'block',
                        userSelect: 'none',
                        WebkitUserDrag: 'none',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                );
              })}
          </div>

          <canvas
            ref={boardCanvasRef}
            className="absolute inset-0 w-full h-full touch-none z-20"
            style={{
              touchAction: 'none',
              pointerEvents: 'auto',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>
    </div>
  );
}

export default HuroofETahajjiFaintVanishTraceBase;