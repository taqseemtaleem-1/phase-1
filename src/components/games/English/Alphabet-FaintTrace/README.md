# Alphabet-RuledLineTrace

## Overview
A clean, ruled-line tracing game that uses the Andika font for letter shapes. Children trace over dashed outline letters on ruled lines.

## Features
- **2 Rows**: Top row has 1 reference letter + 2 tracing slots, bottom row has 3 tracing slots
- **Reference Letter**: Red solid letter (non-traceable)
- **Tracing Guides**: Grey dashed outlines
- **Ruled Lines**: Red (top/bottom) and Blue (middle) lines
- **Detection**: Pixel-perfect inside/outside detection using hidden canvas
- **Feedback**: Green ✓ for correct, Red ✗ for wrong (slot resets)
- **Session Flow**: Capital -> (Next button) -> Small -> End screen
- **Audio**: Correct celebration sounds, wrong sound on error

## File Structure
```
Alphabet-RuledLineTrace/
├── RuledLineTraceBase.tsx      # Main game component
├── ruledLineHelpers.ts         # Layout calculation helpers
├── useRuledLineTracing.ts      # Tracing logic hook
├── RuledLineTrace_A.tsx        # Letter A wrapper
├── RuledLineTrace_B.tsx        # Letter B wrapper
├── ... (all letters A-Z)
└── index.ts                    # Export all
```

## Integration
Add to `lesson.tsx` with Lesson ID 6:
```typescript
// Level map for even levels
const RULED_LINE_TRACE_LEVEL_MAP: Record<number, string> = {
  2: "A", 4: "B", 6: "C", 8: "D", 10: "E",
  // ... etc
};

// Component map
const RULED_LINE_TRACE_COMPONENTS: Record<string, any> = {
  A: RuledLineTrace_A,
  // ... etc
};
```

## Dependencies
- Andika font: `/src/assets/Andika/Andika-Regular.ttf`
- Audio files: correct.mp3, wrong.mp3, lesson-completed.mp3
- SVG assets: Celebration.svg, SuccessAnimation.svg

## Grading Thresholds
- **Min Coverage**: 65% of the letter area must be traced
- **Min Accuracy**: 55% of strokes must stay inside the letter
- Both must be met for a slot to be marked "correct"

## Session Flow
1. Capital: Trace all 5 slots
2. Next button appears (when all correct)
3. Small: Trace all 5 slots
4. End screen (when both sessions complete)