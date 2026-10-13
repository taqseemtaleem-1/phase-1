// src/lib/lessonProgress.ts
// Clean, minimal, safe. Sirf 2 cheezein save karta hai:
//   - Kis date/time pe lesson start hua
//   - Poora dekha gaya ya nahi

const DB_NAME = "taqseemProgressDB";
const STORE_NAME = "progress";
const DB_VERSION = 1;

// ─── TYPES ─────────────────────────────────────────────────────
export interface LessonProgress {
  id: string;              // "english:1:1"
  subject: string;
  level: number;
  lessonId: number;
  date: string;            // "2026-Sep-13"
  time: string;            // "04:30 PM"
  watchedFull: boolean;
}

// ─── DATE HELPERS ──────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${MONTHS[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ap}`;
}

// ─── DB OPEN (self-healing) ────────────────────────────────────
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      // Agar browser connection close kare (tab hidden) → cache reset
      db.onclose = () => {
        console.log("🔌 [progress] DB closed by browser");
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };

    req.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB blocked — close other tabs"));
    };
  });

  return dbPromise;
}

// ─── SAFE TRANSACTION RUNNER (auto-retry) ──────────────────────
async function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const attempt = async (): Promise<T> => {
    const db = await openDB();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE_NAME, mode);
      } catch (err) {
        dbPromise = null;
        reject(err);
        return;
      }
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  };

  try {
    return await attempt();
  } catch (err) {
    console.warn("[progress] Retrying with fresh DB...", err);
    dbPromise = null;
    return await attempt();
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────

/**
 * Lesson start hote waqt call karo.
 * - Agar record pehle se hai → kuch nahi karta (original time preserve).
 * - Warna naya record banata hai: watchedFull=false.
 */
export async function startLesson(
  subject: string,
  level: number,
  lessonId: number
): Promise<void> {
  try {
    const id = `${subject}:${level}:${lessonId}`;
    const existing = await runTx<LessonProgress | undefined>(
      "readonly",
      (store) => store.get(id)
    );
    if (existing) {
      console.log(`📘 [progress] Already tracked: ${id}`);
      return;
    }
    const now = new Date();
    const record: LessonProgress = {
      id,
      subject,
      level,
      lessonId,
      date: formatDate(now),
      time: formatTime(now),
      watchedFull: false,
    };
    await runTx("readwrite", (store) => store.put(record));
    console.log(`📘 [progress] Started: ${id}`, record);
  } catch (err) {
    console.warn("[progress] startLesson failed:", err);
  }
}

/**
 * Lesson end pe call karo (complete ya abandon).
 * Date/time kabhi change nahi hote. Sirf watchedFull update hota hai.
 */
export async function endLesson(
  subject: string,
  level: number,
  lessonId: number,
  watchedFull: boolean
): Promise<void> {
  try {
    const id = `${subject}:${level}:${lessonId}`;
    const existing = await runTx<LessonProgress | undefined>(
      "readonly",
      (store) => store.get(id)
    );

    if (!existing) {
      // Safety — agar start miss hua
      const now = new Date();
      const record: LessonProgress = {
        id,
        subject,
        level,
        lessonId,
        date: formatDate(now),
        time: formatTime(now),
        watchedFull,
      };
      await runTx("readwrite", (store) => store.put(record));
      console.log(`✅ [progress] Ended (fresh): ${id}`, record);
      return;
    }

    const updated: LessonProgress = {
      ...existing,
      watchedFull,
    };
    await runTx("readwrite", (store) => store.put(updated));
    console.log(`✅ [progress] Ended: ${id}`, updated);
  } catch (err) {
    console.warn("[progress] endLesson failed:", err);
  }
}

/**
 * Ek lesson ka progress padho.
 */
export async function getLesson(
  subject: string,
  level: number,
  lessonId: number
): Promise<LessonProgress | undefined> {
  try {
    return await runTx<LessonProgress | undefined>(
      "readonly",
      (store) => store.get(`${subject}:${level}:${lessonId}`)
    );
  } catch {
    return undefined;
  }
}

/**
 * Saare lessons ka progress padho.
 */
export async function getAllLessons(): Promise<LessonProgress[]> {
  try {
    return await runTx<LessonProgress[]>("readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

/**
 * Ek lesson ka progress delete karo.
 */
export async function deleteLesson(
  subject: string,
  level: number,
  lessonId: number
): Promise<void> {
  try {
    await runTx("readwrite", (store) =>
      store.delete(`${subject}:${level}:${lessonId}`)
    );
    console.log(`🗑️ [progress] Deleted: ${subject}:${level}:${lessonId}`);
  } catch {}
}

/**
 * Debug: browser console se poori DB clear karne ke liye.
 * ⚠️ Yeh turant execute hota hai, koi confirm nahi.
 */
export async function clearAll(): Promise<void> {
  try {
    await runTx("readwrite", (store) => store.clear());
    console.log("🗑️ [progress] All records cleared");
  } catch {}
}