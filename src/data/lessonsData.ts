// ============================================================
//  src/data/lessonsData.ts
//  Taqseem Taleem — Data-Driven Lessons Store (NO UNITS)
// ============================================================
//  Sirf wahi lessons list hote hain jin mein game maujood hai:
//  - English: levels 1-30 → 10 lessons; bulk levels 8, 16, 23, 30 → 8 lessons
//  - Math:    levels 1-20 → 5 lessons; levels 21-23 (bulk) → 8 lessons
//  - Urdu:    levels 1-25 → 10 lessons; bulk levels 5, 10, 15, 20, 25 → 7 lessons
//  Naya game add karo to neeche wali counts barha do.
// ============================================================

export interface Lesson {
  id: number;
}

export interface Level {
  level: number;
  title?: string;
  lessons: Lesson[];
}

export interface SubjectData {
  id: string;
  name: string;
  color: string;
  shadow: string;
  accentColor: string;
  levels: Level[];
}

export type SubjectId = "english" | "math" | "urdu";

// ─── Helper: Generate levels ──────────────────────────────────
// lessonsPerLevel: fixed number, ya function jo level number ke hisaab se
// lessons ki tadaad return kare (sirf game wale lessons).
function generateLevels(
  count: number,
  lessonsPerLevel: number | ((levelNum: number) => number) = 10,
  startFrom: number = 1
): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < count; i++) {
    const levelNum = startFrom + i;
    const lessonCount =
      typeof lessonsPerLevel === "function"
        ? lessonsPerLevel(levelNum)
        : lessonsPerLevel;
    levels.push({
      level: levelNum,
      title: `Level ${levelNum}`,
      lessons: Array.from({ length: lessonCount }, (_, j) => ({ id: j + 1 })),
    });
  }
  return levels;
}

// ─── ENGLISH ────────────────────────────────────────────────
// 30 Levels. Bulk levels (8, 16, 23, 30) mein sirf 8 games hain.
const ENGLISH_BULK_LEVELS = new Set<number>([8, 16, 23, 30]);
const englishLevels: Level[] = generateLevels(30, (lvl) =>
  ENGLISH_BULK_LEVELS.has(lvl) ? 8 : 10
);

// ─── MATH ────────────────────────────────────────────────────
// Levels 1-20  → 5 lessons each
// Levels 21-23 → 8 lessons each (bulk games; lessons 9-10 khali thay, hata diye)
const mathLevels: Level[] = [
  ...generateLevels(20, 5),                 // Levels 1-20
  ...generateLevels(3, 8, 21),              // Levels 21-23
];

// ─── URDU ────────────────────────────────────────────────────
// 25 Levels. Bulk levels (5, 10, 15, 20, 25) mein sirf 7 games hain.
const URDU_BULK_LEVELS = new Set<number>([5, 10, 15, 20, 25]);
const urduLevels: Level[] = generateLevels(25, (lvl) =>
  URDU_BULK_LEVELS.has(lvl) ? 7 : 10
);

// ─── MASTER EXPORT ───────────────────────────────────────────
export const subjectsData: SubjectData[] = [
  {
    id: "english",
    name: "English",
    color: "linear-gradient(160deg, oklch(0.96 0.06 145), oklch(0.85 0.16 142))",
    shadow: "oklch(0.5 0.18 142 / 0.7)",
    accentColor: "oklch(0.55 0.2 142)",
    levels: englishLevels,
  },
  {
    id: "math",
    name: "Math",
    color: "linear-gradient(160deg, oklch(0.98 0.04 140), oklch(0.78 0.2 138))",
    shadow: "oklch(0.5 0.2 138 / 0.7)",
    accentColor: "oklch(0.5 0.22 138)",
    levels: mathLevels,
  },
  {
    id: "urdu",
    name: "Urdu",
    color: "linear-gradient(160deg, oklch(0.94 0.08 150), oklch(0.7 0.21 145))",
    shadow: "oklch(0.45 0.18 145 / 0.75)",
    accentColor: "oklch(0.45 0.2 145)",
    levels: urduLevels,
  },
];

// ─── HELPER FUNCTIONS ──────────────────────────────────────

export function getSubject(id: string): SubjectData | undefined {
  return subjectsData.find((s) => s.id === id);
}

export function getLevel(subjectId: string, levelNum: number): Level | undefined {
  const subject = getSubject(subjectId);
  if (!subject) return undefined;
  return subject.levels.find((l) => l.level === levelNum);
}

export function getLesson(
  subjectId: string,
  levelNum: number,
  lessonId: number
): Lesson | undefined {
  const level = getLevel(subjectId, levelNum);
  if (!level) return undefined;
  return level.lessons.find((l) => l.id === lessonId);
}

export function getTotalLevelCount(subjectId: string): number {
  const subject = getSubject(subjectId);
  if (!subject) return 0;
  return subject.levels.length;
}

export function getTotalLessonCount(subjectId: string): number {
  const subject = getSubject(subjectId);
  if (!subject) return 0;
  return subject.levels.reduce((sum, lvl) => sum + lvl.lessons.length, 0);
}

export function getLevelLessonCount(subjectId: string, levelNum: number): number {
  const level = getLevel(subjectId, levelNum);
  if (!level) return 0;
  return level.lessons.length;
}

export function getNextLevel(subjectId: string, currentLevel: number): number | null {
  const totalLevels = getTotalLevelCount(subjectId);
  const next = currentLevel + 1;
  return next <= totalLevels ? next : null;
}

export function getPreviousLevel(subjectId: string, currentLevel: number): number | null {
  const prev = currentLevel - 1;
  return prev >= 1 ? prev : null;
}

export function getAllLevels(subjectId: string): Level[] {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  return subject.levels;
}

export function getLessonIds(subjectId: string, levelNum: number): number[] {
  const level = getLevel(subjectId, levelNum);
  if (!level) return [];
  return level.lessons.map((l) => l.id);
}

export function levelExists(subjectId: string, levelNum: number): boolean {
  const level = getLevel(subjectId, levelNum);
  return level !== undefined;
}

export function lessonExists(
  subjectId: string,
  levelNum: number,
  lessonId: number
): boolean {
  const lesson = getLesson(subjectId, levelNum, lessonId);
  return lesson !== undefined;
}

// ─── VALIDATION HELPERS ─────────────────────────────────────

export function normalizeLevel(subjectId: string, levelNum: number): number {
  const totalLevels = getTotalLevelCount(subjectId);
  if (totalLevels === 0) return 1;
  if (isNaN(levelNum) || levelNum < 1) return 1;
  if (levelNum > totalLevels) return totalLevels;
  return levelNum;
}

export function normalizeLesson(
  subjectId: string,
  levelNum: number,
  lessonId: number
): number {
  const lessonIds = getLessonIds(subjectId, levelNum);
  if (lessonIds.length === 0) return 1;
  if (isNaN(lessonId) || lessonId < 1) return 1;
  if (!lessonIds.includes(lessonId)) return lessonIds[0];
  return lessonId;
}

// ─── LEVEL TO LETTER MAPPINGS (ENGLISH) ────────────────────

export const ENGLISH_LETTER_LEVEL_MAP: Record<number, string> = {
  1: "A", 3: "B", 5: "C", 7: "D", 9: "E",
  12: "F", 14: "G", 16: "H", 18: "I",
  21: "J", 23: "K", 25: "L", 27: "M", 29: "N",
};

export const ENGLISH_5ITEMS_LEVEL_MAP: Record<number, string> = {
  2: "A", 4: "B", 6: "C", 8: "D", 10: "E",
  13: "F", 15: "G", 17: "H", 19: "I",
  22: "J", 24: "K", 26: "L", 28: "M", 30: "N",
};

export const RULED_LINE_TRACE_LEVEL_MAP: Record<number, string> = {
  2: "A", 4: "B", 6: "C", 8: "D", 10: "E",
  13: "F", 15: "G", 17: "H", 19: "I",
  22: "J", 24: "K", 26: "L", 28: "M", 30: "N",
};

export const BLANK_TRACE_LEVEL_MAP: Record<number, string> = {
  2: "A", 4: "B", 6: "C", 8: "D", 10: "E",
  13: "F", 15: "G", 17: "H", 19: "I",
  22: "J", 24: "K", 26: "L", 28: "M", 30: "N",
};

export function getEnglishLetter(level: number): string | null {
  return ENGLISH_LETTER_LEVEL_MAP[level] || null;
}

export function getEnglish5ItemsLetter(level: number): string | null {
  return ENGLISH_5ITEMS_LEVEL_MAP[level] || null;
}

export function getRuledLineTraceLetter(level: number): string | null {
  return RULED_LINE_TRACE_LEVEL_MAP[level] || null;
}

export function getBlankTraceLetter(level: number): string | null {
  return BLANK_TRACE_LEVEL_MAP[level] || null;
}

// ─── CONSTANTS ──────────────────────────────────────────────

export const TOTAL_LEVELS_PER_SUBJECT = 30;
export const TOTAL_LESSONS_PER_LEVEL = 10;
export const TOTAL_LESSONS_PER_SUBJECT =
  TOTAL_LEVELS_PER_SUBJECT * TOTAL_LESSONS_PER_LEVEL;

// ─── DEFAULT EXPORT ─────────────────────────────────────────

export default {
  subjectsData,
  getSubject,
  getLevel,
  getLesson,
  getTotalLevelCount,
  getTotalLessonCount,
  getLevelLessonCount,
  getNextLevel,
  getPreviousLevel,
  getAllLevels,
  getLessonIds,
  levelExists,
  lessonExists,
  normalizeLevel,
  normalizeLesson,
  getEnglishLetter,
  getEnglish5ItemsLetter,
  getRuledLineTraceLetter,
  getBlankTraceLetter,
  TOTAL_LEVELS_PER_SUBJECT,
  TOTAL_LESSONS_PER_LEVEL,
  TOTAL_LESSONS_PER_SUBJECT,
};