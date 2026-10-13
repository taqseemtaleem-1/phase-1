// src/lib/auth.ts
// 🔥 Offline-First Auth — Token-based for App
// ✅ UPDATED: Full offline support
//    - validateToken: distinct error codes for offline/invalid/network
//    - loginStudent: cache-first fallback when offline
//    - getStudentsByToken: pure cache fallback for offline
//    - Dual token persistence (localStorage + IndexedDB)

import { supabase } from "./supabase";
import type { Student, Session } from "./types";
import {
  cacheStudents,
  getCachedStudentsByToken,
  getCachedStudents,
  cacheDevices,
  getCachedDeviceByToken,
  setMeta,
  getMeta,
} from "./cache-db";
import { cacheImagesBulk, getCachedImage } from "./image-cache";

const SESSION_KEY = "taqseem:app-session";
const TOKEN_KEY = "taqseem:app-token";
const TOKEN_DB_KEY = "saved_token";

// ══════════════════════════════════════════════════════════════
//  💾 LOCAL STORAGE — Session
// ══════════════════════════════════════════════════════════════

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function getCurrentStudent(): Student | null {
  return getSession()?.student ?? null;
}

// ══════════════════════════════════════════════════════════════
//  🎫 TOKEN STORAGE — DUAL PERSISTENCE (localStorage + IndexedDB)
// ══════════════════════════════════════════════════════════════

export function getSavedToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getSavedTokenAsync(): Promise<string | null> {
  // Try localStorage first
  const ls = getSavedToken();
  if (ls) return ls;
  // Fallback to IndexedDB
  try {
    const dbToken = await getMeta(TOKEN_DB_KEY);
    if (dbToken) {
      // Repopulate localStorage
      try {
        window.localStorage.setItem(TOKEN_KEY, dbToken);
      } catch {}
      return dbToken;
    }
  } catch {}
  return null;
}

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  const normalized = token.trim().toUpperCase();
  try {
    window.localStorage.setItem(TOKEN_KEY, normalized);
  } catch {}
  // Also save to IndexedDB (async, fire-and-forget)
  setMeta(TOKEN_DB_KEY, normalized).catch(() => {});
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {}
  setMeta(TOKEN_DB_KEY, "").catch(() => {});
}

export function hasSavedToken(): boolean {
  return getSavedToken() !== null;
}

// ══════════════════════════════════════════════════════════════
//  🔌 OFFLINE HELPER
// ══════════════════════════════════════════════════════════════

function isOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

// ══════════════════════════════════════════════════════════════
//  🔑 VALIDATE TOKEN
//  Returns distinct error codes so callers can distinguish:
//    - "offline_no_cache"   → offline, no cached device
//    - "network_error"      → online but Supabase unreachable
//    - "invalid_token"      → token not found in Supabase
// ══════════════════════════════════════════════════════════════

export interface ValidateTokenResult {
  ok: boolean;
  valid?: boolean;
  token?: string;
  deviceName?: string;
  error?: string;
}

export async function validateToken(
  token: string,
): Promise<ValidateTokenResult> {
  const id = token.trim().toUpperCase();

  if (!id) {
    return { ok: false, error: "Token is required" };
  }

  // ─── STEP 1: OFFLINE-FIRST — Cache check ──────────────────
  try {
    const cachedDevice = await getCachedDeviceByToken(id);
    if (cachedDevice) {
      console.log(`💾 [auth] Token validated from cache: ${id}`);

      // Background refresh (non-blocking, only if online)
      if (!isOffline()) {
        refreshDeviceInBackground(id).catch(() => {});
      }

      return {
        ok: true,
        valid: true,
        token: cachedDevice.token,
        deviceName: cachedDevice.deviceName || "Device",
      };
    }
  } catch (err) {
    console.warn("[auth] Cache check failed:", err);
  }

  // ─── STEP 2: OFFLINE + no cache → explicit error ──────────
  if (isOffline()) {
    console.warn(`📴 [auth] Offline and no cached device for: ${id}`);
    return { ok: false, error: "offline_no_cache" };
  }

  // ─── STEP 3: ONLINE — Fetch from Supabase ─────────────────
  try {
    const { data, error } = await supabase
      .from("devices")
      .select("token, device_name")
      .eq("token", id)
      .maybeSingle();

    if (error) {
      console.error("[auth] validateToken error:", error);
      return { ok: false, error: "network_error" };
    }

    if (!data) {
      return { ok: true, valid: false, error: "invalid_token" };
    }

    // Cache this device
    await cacheDevices([
      {
        token: data.token,
        deviceName: data.device_name || "Device",
        isLoggedIn: false,
        lastLogin: "",
      },
    ]);

    return {
      ok: true,
      valid: true,
      token: data.token,
      deviceName: data.device_name || "Device",
    };
  } catch (err) {
    console.error("[auth] validateToken failed:", err);
    return { ok: false, error: "network_error" };
  }
}

// ─── Background: refresh device ───────────────────────────
async function refreshDeviceInBackground(token: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("devices")
      .select("token, device_name, is_logged_in, last_login")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) return;

    await cacheDevices([
      {
        token: data.token,
        deviceName: data.device_name || "Device",
        isLoggedIn: data.is_logged_in || false,
        lastLogin: data.last_login || "",
      },
    ]);

    console.log(`🔄 [auth] Device refreshed in background: ${token}`);
  } catch {
    // Silent fail — offline is ok
  }
}

// ══════════════════════════════════════════════════════════════
//  👥 GET STUDENTS BY TOKEN
//  Offline-first: cache → Supabase → cache fallback
// ══════════════════════════════════════════════════════════════

export interface ListStudentsResult {
  ok: boolean;
  students?: Student[];
  error?: string;
  fromCache?: boolean;
}

export async function getStudentsByToken(
  token: string,
): Promise<ListStudentsResult> {
  const id = token.trim().toUpperCase();

  // ─── STEP 1: OFFLINE-FIRST — Try cache ────────────────────
  try {
    const cachedStudents = await getCachedStudentsByToken(id);

    if (cachedStudents.length > 0) {
      console.log(`💾 [auth] Returning ${cachedStudents.length} cached students`);

      // Background refresh (only if online)
      if (!isOffline()) {
        refreshStudentsInBackground(id).catch(() => {});
      }

      return { ok: true, students: cachedStudents, fromCache: true };
    }
  } catch (err) {
    console.warn("[auth] Cache read failed:", err);
  }

  // ─── STEP 2: OFFLINE + no cache → error ───────────────────
  if (isOffline()) {
    return {
      ok: false,
      error: "offline_no_cache",
    };
  }

  // ─── STEP 3: ONLINE — Fetch from Supabase ─────────────────
  try {
    // 3a. Validate token exists
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("token, device_name, is_logged_in, last_login")
      .eq("token", id)
      .maybeSingle();

    if (deviceError) {
      return { ok: false, error: "network_error" };
    }

    if (!device) {
      return { ok: false, error: "invalid_token" };
    }

    // Cache device
    await cacheDevices([
      {
        token: device.token,
        deviceName: device.device_name || "Device",
        isLoggedIn: device.is_logged_in || false,
        lastLogin: device.last_login || "",
      },
    ]);

    // 3b. Get students
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("token", id);

    if (error) {
      return { ok: false, error: "network_error" };
    }

    const students: Student[] = (data || []).map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      fatherName: row.father_name || "",
      schoolId: row.school_id || "",
      schoolName: row.school_name || "",
      grade: row.grade || "",
      photoUrl: row.photo_url || "",
      token: row.token || "",
    }));

    // Save to cache
    await cacheStudents(students);

    // Download and cache images in background
    const photoUrls = students.map((s) => s.photoUrl).filter(Boolean);
    if (photoUrls.length > 0) {
      cacheImagesBulk(photoUrls).catch((err) => {
        console.warn("[auth] Image cache failed:", err);
      });
    }

    console.log(`✅ [auth] Fetched ${students.length} students from Supabase`);

    return { ok: true, students, fromCache: false };
  } catch (err) {
    return { ok: false, error: "network_error" };
  }
}

// ─── Background: refresh students ─────────────────────────
async function refreshStudentsInBackground(token: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("token", token);

    if (error || !data) return;

    const students: Student[] = data.map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      fatherName: row.father_name || "",
      schoolId: row.school_id || "",
      schoolName: row.school_name || "",
      grade: row.grade || "",
      photoUrl: row.photo_url || "",
      token: row.token || "",
    }));

    await cacheStudents(students);

    const photoUrls = students.map((s) => s.photoUrl).filter(Boolean);
    if (photoUrls.length > 0) {
      cacheImagesBulk(photoUrls).catch(() => {});
    }

    console.log(`🔄 [auth] Background refresh: ${students.length} students`);
  } catch {
    // Silent fail
  }
}

// ══════════════════════════════════════════════════════════════
//  🎓 STUDENT LOGIN
//  ✅ UPDATED: Cache-first fallback for offline
// ══════════════════════════════════════════════════════════════

export interface LoginResult {
  ok: boolean;
  student?: Student;
  error?: string;
  fromCache?: boolean;
}

export async function loginStudent(
  studentId: string,
): Promise<LoginResult> {
  const id = studentId.trim();

  if (!id) {
    return { ok: false, error: "Student ID required" };
  }

  // ─── STEP 1: OFFLINE-FIRST — Try cache ────────────────────
  try {
    const allCached = await getCachedStudents();
    const cached = allCached.find((s) => s.studentId === id);

    if (cached) {
      console.log(`💾 [auth] Login from cache: ${id}`);

      saveSession({
        student: cached,
        loginAt: new Date().toISOString(),
      });

      // Background refresh of student (only if online)
      if (!isOffline()) {
        refreshSingleStudentInBackground(id).catch(() => {});
      }

      return { ok: true, student: cached, fromCache: true };
    }
  } catch (err) {
    console.warn("[auth] loginStudent cache check failed:", err);
  }

  // ─── STEP 2: OFFLINE + no cache → error ───────────────────
  if (isOffline()) {
    return {
      ok: false,
      error: "This student is not cached. Please login once online to enable offline mode.",
    };
  }

  // ─── STEP 3: ONLINE — Fetch from Supabase ─────────────────
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", id)
      .maybeSingle();

    if (error) {
      return { ok: false, error: "network_error" };
    }

    if (!data) {
      return { ok: false, error: "Student not found" };
    }

    const student: Student = {
      studentId: data.student_id,
      studentName: data.student_name,
      fatherName: data.father_name || "",
      schoolId: data.school_id || "",
      schoolName: data.school_name || "",
      grade: data.grade || "",
      photoUrl: data.photo_url || "",
      token: data.token || "",
    };

    // Save to cache too (so next time offline works)
    cacheStudents([student]).catch(() => {});

    saveSession({
      student,
      loginAt: new Date().toISOString(),
    });

    return { ok: true, student, fromCache: false };
  } catch (err) {
    return {
      ok: false,
      error: "Login failed. Please try again.",
    };
  }
}

async function refreshSingleStudentInBackground(studentId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error || !data) return;

    const student: Student = {
      studentId: data.student_id,
      studentName: data.student_name,
      fatherName: data.father_name || "",
      schoolId: data.school_id || "",
      schoolName: data.school_name || "",
      grade: data.grade || "",
      photoUrl: data.photo_url || "",
      token: data.token || "",
    };

    // Update cache (don't clear, just upsert)
    cacheStudents([student]).catch(() => {});
  } catch {
    // Silent fail
  }
}

// ══════════════════════════════════════════════════════════════
//  🚪 LOGOUT — sirf session clear (token safe)
// ══════════════════════════════════════════════════════════════

export function logoutStudent() {
  clearSession();
  // Token preserved — same tablet
}

// ══════════════════════════════════════════════════════════════
//  🔄 HEARTBEAT
// ══════════════════════════════════════════════════════════════

export async function checkHeartbeat(
  token: string,
): Promise<"active" | "force_logout"> {
  const id = token.trim().toUpperCase();

  // 🔥 Offline → assume active (don't force logout)
  if (isOffline()) {
    return "active";
  }

  try {
    const { data, error } = await supabase
      .from("devices")
      .select("is_logged_in")
      .eq("token", id)
      .maybeSingle();

    if (error) {
      console.warn("[heartbeat] Network issue, skipping check");
      return "active";
    }

    if (!data) {
      return "force_logout";
    }

    if (!data.is_logged_in) {
      return "force_logout";
    }

    // Update last_login (fire-and-forget)
    supabase
      .from("devices")
      .update({ last_login: new Date().toISOString() })
      .eq("token", id)
      .then(() => {})
      .catch(() => {});

    return "active";
  } catch {
    return "active";
  }
}

// ══════════════════════════════════════════════════════════════
//  🆘 ERROR MESSAGES
// ══════════════════════════════════════════════════════════════

export function getErrorMessage(error?: string): string {
  const map: Record<string, string> = {
    "Student not found": "Student not found.",
    "Student ID required": "Student ID is required.",
    "invalid_token": "This QR code is not registered. Please ask your teacher.",
    "Token is required": "Token is required.",
    "Invalid QR code": "Invalid QR code.",
    "network_error": "Please check your internet connection.",
    "offline_no_cache": "You're offline. Please connect to internet once to set up this device.",
    "login_failed": "Login failed.",
  };
  return map[error || ""] || error || "Something went wrong. Please try again.";
}