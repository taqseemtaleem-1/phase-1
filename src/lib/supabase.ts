// src/lib/supabase.ts
// Supabase client setup for the App
// 🔥 FIXED: Env validation + client exposed to window for debugging

import { createClient } from "@supabase/supabase-js";
import { saveCaptureLocally, uploadPendingCaptures } from "./captureStore";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ══════════════════════════════════════════════════════════════
//  🔥 ENV VALIDATION
// ══════════════════════════════════════════════════════════════

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ [App] Supabase credentials missing!\n" +
      "Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY\n" +
      "Check your .env file at project root.\n" +
      `  URL loaded: ${SUPABASE_URL ? "✅" : "❌"}\n` +
      `  KEY loaded: ${SUPABASE_ANON_KEY ? "✅" : "❌"}`
  );
} else {
  const maskedUrl = SUPABASE_URL.replace(
    /(https:\/\/)([^.]+)(\..*)/,
    "$1$2$3"
  );
  console.log(`🔌 [App] Supabase connected: ${maskedUrl}`);
  console.log(
    `🔌 [App] Key length: ${SUPABASE_ANON_KEY.length} chars (${SUPABASE_ANON_KEY.slice(0, 12)}...)`
  );
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ══════════════════════════════════════════════════════════════
//  📸 STUDENT PHOTOS BUCKET
// ══════════════════════════════════════════════════════════════

const PHOTOS_BUCKET = "student-photos";

export async function uploadStudentPhoto(
  file: File,
  studentId: string
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const path = `${studentId}-${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteStudentPhoto(photoUrl: string): Promise<void> {
  try {
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split(`/${PHOTOS_BUCKET}/`);
    if (pathParts.length < 2) return;
    const path = pathParts[1];
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  } catch (err) {
    console.warn("[storage] Failed to delete photo:", err);
  }
}

// ══════════════════════════════════════════════════════════════
//  🎨 FAINT TRACE CAPTURES BUCKET
// ══════════════════════════════════════════════════════════════

const FAINT_TRACE_BUCKET = "faint-trace-captures";

/**
 * 🔥 OFFLINE-FIRST CAPTURE SAVE
 *
 * Saari games (tracing / writing) isi function se capture save karti hain.
 *  1. Image pehle IndexedDB mein save hoti hai (internet ke bagair bhi).
 *  2. Final public URL foran return hota hai (path pehle se tay hota hai).
 *  3. Online ho to background mein upload hota hai; warna image
 *     IndexedDB mein pending rehti hai aur Dashboard ke Sync button
 *     se server par jati hai.
 *
 * Return: public URL (string) — null sirf tab jab image kahin save hi na ho saki.
 */
export async function uploadFaintTraceCapture(
  dataUrl: string,
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  session: "capital" | "small" | string
): Promise<string | null> {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      console.warn("[faint-trace] Invalid dataUrl");
      return null;
    }

    if (!studentId) {
      console.warn("[faint-trace] Missing studentId");
      return null;
    }

    const saved = await saveCaptureLocally(
      dataUrl,
      studentId,
      subject,
      level,
      lessonId,
      session
    );

    if (saved) {
      // Online ho to background upload (game ko wait nahi karna padta)
      if (typeof navigator === "undefined" || navigator.onLine) {
        void uploadPendingCaptures(studentId).catch((err) =>
          console.warn("[faint-trace] Background upload failed:", err)
        );
      } else {
        console.log("[faint-trace] 📴 Offline — capture kept in IndexedDB");
      }
      return saved.publicUrl;
    }

    // IndexedDB available nahi (e.g. private mode) — purana direct upload
    console.warn("[faint-trace] IndexedDB save failed — trying direct upload");
    return await directUploadFaintTraceCapture(
      dataUrl,
      studentId,
      subject,
      level,
      lessonId,
      session
    );
  } catch (err) {
    console.error("[faint-trace] uploadFaintTraceCapture failed:", err);
    return null;
  }
}

/** Fallback: seedha Supabase par upload (sirf tab jab IndexedDB na chale). */
async function directUploadFaintTraceCapture(
  dataUrl: string,
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  session: "capital" | "small" | string
): Promise<string | null> {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      console.warn("[faint-trace] Invalid dataUrl");
      return null;
    }

    if (!studentId) {
      console.warn("[faint-trace] Missing studentId");
      return null;
    }

    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      console.warn("[faint-trace] Failed to convert to blob");
      return null;
    }

    // Content-type blob ke asal mime se (PNG ko .jpg label na ho)
    const contentType = blob.type || "image/png";
    const ext =
      contentType === "image/webp"
        ? "webp"
        : contentType === "image/jpeg"
          ? "jpg"
          : "png";

    const timestamp = Date.now();
    const sanitizedSubject = subject.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const sanitizedStudentId = studentId.replace(/[^A-Za-z0-9-]/g, "");
    const sanitizedSession = session.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const path = `${sanitizedStudentId}/${sanitizedSubject}/level-${level}/lesson-${lessonId}/${sanitizedSession}-${timestamp}.${ext}`;

    console.log(`[faint-trace] Uploading to: ${path}`);

    const { data, error } = await supabase.storage
      .from(FAINT_TRACE_BUCKET)
      .upload(path, blob, {
        cacheControl: "31536000",
        upsert: false,
        contentType,
      });

    if (error) {
      console.error("[faint-trace] Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(FAINT_TRACE_BUCKET)
      .getPublicUrl(data.path);

    console.log(`[faint-trace] ✅ Uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[faint-trace] uploadFaintTraceCapture failed:", err);
    return null;
  }
}

export async function deleteFaintTraceCapture(
  captureUrl: string
): Promise<void> {
  try {
    if (!captureUrl) return;

    const url = new URL(captureUrl);
    const pathParts = url.pathname.split(`/${FAINT_TRACE_BUCKET}/`);
    if (pathParts.length < 2) return;
    const path = pathParts[1];

    await supabase.storage.from(FAINT_TRACE_BUCKET).remove([path]);
    console.log(`[faint-trace] Deleted: ${path}`);
  } catch (err) {
    console.warn("[faint-trace] Failed to delete:", err);
  }
}

export async function deleteFaintTraceCapturesForLesson(
  studentId: string,
  subject: string,
  level: number,
  lessonId: number
): Promise<void> {
  try {
    const sanitizedSubject = subject.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const sanitizedStudentId = studentId.replace(/[^A-Za-z0-9-]/g, "");
    const folderPath = `${sanitizedStudentId}/${sanitizedSubject}/level-${level}/lesson-${lessonId}`;

    const { data, error } = await supabase.storage
      .from(FAINT_TRACE_BUCKET)
      .list(folderPath);

    if (error || !data || data.length === 0) return;

    const pathsToDelete = data.map((file) => `${folderPath}/${file.name}`);
    await supabase.storage.from(FAINT_TRACE_BUCKET).remove(pathsToDelete);
    console.log(`[faint-trace] Deleted ${pathsToDelete.length} captures`);
  } catch (err) {
    console.warn("[faint-trace] Failed to delete captures:", err);
  }
}

export async function listFaintTraceCaptures(
  studentId: string,
  subject: string,
  level: number,
  lessonId: number
): Promise<string[]> {
  try {
    const sanitizedSubject = subject.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const sanitizedStudentId = studentId.replace(/[^A-Za-z0-9-]/g, "");
    const folderPath = `${sanitizedStudentId}/${sanitizedSubject}/level-${level}/lesson-${lessonId}`;

    const { data, error } = await supabase.storage
      .from(FAINT_TRACE_BUCKET)
      .list(folderPath, {
        sortBy: { column: "name", order: "asc" },
      });

    if (error || !data) return [];

    const urls = data.map((file) => {
      const { data: urlData } = supabase.storage
        .from(FAINT_TRACE_BUCKET)
        .getPublicUrl(`${folderPath}/${file.name}`);
      return urlData.publicUrl;
    });

    return urls;
  } catch (err) {
    console.warn("[faint-trace] listFaintTraceCaptures failed:", err);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
//  🛠️ HELPERS
// ══════════════════════════════════════════════════════════════

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length !== 2) return null;

    const mimeMatch = parts[0].match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "image/webp";

    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mime });
  } catch (err) {
    console.warn("[storage] dataUrlToBlob failed:", err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  🔥 DEBUG HELPERS — Exposed to window for console testing
// ══════════════════════════════════════════════════════════════

if (typeof window !== "undefined") {
  (window as any).supabase = supabase;
  (window as any).__supabaseInfo = {
    url: SUPABASE_URL,
    urlLoaded: !!SUPABASE_URL,
    keyLoaded: !!SUPABASE_ANON_KEY,
    keyLength: SUPABASE_ANON_KEY?.length || 0,
  };

  // 🔥 Full debug function — call from console: __debugSupabase()
  (window as any).__debugSupabase = async function () {
    console.clear();
    console.log("🔍 [App] FULL SUPABASE DATA CHECK");
    console.log("═══════════════════════════════════════");

    // TEST 1: Students
    console.log("\n[1] STUDENTS");
    const {
      data: students,
      error: studentsErr,
      count: studentsCount,
    } = await supabase
      .from("students")
      .select("student_id, student_name, token", { count: "exact" });

    if (studentsErr) {
      console.log("  ❌ Error:", studentsErr.message);
    } else {
      console.log("  ✅ Total students:", studentsCount);
      if (students && students.length > 0) console.table(students);
    }

    // TEST 2: lesson_progress
    console.log("\n[2] LESSON_PROGRESS (all records)");
    const {
      data: progress,
      error: progressErr,
      count: progressCount,
    } = await supabase
      .from("lesson_progress")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    if (progressErr) {
      console.log("  ❌ Error:", progressErr.message);
      console.log("  Error code:", progressErr.code);
    } else {
      console.log("  ✅ Total progress records:", progressCount);
      if (progress && progress.length > 0) {
        console.table(
          progress.map((r) => ({
            student_id: r.student_id,
            subject: r.subject,
            level: r.level,
            lesson_id: r.lesson_id,
            status: r.status,
            game_type: r.game_data?.type || "N/A",
            created_at: r.created_at?.slice(0, 19),
          }))
        );
      } else {
        console.log("  🚨 TABLE IS EMPTY!");
      }
    }

    // TEST 3: Amir Khan
    console.log("\n[3] AMIR KHAN (TT-STU-0001)");
    const { data: amir, error: amirErr } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", "TT-STU-0001");

    if (amirErr) {
      console.log("  ❌ Error:", amirErr.message);
    } else {
      console.log("  ✅ Amir Khan records:", amir?.length || 0);
      if (amir && amir.length > 0) {
        console.table(
          amir.map((r) => ({
            subject: r.subject,
            level: r.level,
            lesson_id: r.lesson_id,
            status: r.status,
            game_type: r.game_data?.type || "N/A",
          }))
        );
      } else {
        console.log("  🚨 Amir Khan ka koi record NAHI hai!");
      }
    }

    // TEST 4: Drag-drop specifically
    console.log("\n[4] DRAG-DROP RECORDS");
    const { data: allRows } = await supabase
      .from("lesson_progress")
      .select("*");

    const filtered = (allRows || []).filter(
      (r) => r.game_data && r.game_data.type === "alphabet-drag-drop-match"
    );
    console.log("  ✅ Drag-drop records:", filtered.length);
    if (filtered.length > 0) {
      console.table(filtered);
    }

    // SUMMARY
    console.log("\n═══════════════════════════════════════");
    console.log("📊 SUMMARY");
    console.log("═══════════════════════════════════════");
    console.log("  Students:         " + (studentsCount || 0));
    console.log("  Progress records: " + (progressCount || 0));
    console.log("  Amir Khan:        " + (amir?.length || 0));
    console.log("  Drag-drop:        " + filtered.length);
    console.log("═══════════════════════════════════════");
  };

  console.log(
    "🔧 [App] Debug helpers exposed: window.supabase, window.__supabaseInfo, window.__debugSupabase"
  );
  console.log("💡 Run __debugSupabase() in console to check data");
}