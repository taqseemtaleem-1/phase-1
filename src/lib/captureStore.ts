// src/lib/captureStore.ts
// ============================================================
//  Taqseem Taleem — Offline-first capture store
//
//  Tracing / writing games ki har capture image PEHLE IndexedDB
//  mein save hoti hai (internet ho ya na ho), phir upload hoti hai.
//
//  FLOW
//   1. Game capture banata hai (PNG data URL)
//   2. saveCaptureLocally() → WebP mein convert → IndexedDB mein
//      status "pending" ke saath save. Storage path + final public
//      URL us waqt hi tay ho jata hai (URL banane ke liye internet
//      nahi chahiye), isliye game ko foran valid URL mil jata hai
//      aur wo gameData.captures mein save ho jata hai.
//   3. Online ho to background mein upload shuru hota hai. Offline
//      ho to image IndexedDB mein pending rehti hai.
//   4. Dashboard ka Sync button (syncToSupabase) pehle pending
//      captures upload karta hai, phir progress rows. Upload ke
//      confirm hone par hi status "uploaded" hota hai.
//
//  GUARANTEES
//   • Capture kabhi delete nahi hota jab tak upload confirm na ho.
//   • Upload fail ho to record pending rehta hai, agle Sync par retry.
//   • Path fixed hota hai, isliye retry par duplicate file nahi banti
//     ("already exists" ko success maana jata hai).
// ============================================================

import Dexie, { type Table } from "dexie";
import { supabase } from "./supabase";

// NOTE: supabase.ts mein bhi yahi bucket name hai.
export const FAINT_TRACE_BUCKET = "faint-trace-captures";

/** WebP quality (0–1). 0.95 = handwriting ke liye practically lossless. */
const CAPTURE_WEBP_QUALITY = 0.95;

/**
 * WebP conversion ko max itna waqt (ms). Is se zyada lage (ya browser latak
 * jaye) to original PNG hi save ho jati hai — upload kabhi nahi rukta.
 */
const WEBP_CONVERT_TIMEOUT_MS = 2500;

/**
 * true  → upload ke baad bhi image IndexedDB mein rakhi jaye (zyada storage)
 * false → upload confirm hone ke baad image data hata diya jaye (tablet space bachta hai)
 */
const KEEP_DATA_AFTER_UPLOAD = false;

// ══════════════════════════════════════════════════════════════
//  📦 TYPES
// ══════════════════════════════════════════════════════════════

export type CaptureStatus = "pending" | "uploaded";

export interface LocalCapture {
  /** Storage path (unique) — bucket ke andar ka path */
  id: string;
  studentId: string;
  subject: string;
  level: number;
  lessonId: number;
  session: string;
  mime: string;
  ext: string;
  /** Image bytes. Upload confirm hone ke baad null ho sakta hai. */
  data: ArrayBuffer | null;
  sizeBytes: number;
  /** Final public URL (path se pehle hi bana liya jata hai) */
  publicUrl: string;
  status: CaptureStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  uploadedAt: string | null;
}

export interface CaptureUploadResult {
  /** Is run mein kitni captures upload hui */
  uploaded: number;
  /** Is run ke baad kitni abhi bhi pending hain */
  remaining: number;
  /** true agar internet na hone ki wajah se koshish hi nahi hui */
  skippedOffline: boolean;
  error?: string;
}

// ══════════════════════════════════════════════════════════════
//  🗄️ INDEXEDDB
// ══════════════════════════════════════════════════════════════

class CaptureDB extends Dexie {
  captures!: Table<LocalCapture, string>;

  constructor() {
    super("taqseem-captures-db");
    this.version(1).stores({
      captures: "id, studentId, status, [studentId+status], createdAt",
    });
  }
}

export const captureDb = new CaptureDB();

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

// ══════════════════════════════════════════════════════════════
//  🛠️ HELPERS
// ══════════════════════════════════════════════════════════════

function sanitize(value: string, pattern: RegExp): string {
  return value.replace(pattern, "");
}

function buildCapturePath(
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  session: string,
  ext: string,
): string {
  const s = sanitize(subject.toLowerCase(), /[^a-z0-9-]/g);
  const stu = sanitize(studentId, /[^A-Za-z0-9-]/g);
  const ses = sanitize(session.toLowerCase(), /[^a-z0-9-]/g) || "capture";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stu}/${s}/level-${level}/lesson-${lessonId}/${ses}-${Date.now()}-${rand}.${ext}`;
}

function getPublicUrl(path: string): string {
  return supabase.storage.from(FAINT_TRACE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

function dataUrlToBytes(
  dataUrl: string,
): { mime: string; data: ArrayBuffer } | null {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const mimeMatch = header.match(/^data:([^;]+);base64$/);
    if (!mimeMatch) return null;
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { mime: mimeMatch[1], data: bytes.buffer as ArrayBuffer };
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function extForMime(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "img";
}

/**
 * Data URL → WebP bytes. Agar browser WebP encode na kar sake to
 * original format (PNG) hi sahi extension/content-type ke saath rakhta hai.
 */
async function toStorableImage(
  dataUrl: string,
): Promise<{ data: ArrayBuffer; mime: string; ext: string } | null> {
  const original = dataUrlToBytes(dataUrl);
  if (!original) return null;

  // Original (PNG) hamesha tayyar rehti hai — WebP fail/timeout ho to yahi save hogi.
  const fallback = {
    data: original.data,
    mime: original.mime,
    ext: extForMime(original.mime),
  };

  if (original.mime === "image/webp" || typeof document === "undefined") {
    return fallback;
  }

  try {
    const webp = await withTimeout(
      (async () => {
        const img = await loadImage(dataUrl);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!(w > 0 && h > 0)) throw new Error("empty image");

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", CAPTURE_WEBP_QUALITY),
        );
        // Kuch browsers WebP support na hon to PNG de dete hain — check zaroori hai
        if (!blob || blob.type !== "image/webp" || blob.size === 0) {
          throw new Error("browser did not produce WebP");
        }
        return {
          data: await blob.arrayBuffer(),
          mime: "image/webp",
          ext: "webp",
        };
      })(),
      WEBP_CONVERT_TIMEOUT_MS,
    );
    return webp;
  } catch (err) {
    console.warn(
      "[captureStore] WebP not available — saving original instead:",
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

let persistRequested = false;

/** Browser ko bolta hai ke storage kam hone par bhi IndexedDB data na uraye. */
export async function requestPersistentStorage(): Promise<void> {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage?.persist &&
      !(await navigator.storage.persisted())
    ) {
      await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
}

// ══════════════════════════════════════════════════════════════
//  💾 SAVE (always local first)
// ══════════════════════════════════════════════════════════════

/**
 * Capture ko IndexedDB mein save karta hai. Promise tab resolve hota hai
 * jab data disk par commit ho chuka ho. Internet ki zaroorat nahi.
 * Fail hone par null (caller fallback use kar sakta hai).
 */
export async function saveCaptureLocally(
  dataUrl: string,
  studentId: string,
  subject: string,
  level: number,
  lessonId: number,
  session: string,
): Promise<{ id: string; publicUrl: string } | null> {
  if (!hasIndexedDb()) return null;

  try {
    const image = await toStorableImage(dataUrl);
    if (!image) {
      console.warn("[captureStore] Invalid data URL");
      return null;
    }

    const id = buildCapturePath(
      studentId,
      subject,
      level,
      lessonId,
      session,
      image.ext,
    );
    const publicUrl = getPublicUrl(id);

    const record: LocalCapture = {
      id,
      studentId,
      subject,
      level,
      lessonId,
      session,
      mime: image.mime,
      ext: image.ext,
      data: image.data,
      sizeBytes: image.data.byteLength,
      publicUrl,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      uploadedAt: null,
    };

    await captureDb.captures.put(record);
    void requestPersistentStorage();

    console.log(
      `💾 [captureStore] Saved locally (${Math.round(record.sizeBytes / 1024)} KB, ${image.ext}): ${id}`,
    );
    return { id, publicUrl };
  } catch (err) {
    console.error("[captureStore] saveCaptureLocally failed:", err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  ☁️ UPLOAD
// ══════════════════════════════════════════════════════════════

function isAlreadyExistsError(error: unknown): boolean {
  const e = error as { statusCode?: string | number; message?: string };
  return (
    String(e?.statusCode ?? "") === "409" ||
    /already exists|duplicate/i.test(e?.message ?? "")
  );
}

function isNetworkError(message: string): boolean {
  return /failed to fetch|network|offline|load failed|timeout/i.test(message);
}

async function uploadOne(rec: LocalCapture): Promise<void> {
  if (!rec.data) throw new Error("Capture data missing");

  const blob = new Blob([rec.data], { type: rec.mime });
  const { error } = await supabase.storage
    .from(FAINT_TRACE_BUCKET)
    .upload(rec.id, blob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: rec.mime,
    });

  // Pehli koshish mein file chali gayi thi lekin confirm save na ho saka —
  // to retry par "already exists" aata hai. Ye success hai.
  if (error && !isAlreadyExistsError(error)) {
    throw new Error(error.message || "Upload failed");
  }
}

async function doUploadPending(
  studentId?: string,
): Promise<CaptureUploadResult> {
  if (!hasIndexedDb()) {
    return { uploaded: 0, remaining: 0, skippedOffline: false };
  }

  const pending = studentId
    ? await captureDb.captures
        .where("[studentId+status]")
        .equals([studentId, "pending"])
        .toArray()
    : await captureDb.captures.where("status").equals("pending").toArray();

  if (pending.length === 0) {
    return { uploaded: 0, remaining: 0, skippedOffline: false };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      uploaded: 0,
      remaining: pending.length,
      skippedOffline: true,
    };
  }

  // Purani pehle
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let uploaded = 0;
  let lastError: string | undefined;

  for (const rec of pending) {
    try {
      await uploadOne(rec);
      await captureDb.captures.update(rec.id, {
        status: "uploaded",
        uploadedAt: new Date().toISOString(),
        attempts: rec.attempts + 1,
        lastError: null,
        data: KEEP_DATA_AFTER_UPLOAD ? rec.data : null,
      });
      uploaded++;
      console.log(`☁️ [captureStore] Uploaded: ${rec.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      lastError = message;
      console.error(`❌ [captureStore] Upload failed: ${rec.id}`, message);
      // Record pending hi rehta hai — agli baar retry hoga
      await captureDb.captures
        .update(rec.id, { attempts: rec.attempts + 1, lastError: message })
        .catch(() => {});
      // Internet gaya to baaki par time zaya na karo
      if (isNetworkError(message)) break;
    }
  }

  return {
    uploaded,
    remaining: pending.length - uploaded,
    skippedOffline: false,
    error: lastError,
  };
}

// Uploads serialize hote hain taake ek hi capture do baar upload na ho.
let uploadChain: Promise<unknown> = Promise.resolve();

/** Pending captures upload karo (studentId diya ho to sirf us student ki). */
export function uploadPendingCaptures(
  studentId?: string,
): Promise<CaptureUploadResult> {
  const run = uploadChain.then(
    () => doUploadPending(studentId),
    () => doUploadPending(studentId),
  );
  uploadChain = run.catch(() => {});
  return run;
}

// ══════════════════════════════════════════════════════════════
//  📖 QUERIES
// ══════════════════════════════════════════════════════════════

export async function getPendingCaptureCount(
  studentId: string,
): Promise<number> {
  if (!hasIndexedDb()) return 0;
  try {
    return await captureDb.captures
      .where("[studentId+status]")
      .equals([studentId, "pending"])
      .count();
  } catch (err) {
    console.error("[captureStore] getPendingCaptureCount failed:", err);
    return 0;
  }
}

/** Un captures ke public URLs jo abhi tak server par nahi pohanche. */
export async function getPendingCaptureUrls(
  studentId: string,
): Promise<string[]> {
  if (!hasIndexedDb()) return [];
  try {
    const rows = await captureDb.captures
      .where("[studentId+status]")
      .equals([studentId, "pending"])
      .toArray();
    return rows.map((r) => r.publicUrl);
  } catch (err) {
    console.error("[captureStore] getPendingCaptureUrls failed:", err);
    return [];
  }
}

export interface CaptureStats {
  total: number;
  pending: number;
  uploaded: number;
  pendingBytes: number;
}

export async function getCaptureStats(studentId?: string): Promise<CaptureStats> {
  const empty: CaptureStats = {
    total: 0,
    pending: 0,
    uploaded: 0,
    pendingBytes: 0,
  };
  if (!hasIndexedDb()) return empty;
  try {
    const all = studentId
      ? await captureDb.captures.where("studentId").equals(studentId).toArray()
      : await captureDb.captures.toArray();
    const pending = all.filter((c) => c.status === "pending");
    return {
      total: all.length,
      pending: pending.length,
      uploaded: all.length - pending.length,
      pendingBytes: pending.reduce((sum, c) => sum + c.sizeBytes, 0),
    };
  } catch {
    return empty;
  }
}

// ══════════════════════════════════════════════════════════════
//  🔧 DEBUG HELPERS
// ══════════════════════════════════════════════════════════════

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__captureDebug = {
    getCaptureStats,
    getPendingCaptureCount,
    uploadPendingCaptures,
    list: () => captureDb.captures.toArray(),
  };
}
