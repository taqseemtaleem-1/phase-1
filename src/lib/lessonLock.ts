// src/lib/lessonLock.ts
// Completed lesson ko 20 ghante ke liye lock karta hai

const LOCK_DURATION_MS = 20 * 60 * 60 * 1000; // 20 ghante

export interface LessonLockInfo {
  completedAt: string;
  lockedUntil: string;
  isLocked: boolean;
}

/**
 * Lock info banao jab lesson complete ho
 */
export function createLockInfo(): LessonLockInfo {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);

  return {
    completedAt: now.toISOString(),
    lockedUntil: lockedUntil.toISOString(),
    isLocked: true,
  };
}

/**
 * Check karo ke lesson abhi locked hai ya nahi
 */
export function checkLessonLock(lockInfo: {
  completedAt?: string;
  lockedUntil?: string;
}): LessonLockInfo {
  // Agar lock info nahi hai → locked nahi
  if (!lockInfo.lockedUntil) {
    return {
      completedAt: lockInfo.completedAt || "",
      lockedUntil: "",
      isLocked: false,
    };
  }

  const now = Date.now();
  const lockedUntilTime = new Date(lockInfo.lockedUntil).getTime();

  // Agar 20 ghante guzar gaye → unlock
  const isLocked = now < lockedUntilTime;

  return {
    completedAt: lockInfo.completedAt || "",
    lockedUntil: lockInfo.lockedUntil,
    isLocked,
  };
}

/**
 * Kitna time bacha hai lock khulne mein (readable format)
 */
export function getRemainingLockTime(lockedUntil: string): string {
  if (!lockedUntil) return "";

  const now = Date.now();
  const until = new Date(lockedUntil).getTime();
  const remaining = until - now;

  if (remaining <= 0) return "";

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}