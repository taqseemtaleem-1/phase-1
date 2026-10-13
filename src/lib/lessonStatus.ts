// src/lib/lessonStatus.ts
// Simple status system — 2 states only

export type LessonStatus =
  | "Uncompleted"
  | "Completed";

/**
 * Lesson status determine karo
 *
 * Rules:
 *   - Poora kiya         → "Completed"
 *   - Baaki sab          → "Uncompleted"
 *     (kabhi khola nahi, ya adha khela)
 */
export function getLessonStatus(
  hasStarted: boolean,
  hasCompleted: boolean
): LessonStatus {
  if (hasCompleted) return "Completed";
  return "Uncompleted";
}