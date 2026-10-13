import { useRef, useState, useCallback } from 'react';

/**
 * useLetterTracing (v2 - order-aware)
 * -------------------------------------
 * Fixes the "random scribbling" problem: a child randomly scratching
 * inside the letter's bounding area can no longer trigger completion.
 *
 * HOW IT'S DIFFERENT FROM v1:
 * v1 just checked "did the finger pass near ANY point on the outline,
 * in any order" -> a scribble could touch many points out of order
 * and rack up 85% coverage without actually tracing the shape.
 *
 * v2 instead tracks a single "progress pointer" that only moves
 * FORWARD along the outline, and only accepts a touch point if it's
 * near the outline AND close to where the pointer currently is
 * (within a small look-ahead window). This forces the child to
 * follow the letter's shape roughly in order, start to end -
 * scribbling in a random spot far from the current position does
 * nothing.
 *
 * USAGE: identical to v1 - same hook signature, same return values.
 */

const NUM_SAMPLE_POINTS = 60;      // points sampled along the outline
const HIT_TOLERANCE = 14;          // how close the finger must be to a point to count it (viewBox units)
const LOOK_AHEAD_WINDOW = 6;       // how many points ahead of current progress can be reached at once
const BACKTRACK_ALLOWANCE = 2;     // small allowance for natural hand wobble backward
const COMPLETION_THRESHOLD = 0.9;  // % of outline that must be reached, in order, to count as traced

export function useLetterTracing() {
  const pathRef = useRef(null);
  const samplePointsRef = useRef([]);
  const progressIndexRef = useRef(0); // furthest point reached "in order" so far

  const [progressIndex, setProgressIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  /** Call once the <path> is mounted, and again whenever the letter changes. */
  const initSamplePoints = useCallback(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;

    const totalLength = pathEl.getTotalLength();
    const points = [];
    for (let i = 0; i <= NUM_SAMPLE_POINTS; i++) {
      const dist = (totalLength * i) / NUM_SAMPLE_POINTS;
      const pt = pathEl.getPointAtLength(dist);
      points.push({ x: pt.x, y: pt.y });
    }

    samplePointsRef.current = points;
    progressIndexRef.current = 0;
    setProgressIndex(0);
    setIsComplete(false);
  }, []);

  /**
   * Call continuously while the user is dragging/tracing.
   * x, y must be in the SVG's own coordinate space (see traceEventHelpers.js).
   */
  const registerTracePoint = useCallback((x, y) => {
    const points = samplePointsRef.current;
    if (points.length === 0) return;

    const currentIndex = progressIndexRef.current;
    const lowerBound = Math.max(0, currentIndex - BACKTRACK_ALLOWANCE);
    const upperBound = Math.min(points.length - 1, currentIndex + LOOK_AHEAD_WINDOW);

    // Only look at points within the allowed "reachable window" -
    // this is what blocks a random touch far along the letter from
    // instantly counting.
    let bestIndex = -1;
    let bestDist = Infinity;

    for (let i = lowerBound; i <= upperBound; i++) {
      const pt = points[i];
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HIT_TOLERANCE && dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    if (bestIndex > progressIndexRef.current) {
      progressIndexRef.current = bestIndex;
      setProgressIndex(bestIndex);

      const newProgress = bestIndex / (points.length - 1);
      if (newProgress >= COMPLETION_THRESHOLD) {
        setIsComplete(true);
      }
    }
  }, []);

  const reset = useCallback(() => {
    progressIndexRef.current = 0;
    setProgressIndex(0);
    setIsComplete(false);
  }, []);

  const totalPoints = samplePointsRef.current.length;
  const progress = totalPoints > 1 ? progressIndex / (totalPoints - 1) : 0;

  return {
    pathRef,
    initSamplePoints,
    registerTracePoint,
    samplePoints: samplePointsRef.current,
    progressIndex,   // how far along the outline (index) the user has correctly reached
    progress,        // 0 to 1, same meaning as before - drive a progress bar with this
    isComplete,
    reset,
  };
}
