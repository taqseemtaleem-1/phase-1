// src/components/games/Math/Numbers-Numbers Items Introduction/ItemsPacker.tsx
// 🔥 TIGHT GAPS + Balanced container sizes
// 🔥 Qty 1 chhota kiya, Qty 2 thoda chhota
// SVG fills cell fully (tight viewBox in itemSvgs.tsx)

import React from "react";

interface ItemsPackerProps {
  qty: number;
  ItemComponent: React.FC<{ size?: string | number; className?: string }>;
  groupKey: string;
  animationClass?: string;
  enterDelayMs?: number;
}

// ═══════════════════════════════════════════════════════════════
//  🔥 CUSTOM ROW PATTERNS
// ═══════════════════════════════════════════════════════════════
function getRowPattern(qty: number): number[] {
  switch (qty) {
    case 1: return [1];
    case 2: return [2];
    case 3: return [1, 2];
    case 4: return [2, 2];
    case 5: return [2, 3];
    case 6: return [3, 3];
    case 7: return [3, 4];
    case 8: return [2, 3, 3];
    case 9: return [3, 3, 3];
    default: return [qty];
  }
}

function getMaxCols(qty: number): number {
  const pattern = getRowPattern(qty);
  return Math.max(...pattern);
}

// 🔥 MINIMAL gaps
const ROW_GAP_PX = 2;
const ITEM_GAP_PX = 2;

// 🔥 Container size — balanced
function getContainerSize(qty: number): string {
  if (qty === 1) return "min(52vh, 420px)";   // 🔥 chhota kiya
  if (qty === 2) return "min(72vh, 580px)";   // thoda chhota
  if (qty === 3) return "min(78vh, 620px)";
  if (qty === 4) return "min(72vh, 580px)";
  if (qty === 5) return "min(74vh, 600px)";
  if (qty === 6) return "min(82vh, 660px)";
  if (qty === 7) return "min(86vh, 690px)";
  if (qty === 8) return "min(90vh, 720px)";
  return "min(90vh, 720px)";                   // 9
}

export function ItemsPacker({
  qty,
  ItemComponent,
  groupKey,
  animationClass = "",
  enterDelayMs = 80,
}: ItemsPackerProps) {
  if (qty <= 0) return null;

  const rowPattern = getRowPattern(qty);
  const maxCols = getMaxCols(qty);
  const containerSize = getContainerSize(qty);

  let globalIndex = 0;

  return (
    <div
      className={`flex items-center justify-center ${animationClass}`}
      style={{
        width: containerSize,
        maxWidth: "100%",
        overflow: "visible",
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{
          gap: `${ROW_GAP_PX}px`,
          width: "100%",
        }}
      >
        {rowPattern.map((itemsInRow, rowIdx) => (
          <div
            key={`row-${groupKey}-${rowIdx}`}
            className="flex items-center justify-center"
            style={{
              width: "100%",
              gap: `${ITEM_GAP_PX}px`,
              justifyContent: "center",
            }}
          >
            {Array.from({ length: itemsInRow }).map((_, colIdx) => {
              const idx = globalIndex++;
              return (
                <div
                  key={`item-${groupKey}-${idx}`}
                  className="mi-item-enter flex items-center justify-center"
                  style={{
                    width: `calc((100% - ${(maxCols - 1) * ITEM_GAP_PX}px) / ${maxCols})`,
                    aspectRatio: "1 / 1",
                    flexShrink: 0,
                    animationDelay: `${idx * enterDelayMs}ms`,
                    padding: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <ItemComponent size="100%" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ItemsPacker;