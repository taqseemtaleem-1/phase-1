// src/lib/studentProgress.ts
// ============================================================
//  Student ka progress IndexedDB (lesson_progress) se padhta hai.
//
//  Yehi table:
//   • games complete hone par likhta hai (saveProgress)
//   • reinstall / naye device par token se login karne par server se
//     wapis bharta hai (restoreAllStudentsFromSupabase)
//
//  Isliye Dashboard / Levels page ka progress yahin se aata hai —
//  app delete karke dobara install karne par bhi bacha wahin se
//  continue karta hai jahan chhora tha.
// ============================================================

import { progressDb } from "./progressSync";
import { getAllLevels, getLevel } from "../data/lessonsData";

/** subject → level → completed lesson ids */
export type CompletedMap = Record<string, Record<number, number[]>>;

export interface SubjectStats {
  levels: { done: number; total: number };
  lessons: { done: number; total: number };
}

export interface ResumePoint {
  level: number;
  lessonId: number;
}

/** Student ke saare completed lessons (kisi bhi din complete hue hon). */
export async function getCompletedMap(studentId: string): Promise<CompletedMap> {
  const map: CompletedMap = {};
  if (!studentId || typeof indexedDB === "undefined") return map;

  try {
    const rows = await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .toArray();

    for (const r of rows) {
      if (String(r.status).toLowerCase() !== "completed") continue;
      const bySubject = (map[r.subject] ??= {});
      const list = (bySubject[r.level] ??= []);
      if (!list.includes(r.lessonId)) list.push(r.lessonId);
    }
  } catch (err) {
    console.error("[studentProgress] getCompletedMap failed:", err);
  }
  return map;
}

/** Sirf wahi completed lessons gino jo ab bhi lessonsData mein maujood hain. */
function validCompleted(
  map: CompletedMap,
  subject: string,
  level: number,
): number[] {
  const valid = new Set(getLevel(subject, level)?.lessons.map((l) => l.id) ?? []);
  return (map[subject]?.[level] ?? []).filter((id) => valid.has(id));
}

export function isLevelComplete(
  map: CompletedMap,
  subject: string,
  level: number,
): boolean {
  const total = getLevel(subject, level)?.lessons.length ?? 0;
  return total > 0 && validCompleted(map, subject, level).length >= total;
}

export function getSubjectStats(map: CompletedMap, subject: string): SubjectStats {
  const levels = getAllLevels(subject);
  let doneLevels = 0;
  let doneLessons = 0;
  let totalLessons = 0;

  for (const lv of levels) {
    totalLessons += lv.lessons.length;
    const done = validCompleted(map, subject, lv.level).length;
    doneLessons += done;
    if (lv.lessons.length > 0 && done >= lv.lessons.length) doneLevels++;
  }

  return {
    levels: { done: doneLevels, total: levels.length },
    lessons: { done: doneLessons, total: totalLessons },
  };
}

/** Pehla level/lesson jo abhi tak complete nahi hua (null = sab complete). */
export function getResumePoint(
  map: CompletedMap,
  subject: string,
): ResumePoint | null {
  for (const lv of getAllLevels(subject)) {
    const done = new Set(validCompleted(map, subject, lv.level));
    const next = lv.lessons.find((l) => !done.has(l.id));
    if (next) return { level: lv.level, lessonId: next.id };
  }
  return null;
}

/** Ek level mein pehla incomplete lesson (null = level complete). */
export function getNextLessonInLevel(
  map: CompletedMap,
  subject: string,
  level: number,
): number | null {
  const done = new Set(validCompleted(map, subject, level));
  const next = getLevel(subject, level)?.lessons.find((l) => !done.has(l.id));
  return next ? next.id : null;
}
