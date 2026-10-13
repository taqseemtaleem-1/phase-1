// File: src/components/games/English/Alphabet-FaintTrace/ruledLineHelpers.ts

import type { Font } from 'opentype.js';

export type SlotKind = 'solid' | 'practice';

export interface RuledLineSlot {
  id: number;
  row: 0 | 1;
  index: number;
  kind: SlotKind;
  rect: { x: number; y: number; width: number; height: number };
  letter: string;
}

export interface RuledLineLayout {
  rows: {
    top: number;
    height: number;
    slots: RuledLineSlot[];
  }[];
  allSlots: RuledLineSlot[];
  practiceSlots: RuledLineSlot[];
  solidSlot: RuledLineSlot | null;
}

const SLOTS_PER_ROW = 3;
const ROW_COUNT = 2;
export const SLOT_PADDING = 10;
export const SLOT_GAP = 8;

export function calculateLayout(
  boardWidth: number,
  boardHeight: number,
  letter: string
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
      // 🔥 AB SAB PRACTICE SLOTS HAIN - KOI SOLID NAHI
      const slotX = slotPadding + index * (slotWidth + slotGap);
      const slotY = rowTop + slotPadding;
      const slotHeight = rowHeight - slotPadding * 2;

      slots.push({
        id: slotId++,
        row: row as 0 | 1,
        index,
        kind: 'practice', // 🔥 SAB PRACTICE
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

// ─── Rest of the file remains exactly the same ──────────────
export function isPointInSlot(x: number, y: number, slot: RuledLineSlot): boolean {
  const { rect } = slot;
  const margin = 5;
  return (
    x >= rect.x - margin &&
    x <= rect.x + rect.width + margin &&
    y >= rect.y - margin &&
    y <= rect.y + rect.height + margin
  );
}

export const LINE_TOP = 0.04;
export const LINE_2ND = 0.33;
export const LINE_BASELINE = 0.66;
export const LINE_BOTTOM = 0.96;

const DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y']);
const ASCENDERS = new Set(['b', 'd', 'f', 'h', 'k', 'l', 't']);

export function getLetterZone(letter: string, isCapital: boolean): [number, number] {
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

const FILL_RATIO = 0.94;
const MAX_WIDTH_RATIO = 0.86;

export function buildGlyphPath(
  font: Font,
  letter: string,
  zoneStart: number,
  zoneEnd: number,
  rowHeight: number,
  verticalOffset: number,
  boxWidth: number
): string | null {
  if (!letter || !font.hasChar(letter)) return null;

  const glyph = font.charToGlyph(letter);
  const unitsPerEm = font.unitsPerEm;

  const rawPath = glyph.getPath(0, 0, unitsPerEm);
  const rawBBox = rawPath.getBoundingBox();
  const glyphUnitHeight = rawBBox.y2 - rawBBox.y1;
  const glyphUnitWidth = rawBBox.x2 - rawBBox.x1;

  if (!(glyphUnitHeight > 0) || !(glyphUnitWidth > 0)) return null;

  const zoneTopInRow = zoneStart * rowHeight;
  const zoneHeight = (zoneEnd - zoneStart) * rowHeight;
  const zoneTopLocal = zoneTopInRow - verticalOffset;

  const targetHeight = zoneHeight * FILL_RATIO;
  const targetMaxWidth = boxWidth * MAX_WIDTH_RATIO;

  const scale = Math.min(targetHeight / glyphUnitHeight, targetMaxWidth / glyphUnitWidth);
  const fontSize = unitsPerEm * scale;

  const zoneCenterYLocal = zoneTopLocal + zoneHeight / 2;
  const boxCenterX = boxWidth / 2;

  const scaledBBoxCenterX = ((rawBBox.x1 + rawBBox.x2) / 2) * scale;
  const scaledBBoxCenterY = ((rawBBox.y1 + rawBBox.y2) / 2) * scale;

  const originX = boxCenterX - scaledBBoxCenterX;
  const originY = zoneCenterYLocal - scaledBBoxCenterY;

  const finalPath = glyph.getPath(originX, originY, fontSize);
  return finalPath.toPathData(2);
}