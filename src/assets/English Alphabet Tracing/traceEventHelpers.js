/**
 * traceEventHelpers.js
 * ---------------------
 * Converts a raw pointer/touch event (screen pixels) into the SVG's
 * own coordinate space (e.g. the 0-200 range from letterPaths.json's
 * viewBox). This is required because the SVG element can be displayed
 * at any size on screen (CSS width/height), but useLetterTracing
 * needs coordinates in the path's native 200x200 space to compare
 * distances correctly.
 *
 * USAGE:
 *
 *   const svgRef = useRef(null);
 *
 *   const handlePointerMove = (e) => {
 *     if (e.buttons !== 1 && e.pointerType !== 'touch') return; // only while pressed
 *     const { x, y } = toSvgCoords(svgRef.current, e.clientX, e.clientY);
 *     registerTracePoint(x, y);
 *   };
 *
 *   <svg
 *     ref={svgRef}
 *     viewBox={letterPaths[letter].viewBox}
 *     onPointerDown={handlePointerMove}
 *     onPointerMove={handlePointerMove}
 *   >
 *     <path ref={pathRef} d={letterPaths[letter].d} />
 *   </svg>
 */

export function toSvgCoords(svgElement, clientX, clientY) {
  if (!svgElement) return { x: 0, y: 0 };

  const point = svgElement.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}
