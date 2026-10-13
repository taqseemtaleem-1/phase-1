import React, { useRef, useEffect, useCallback } from 'react';
import { useLetterTracing } from './useLetterTracing';
import { toSvgCoords } from './traceEventHelpers';
import letterPaths from './letterPaths.json';

/**
 * LetterTraceExample (v3 - ruled notebook lines + tight box)
 * -------------------------------------------------------------
 * WHAT'S NEW vs v2:
 *  - Uses each letter's `renderBox` (tight ink bounds) instead of a
 *    fixed 0-200 width, so there's no leftover blank space and no
 *    letter gets clipped.
 *  - Draws the 4 ruled notebook lines (top / dashed midline /
 *    baseline / bottom) using the shared `ruledLines` values from
 *    letterPaths.json. Because every letter was extracted with the
 *    SAME scale + baseline, these 4 numbers work for every letter,
 *    uppercase or lowercase, with zero per-letter adjustment.
 *
 * WHAT DIDN'T CHANGE:
 *  - useLetterTracing.js and traceEventHelpers.js are untouched.
 *    Tracing detection is based on the actual rendered <path>
 *    geometry, not on the SVG's viewBox, so trimming the viewBox
 *    here does not affect tracing accuracy at all.
 *  - letterPaths.json's `d` path data is unchanged (only new fields
 *    were ADDED: renderBox, ruledLines). Nothing here should ever
 *    write back to that file - it's read-only input.
 */

const { ruledLines } = letterPaths;

export default function LetterTraceExample({ letter = 'A' }) {
  const svgRef = useRef(null);
  const isDrawingRef = useRef(false);

  const {
    pathRef,
    initSamplePoints,
    registerTracePoint,
    progress,
    isComplete,
    reset,
  } = useLetterTracing();

  const letterData = letterPaths[letter];

  useEffect(() => {
    reset();
    const id = requestAnimationFrame(() => initSamplePoints());
    return () => cancelAnimationFrame(id);
  }, [letter, initSamplePoints, reset]);

  const handlePointerDown = useCallback((e) => {
    isDrawingRef.current = true;
    const { x, y } = toSvgCoords(svgRef.current, e.clientX, e.clientY);
    registerTracePoint(x, y);
  }, [registerTracePoint]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    const { x, y } = toSvgCoords(svgRef.current, e.clientX, e.clientY);
    registerTracePoint(x, y);
  }, [registerTracePoint]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  if (!letterData) return <div>Letter "{letter}" not found in letterPaths.json</div>;

  const { x: boxX, width: boxWidth } = letterData.renderBox;
  const boxRight = boxX + boxWidth;

  // render the SVG on screen at a size proportional to its own tight
  // width, so narrow letters (i, l) get a narrow box and wide letters
  // (W, M) get a wider box - like a real notebook row.
  const displayHeight = 220;
  const displayWidth = (boxWidth / 200) * displayHeight;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        ref={svgRef}
        viewBox={`${boxX} 0 ${boxWidth} 200`}
        width={displayWidth}
        height={displayHeight}
        style={{ touchAction: 'none', background: '#fff' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* ruled notebook lines - same 4 y-values for every letter */}
        <line x1={boxX} y1={ruledLines.top} x2={boxRight} y2={ruledLines.top}
              stroke="#5bc8e8" strokeWidth={1.5} />
        <line x1={boxX} y1={ruledLines.midDashed} x2={boxRight} y2={ruledLines.midDashed}
              stroke="#e05252" strokeWidth={1} strokeDasharray="4 3" />
        <line x1={boxX} y1={ruledLines.baseline} x2={boxRight} y2={ruledLines.baseline}
              stroke="#3366cc" strokeWidth={2} />
        <line x1={boxX} y1={ruledLines.bottom} x2={boxRight} y2={ruledLines.bottom}
              stroke="#5bc8e8" strokeWidth={1.5} />

        {/* faint guide letter */}
        <path d={letterData.d} fill="none" stroke="#ccc" strokeWidth={3} />
        {/* hit-detection path (same 'd', tracing logic reads this directly) */}
        <path ref={pathRef} d={letterData.d} fill="none" stroke="transparent" strokeWidth={20} />
      </svg>

      <div style={{ marginTop: 12, fontFamily: 'sans-serif' }}>
        <div style={{
          width: 200, height: 10, margin: '0 auto', background: '#eee',
          borderRadius: 6, overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(progress, 1) * 100}%`, height: '100%',
            background: isComplete ? '#4caf50' : '#3366cc', transition: 'width 0.15s'
          }} />
        </div>
        <p>{isComplete ? '✅ Great job!' : `Tracing progress: ${Math.round(progress * 100)}%`}</p>
      </div>
    </div>
  );
}
