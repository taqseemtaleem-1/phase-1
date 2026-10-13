// ============================================================
//  src/lib/progress.ts
//  Taqseem Taleem — Simple localStorage-based progress tracker
//
//  Stores, per subject, which lessons the student has opened and
//  which levels are fully complete (all lessons in that level done).
//  Used by the dashboard's subject-card progress bars and by the
//  levels page to mark finished levels.
// ============================================================

const STORAGE_PREFIX = "taqseem:progress:";

interface SubjectProgress {
  // level -> array of completed lesson ids
  lessons: Record<number, number[]>;
  // levels that are fully completed
  completedLevels: number[];
}

function emptyProgress(): SubjectProgress {
  return { lessons: {}, completedLevels: [] };
}

function readProgress(subject: string): SubjectProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + subject);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return {
      lessons: parsed.lessons ?? {},
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
    };
  } catch {
    return emptyProgress();
  }
}

function writeProgress(subject: string, progress: SubjectProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + subject, JSON.stringify(progress));
  } catch {
    // Ignore storage errors (e.g. private browsing quota).
  }
}

// Number of fully-completed levels for a subject.
export function getCompletedLevelCount(subject: string): number {
  return readProgress(subject).completedLevels.length;
}

// Whether a specific level is fully completed.
export function isLevelComplete(subject: string, level: number): boolean {
  return readProgress(subject).completedLevels.includes(level);
}

// Whether a specific lesson (inside a level) has been marked done.
export function isLessonComplete(subject: string, level: number, lessonId: number): boolean {
  const { lessons } = readProgress(subject);
  return (lessons[level] ?? []).includes(lessonId);
}

// Total number of individual lessons completed across all levels for a subject.
export function getCompletedLessonCount(subject: string): number {
  const { lessons } = readProgress(subject);
  return Object.values(lessons).reduce((sum, ids) => sum + ids.length, 0);
}

// Mark a lesson as done, and auto-complete the level once every
// lesson in it has been marked done.
export function markLessonComplete(
  subject: string,
  level: number,
  lessonId: number,
  totalLessonsInLevel: number,
) {
  const progress = readProgress(subject);
  const done = new Set(progress.lessons[level] ?? []);
  done.add(lessonId);
  progress.lessons[level] = Array.from(done);

  if (done.size >= totalLessonsInLevel && !progress.completedLevels.includes(level)) {
    progress.completedLevels.push(level);
  }

  writeProgress(subject, progress);
}
