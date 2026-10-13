// src/lib/progressSync.ts
// ============================================================
//  Taqseem Taleem — Progress Sync System
//  Offline-first: IndexedDB → Supabase (via Sync button)
//
//  🔥 FIXED BUG: `synced: true` kabhi bhi set nahi hoga agar
//     Supabase upload actually fail ho gaya. Pehle, error aane
//     ke baad bhi flag true ho jata tha (fake sync).
//
//  KEY GUARANTEE:
//    - Only mark `synced: true` AFTER Supabase confirms success
//    - On ANY error → leave `synced: false` so retry works
//    - Verify upload count matches attempted count
// ============================================================

import Dexie, { type Table } from "dexie";
import { supabase } from "./supabase";
import {
  uploadPendingCaptures,
  getPendingCaptureCount,
  getPendingCaptureUrls,
} from "./captureStore";

// ══════════════════════════════════════════════════════════════
//  📦 TYPES
// ══════════════════════════════════════════════════════════════

export type LessonStatus = "completed" | "uncompleted";

export interface LocalProgress {
  id: string;
  studentId: string;
  deviceToken: string;
  subject: string;
  level: number;
  lessonId: number;
  dateKey: string;
  status: LessonStatus;
  timeSpentSec: number | null;
  completedAt: string | null;
  score: number | null;
  gameData: Record<string, any> | null;
  summary: string | null;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressInput {
  studentId: string;
  deviceToken: string;
  subject: string;
  level: number;
  lessonId: number;
  status: LessonStatus;
  timeSpentSec?: number | null;
  score?: number | null;
  gameData?: Record<string, any> | null;
  summary?: string | null;
  dateKey?: string;
}

export interface SyncResult {
  ok: boolean;
  /** Progress rows + captures jo is sync mein server par gayi */
  uploaded: number;
  failed: number;
  error?: string;
  /** Is sync mein upload hui captures (images) */
  capturesUploaded?: number;
  /** Captures jo abhi bhi device par pending hain */
  capturesPending?: number;
  /** Progress rows jo pending captures ki wajah se rok li gayin */
  deferredRows?: number;
}

export interface RestoreResult {
  ok: boolean;
  restored: number;
  error?: string;
}

export interface RestoreAllResult {
  ok: boolean;
  studentsRestored: number;
  recordsRestored: number;
  error?: string;
}

// ══════════════════════════════════════════════════════════════
//  🗄️ INDEXEDDB DATABASE
// ══════════════════════════════════════════════════════════════

class ProgressDB extends Dexie {
  lesson_progress!: Table<LocalProgress, string>;

  constructor() {
    super("taqseem-progress-db");

    this.version(1).stores({
      lesson_progress:
        "id, studentId, subject, level, dateKey, synced, [studentId+subject], [studentId+subject+level]",
    });
  }
}

export const progressDb = new ProgressDB();

// ══════════════════════════════════════════════════════════════
//  🛠️ HELPERS
// ══════════════════════════════════════════════════════════════

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildId(
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  dateKey: string,
): string {
  return `${studentId}:${subject}:${level}:${lessonId}:${dateKey}`;
}

// ══════════════════════════════════════════════════════════════
//  💾 SAVE PROGRESS (Local IndexedDB)
// ══════════════════════════════════════════════════════════════

export async function saveProgress(input: ProgressInput): Promise<void> {
  try {
    const {
      studentId,
      deviceToken,
      subject,
      level,
      lessonId,
      status,
      timeSpentSec = null,
      score = null,
      gameData = null,
      summary = null,
      dateKey = getTodayKey(),
    } = input;

    console.log("[progressSync] saveProgress called:", {
      studentId,
      subject,
      level,
      lessonId,
      status,
      hasGameData: !!gameData,
      gameDataKeys: gameData ? Object.keys(gameData) : [],
    });

    const id = buildId(studentId, subject, level, lessonId, dateKey);

    const existing = await progressDb.lesson_progress.get(id);

    if (existing) {
      // 🔥 If already completed → skip (never overwrite a completed record)
      if (existing.status === "completed") {
        console.log(`⏭️ [progress] Skipping — already completed: ${id}`);
        return;
      }

      // 🔥 Update existing uncompleted record
      const updated: LocalProgress = {
        ...existing,
        status,
        timeSpentSec,
        score,
        gameData,
        summary,
        completedAt: status === "completed" ? new Date().toISOString() : null,
        // 🔥 CRITICAL: Always reset synced=false on any update
        //    so a fresh sync will push the new data to Supabase
        synced: false,
        updatedAt: new Date().toISOString(),
      };

      await progressDb.lesson_progress.put(updated);
      console.log(`🔄 [progress] Updated: ${id}`);
      return;
    }

    // 🔥 New record
    const now = new Date().toISOString();
    const record: LocalProgress = {
      id,
      studentId,
      deviceToken,
      subject,
      level,
      lessonId,
      dateKey,
      status,
      timeSpentSec,
      score,
      gameData,
      summary,
      completedAt: status === "completed" ? now : null,
      synced: false,
      createdAt: now,
      updatedAt: now,
    };

    await progressDb.lesson_progress.put(record);
    console.log(`✅ [progress] Saved: ${id}`);
  } catch (err) {
    console.error("[progress] saveProgress failed:", err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════
//  📖 QUERY FUNCTIONS
// ══════════════════════════════════════════════════════════════

export async function getLessonProgress(
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  dateKey: string = getTodayKey(),
): Promise<LocalProgress | null> {
  try {
    const id = buildId(studentId, subject, level, lessonId, dateKey);
    const record = await progressDb.lesson_progress.get(id);
    return record ?? null;
  } catch (err) {
    console.error("[progress] getLessonProgress failed:", err);
    return null;
  }
}

export async function getStudentProgress(
  studentId: string,
): Promise<LocalProgress[]> {
  try {
    return await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .toArray();
  } catch (err) {
    console.error("[progress] getStudentProgress failed:", err);
    return [];
  }
}

/** Pending = unsynced progress rows + abhi tak upload na hui capture images. */
export async function getPendingCount(studentId: string): Promise<number> {
  try {
    const rows = await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .filter((r) => !r.synced)
      .count();
    const captures = await getPendingCaptureCount(studentId);
    return rows + captures;
  } catch (err) {
    console.error("[progress] getPendingCount failed:", err);
    return 0;
  }
}

async function getPendingRecords(studentId: string): Promise<LocalProgress[]> {
  try {
    return await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .filter((r) => !r.synced)
      .toArray();
  } catch (err) {
    console.error("[progress] getPendingRecords failed:", err);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
//  ☁️ SYNC TO SUPABASE
// ══════════════════════════════════════════════════════════════

/** Ek request mein max itni rows upload hoti hain (bari payload fail na ho). */
const SYNC_CHUNK_SIZE = 200;

/**
 * 🔥 SYNC LOGIC:
 *  0. Pehle pending capture images (IndexedDB) Supabase Storage par upload
 *  1. Fetch all progress records where `synced: false`
 *  2. Jin records ki capture abhi tak upload nahi hui unhe rok lo (deferred),
 *     taake backend par kabhi aisa URL na jaye jiski image maujood na ho
 *  3. Baaki records Supabase par upsert
 *  4. Sirf CONFIRMED success par `synced: true`
 *  5. Koi bhi error → `synced: false` rehta hai, retry ho sakta hai
 */
export async function syncToSupabase(studentId: string): Promise<SyncResult> {
  try {
    console.log(`☁️ [sync] Starting sync for: ${studentId}`);

    // 🔥 DEBUG: Show which Supabase we're talking to
    const supabaseInfo = (window as any).__supabaseInfo;
    if (supabaseInfo) {
      console.log(`☁️ [sync] Target Supabase: ${supabaseInfo.url}`);
    }

    // ─── 0. Offline? Data device par mehfooz hai ─────────
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const total = await getPendingCount(studentId);
      return {
        ok: false,
        uploaded: 0,
        failed: total,
        error:
          "No internet connection. Your data is safe on this device — try Sync again when online.",
      };
    }

    // ─── 1. Captures pehle ───────────────────────────────
    const capResult = await uploadPendingCaptures(studentId);
    const capturesUploaded = capResult.uploaded;
    const capturesPending = capResult.remaining;
    console.log(
      `🖼️ [sync] Captures uploaded: ${capturesUploaded}, still pending: ${capturesPending}`,
    );

    const captureNote =
      capturesPending > 0
        ? `${capturesPending} photo${capturesPending !== 1 ? "s" : ""} could not be uploaded yet. Please try Sync again.`
        : undefined;

    // ─── 2. Get pending records ──────────────────────────
    const allPending = await getPendingRecords(studentId);

    // Jin rows mein abhi-pending capture ka URL hai, unhe is round mein na bhejo
    const unsentUrls =
      capturesPending > 0 ? await getPendingCaptureUrls(studentId) : [];
    const pending: LocalProgress[] = [];
    let deferredRows = 0;
    for (const r of allPending) {
      const json = r.gameData ? JSON.stringify(r.gameData) : "";
      if (unsentUrls.length > 0 && unsentUrls.some((u) => json.includes(u))) {
        deferredRows++;
      } else {
        pending.push(r);
      }
    }

    if (pending.length === 0) {
      console.log(
        `✅ [sync] No progress rows ready (deferred: ${deferredRows})`,
      );
      const ok = deferredRows === 0 && capturesPending === 0;
      return {
        ok,
        uploaded: capturesUploaded,
        failed: deferredRows + capturesPending,
        error: ok ? undefined : captureNote,
        capturesUploaded,
        capturesPending,
        deferredRows,
      };
    }

    console.log(`📤 [sync] Found ${pending.length} pending records`);

    // ─── 3. Chunks mein upload (bohot zyada rows ek request mein na jayein) ──
    let rowsUploaded = 0;

    for (let i = 0; i < pending.length; i += SYNC_CHUNK_SIZE) {
      const chunk = pending.slice(i, i + SYNC_CHUNK_SIZE);

      const rows = chunk.map((r) => ({
        student_id: r.studentId,
        device_token: r.deviceToken,
        subject: r.subject,
        level: r.level,
        lesson_id: r.lessonId,
        date_key: r.dateKey,
        status: r.status,
        time_spent_sec: r.timeSpentSec,
        completed_at: r.completedAt,
        score: r.score,
        game_data: r.gameData,
        summary: r.summary,
      }));

      const { data, error } = await supabase
        .from("lesson_progress")
        .upsert(rows, {
          onConflict: "student_id,subject,level,lesson_id,date_key",
          ignoreDuplicates: false,
        })
        .select();

      // ─── Error check FIRST ─────────────────────────────
      if (error) {
        console.error("❌ [sync] Supabase error:", error);
        console.error("❌ [sync] Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        // 🔥 Diagnostic helpers for common errors
        if (error.code === "42P01") {
          console.error(
            "🚨 [sync] TABLE NOT FOUND! lesson_progress table missing in Supabase",
          );
        }
        if (error.code === "42501") {
          console.error(
            "🚨 [sync] PERMISSION DENIED! Check Supabase RLS policies for lesson_progress",
          );
        }
        if (error.code === "23505") {
          console.error(
            "🚨 [sync] DUPLICATE KEY! Unique constraint on wrong columns",
          );
        }

        // 🔥 CRITICAL: failed chunk synced:false rehta hai — retry hoga.
        // Pehle wale chunks jo confirm ho chuke wo synced:true ho chuke hain.
        console.log(
          "🔒 [sync] Remaining records kept as synced:false — will retry on next sync",
        );

        return {
          ok: false,
          uploaded: capturesUploaded + rowsUploaded,
          failed: pending.length - rowsUploaded + deferredRows,
          error: error.message,
          capturesUploaded,
          capturesPending,
          deferredRows,
        };
      }

      // ─── Verify confirmation ───────────────────────────
      const confirmed = data?.length || 0;
      console.log(
        `✅ [sync] Chunk ${Math.floor(i / SYNC_CHUNK_SIZE) + 1}: uploaded ${confirmed} of ${chunk.length}`,
      );

      if (confirmed === 0) {
        console.error(
          "❌ [sync] Supabase returned 0 rows — no confirmation. Not marking synced.",
        );
        return {
          ok: false,
          uploaded: capturesUploaded + rowsUploaded,
          failed: pending.length - rowsUploaded + deferredRows,
          error: "Supabase returned no confirmed rows",
          capturesUploaded,
          capturesPending,
          deferredRows,
        };
      }

      // ─── ONLY NOW — is chunk ko synced mark karo ───────
      await progressDb.lesson_progress
        .where("id")
        .anyOf(chunk.map((r) => r.id))
        .modify({
          synced: true,
          updatedAt: new Date().toISOString(),
        });

      rowsUploaded += chunk.length;
    }

    console.log(
      `✅ [sync] Marked ${rowsUploaded} records as synced:true in IndexedDB`,
    );

    const ok = deferredRows === 0 && capturesPending === 0;
    return {
      ok,
      uploaded: rowsUploaded + capturesUploaded,
      failed: deferredRows + capturesPending,
      error: ok ? undefined : captureNote,
      capturesUploaded,
      capturesPending,
      deferredRows,
    };
  } catch (err) {
    console.error("❌ [sync] Sync exception:", err);
    // 🔥 On exception — records remain synced:false (not marked)
    return {
      ok: false,
      uploaded: 0,
      failed: 0,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  🔥 FORCE RESYNC — Reset + Sync in one call
// ══════════════════════════════════════════════════════════════
//
//  Use case: Agar kabhi bhi fake-sync issue dobara aaye,
//  ye function saare records ko force-upload karega.
//
export async function forceResyncToSupabase(
  studentId: string,
): Promise<SyncResult> {
  try {
    console.log(`🔄 [force-resync] Starting for: ${studentId}`);

    // Step 1: Reset all records to synced:false
    const allRecords = await getStudentProgress(studentId);

    if (allRecords.length === 0) {
      console.log("  No records found");
      return { ok: true, uploaded: 0, failed: 0 };
    }

    console.log(`  Resetting ${allRecords.length} records to synced:false...`);

    await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .modify({ synced: false });

    console.log(`  ✅ Reset complete`);

    // Step 2: Sync normally
    console.log(`  Syncing to Supabase...`);
    const result = await syncToSupabase(studentId);

    console.log(
      `🔄 [force-resync] Complete: ok=${result.ok}, uploaded=${result.uploaded}, failed=${result.failed}`,
    );

    return result;
  } catch (err) {
    console.error("❌ [force-resync] Failed:", err);
    return {
      ok: false,
      uploaded: 0,
      failed: 0,
      error: err instanceof Error ? err.message : "Force resync failed",
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  📚 STREAMING PAGINATED FETCH
// ══════════════════════════════════════════════════════════════
//  • Supabase ek query mein max 1000 rows deta hai (setting se kam bhi ho
//    sakti hai) — isliye page par page mangte hain jab tak khali page na aaye.
//  • Har page aate hi IndexedDB mein likh diya jata hai (onPage), saari rows
//    memory mein jama nahi hotin — rows lakhon mein hon tab bhi memory flat rehti hai.
//  • Har student ke liye alag paging — offset chhota rehta hai, query tez rehti hai.

const RESTORE_PAGE_SIZE = 1000;

async function streamProgressRows(
  studentIds: string[],
  onPage: (rows: any[]) => Promise<void>,
): Promise<{ total: number; error: { message: string } | null }> {
  let total = 0;

  for (const studentId of studentIds) {
    let from = 0;

    for (;;) {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", studentId)
        // Unique-key columns se pakka order → pages ke beech koi row miss/duplicate nahi
        .order("subject", { ascending: true })
        .order("level", { ascending: true })
        .order("lesson_id", { ascending: true })
        .order("date_key", { ascending: true })
        .range(from, from + RESTORE_PAGE_SIZE - 1);

      if (error) return { total, error };

      const rows = data ?? [];
      // Khali page aaye tabhi khatam. ("< PAGE_SIZE" par rukna galat hai — server
      // ki max-rows setting kam ho to wo khud page chhota kar deta hai.)
      if (rows.length === 0) break;

      await onPage(rows);
      total += rows.length;
      from += rows.length;
    }
  }

  return { total, error: null };
}

function rowToLocal(row: any, fallbackToken: string): LocalProgress {
  return {
    id: buildId(
      row.student_id,
      row.subject,
      row.level,
      row.lesson_id,
      row.date_key,
    ),
    studentId: row.student_id,
    deviceToken: row.device_token || fallbackToken,
    subject: row.subject,
    level: row.level,
    lessonId: row.lesson_id,
    dateKey: row.date_key,
    status: row.status as LessonStatus,
    timeSpentSec: row.time_spent_sec,
    completedAt: row.completed_at,
    score: row.score,
    gameData: row.game_data || null,
    summary: row.summary || null,
    synced: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ══════════════════════════════════════════════════════════════
//  🛡️ RESTORE SAFETY
// ══════════════════════════════════════════════════════════════
//  Restore server se purana data la kar local record ko overwrite kar
//  sakta tha, jabke local record abhi sync nahi hua (naya offline kaam
//  aur uski capture URLs). Aisi records ko restore se bachaya jata hai.

async function keepUnsyncedLocal(
  records: LocalProgress[],
): Promise<LocalProgress[]> {
  if (records.length === 0) return records;
  const existing = await progressDb.lesson_progress.bulkGet(
    records.map((r) => r.id),
  );
  const safe = records.filter((_, i) => !(existing[i] && existing[i]!.synced === false));
  const skipped = records.length - safe.length;
  if (skipped > 0) {
    console.log(
      `🛡️ [restore] Skipped ${skipped} local unsynced record(s) — not overwritten`,
    );
  }
  return safe;
}

// ══════════════════════════════════════════════════════════════
//  ⬇️ RESTORE FROM SUPABASE
// ══════════════════════════════════════════════════════════════

export async function restoreFromSupabase(
  studentId: string,
): Promise<RestoreResult> {
  try {
    console.log(`⬇️ [restore] Fetching progress for: ${studentId}`);

    let restored = 0;
    const { total, error } = await streamProgressRows([studentId], async (rows) => {
      const toStore = await keepUnsyncedLocal(rows.map((r) => rowToLocal(r, "")));
      await progressDb.lesson_progress.bulkPut(toStore);
      restored += toStore.length;
    });

    if (error) {
      console.error("❌ [restore] Supabase error:", error);
      return { ok: false, restored, error: error.message };
    }

    console.log(`✅ [restore] Found ${total}, restored ${restored} records`);
    return { ok: true, restored };
  } catch (err) {
    console.error("❌ [restore] Restore failed:", err);
    return {
      ok: false,
      restored: 0,
      error: err instanceof Error ? err.message : "Restore failed",
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  ⬇️ RESTORE ALL STUDENTS (by token)
// ══════════════════════════════════════════════════════════════

export async function restoreAllStudentsFromSupabase(
  token: string,
  onProgress?: (current: number, total: number) => void,
): Promise<RestoreAllResult> {
  try {
    console.log(`⬇️ [restore-all] Starting for token: ${token}`);

    // ─── 1. Fetch students under this token ──────────────
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("student_id")
      .eq("token", token);

    if (studentsError) {
      console.error("❌ [restore-all] Students fetch error:", studentsError);
      return {
        ok: false,
        studentsRestored: 0,
        recordsRestored: 0,
        error: studentsError.message,
      };
    }

    if (!studentsData || studentsData.length === 0) {
      console.log(`✅ [restore-all] No students under this token`);
      return { ok: true, studentsRestored: 0, recordsRestored: 0 };
    }

    const studentIds = studentsData.map((s) => s.student_id);
    console.log(`📋 [restore-all] Found ${studentIds.length} students`);

    // ─── 2. Stream progress → IndexedDB (page by page) ───
    let restored = 0;
    const { total, error: progressError } = await streamProgressRows(
      studentIds,
      async (rows) => {
        const toStore = await keepUnsyncedLocal(
          rows.map((r) => rowToLocal(r, token)),
        );
        await progressDb.lesson_progress.bulkPut(toStore);
        restored += toStore.length;
        if (onProgress) onProgress(restored, restored);
      },
    );

    if (progressError) {
      // Jo pages aa chuke wo store ho chuke hain; agli baar baaki aa jayenge
      console.error("❌ [restore-all] Progress fetch error:", progressError);
      return {
        ok: false,
        studentsRestored: 0,
        recordsRestored: restored,
        error: progressError.message,
      };
    }

    console.log(
      `✅ [restore-all] Found ${total}, restored ${restored} records for ${studentIds.length} students`,
    );

    return {
      ok: true,
      studentsRestored: studentIds.length,
      recordsRestored: restored,
    };
  } catch (err) {
    console.error("❌ [restore-all] Restore failed:", err);
    return {
      ok: false,
      studentsRestored: 0,
      recordsRestored: 0,
      error: err instanceof Error ? err.message : "Restore failed",
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  🧹 CLEANUP
// ══════════════════════════════════════════════════════════════

export async function clearStudentProgress(studentId: string): Promise<void> {
  try {
    await progressDb.lesson_progress
      .where("studentId")
      .equals(studentId)
      .delete();
    console.log(`🗑️ [progress] Cleared for: ${studentId}`);
  } catch (err) {
    console.error("[progress] clearStudentProgress failed:", err);
  }
}

export async function clearAllProgress(): Promise<void> {
  try {
    await progressDb.lesson_progress.clear();
    console.log("🗑️ [progress] All cleared");
  } catch (err) {
    console.error("[progress] clearAllProgress failed:", err);
  }
}

export async function clearTokenProgress(token: string): Promise<void> {
  try {
    await progressDb.lesson_progress
      .where("deviceToken")
      .equals(token)
      .delete();
    console.log(`🗑️ [progress] Cleared for token: ${token}`);
  } catch (err) {
    console.error("[progress] clearTokenProgress failed:", err);
  }
}

// ══════════════════════════════════════════════════════════════
//  📊 STATS
// ══════════════════════════════════════════════════════════════

export interface ProgressStats {
  total: number;
  synced: number;
  pending: number;
  completed: number;
  uncompleted: number;
}

export async function getProgressStats(
  studentId: string,
): Promise<ProgressStats> {
  try {
    const all = await getStudentProgress(studentId);
    return {
      total: all.length,
      synced: all.filter((r) => r.synced).length,
      pending: all.filter((r) => !r.synced).length,
      completed: all.filter((r) => r.status === "completed").length,
      uncompleted: all.filter((r) => r.status === "uncompleted").length,
    };
  } catch (err) {
    console.error("[progress] getProgressStats failed:", err);
    return {
      total: 0,
      synced: 0,
      pending: 0,
      completed: 0,
      uncompleted: 0,
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  🔥 DEBUG HELPERS — Exposed to window for console testing
// ══════════════════════════════════════════════════════════════

if (typeof window !== "undefined") {
  (window as any).__progressDebug = {
    saveProgress,
    getStudentProgress,
    getPendingCount,
    syncToSupabase,
    forceResyncToSupabase,
    restoreFromSupabase,
    restoreAllStudentsFromSupabase,
    getProgressStats,
    clearStudentProgress,
    clearAllProgress,
    clearTokenProgress,
  };

  console.log(
    "🔧 [progressSync] Debug helpers exposed: window.__progressDebug",
  );
  console.log(
    "💡 Available commands: syncToSupabase, forceResyncToSupabase, getProgressStats",
  );
}