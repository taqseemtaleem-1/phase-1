// src/lib/types.ts

// ─── Student ──────────────────────────────────────────────────
export interface Student {
  studentId: string;
  studentName: string;
  fatherName: string;
  schoolId: string;
  schoolName: string;
  grade: string;
  photoUrl: string;
  token: string;
}

// ─── Device (Token-based) ─────────────────────────────────────
export interface Device {
  token: string;
  deviceName: string;
  isLoggedIn: boolean;
  lastLogin: string;
}

// ─── Session ──────────────────────────────────────────────────
export interface Session {
  student: Student;
  loginAt: string;
}

// ─── API Response Helpers ─────────────────────────────────────
export interface ListStudentsResult {
  ok: boolean;
  students?: Student[];
  error?: string;
}

export interface LoginResult {
  ok: boolean;
  student?: Student;
  error?: string;
}

export interface ValidateTokenResult {
  ok: boolean;
  valid?: boolean;
  token?: string;
  deviceName?: string;
  error?: string;
}

// ══════════════════════════════════════════════════════════════
//  🔥 NEW: Lesson Progress (for sync)
// ══════════════════════════════════════════════════════════════

export type LessonStatus = "uncompleted" | "completed";

export interface LessonProgress {
  // Local fields (App generates these)
  studentId: string;
  deviceToken: string | null;
  subject: string;
  level: number;
  lessonId: number;
  status: LessonStatus;
  score: number | null;
  attempts: number;
  timeSpentSec: number | null;
  completedAt: string | null;   // ISO timestamp
  updatedAt: string;            // ISO timestamp

  // Server fields (optional, present after sync)
  id?: number;
  createdAt?: string;
}

// ─── Sync Queue Entry ─────────────────────────────────────────
export interface PendingSyncEntry {
  id: string;                    // UUID for local queue
  payload: Omit<LessonProgress, "id" | "createdAt">;
  attempts: number;              // how many times we tried to sync
  lastAttemptAt: string | null;
  createdAt: string;
}

// ─── Sync Result ──────────────────────────────────────────────
export interface SyncResult {
  ok: boolean;
  synced: number;
  failed: number;
  error?: string;
}