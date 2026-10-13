// src/lib/levelProgress.ts
// 🔥 NO SYNC — Pure local IndexedDB progress
// Koi Google Sheet nahi, koi student binding nahi, koi sync nahi.

const DB_NAME = "taqseemLevelProgressDB";
const DB_VERSION = 1;
const STORE_RECORDS = "records";
const STORE_POINTERS = "pointers";

// ------------------------------------------------------------
//  Types
// ------------------------------------------------------------

export type LessonData = Record<string, unknown>;

export interface LevelProgressRecord {
  id: string;
  subject: string;
  level: number;
  dateKey: string;
  dateLabel: string;
  attempt: number;
  lessons: Record<string, LessonData>;
  updatedAt: string;
}

interface PointerRecord {
  key: string;
  attempt: number;
}

// ------------------------------------------------------------
//  Date helpers
// ------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function baseDateLabelOf(d: Date): string {
  return `${d.getFullYear()}-${MONTHS[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabelWithAttempt(base: string, attempt: number): string {
  return attempt <= 1 ? base : `${base} (Attempt ${attempt})`;
}

// ------------------------------------------------------------
//  IndexedDB helpers
// ------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("No IndexedDB"));
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        const store = db.createObjectStore(STORE_RECORDS, { keyPath: "id" });
        store.createIndex("subject", "subject", { unique: false });
        store.createIndex("level", "level", { unique: false });
        store.createIndex("dateKey", "dateKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_POINTERS)) {
        db.createObjectStore(STORE_POINTERS, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked — close other tabs"));
  });

  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runTx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeNames, mode);
        let result: T;
        Promise.resolve(fn(t))
          .then((r) => (result = r))
          .catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
      }),
  );
}

// ------------------------------------------------------------
//  Pointer helpers
// ------------------------------------------------------------

async function getPointer(key: string): Promise<number> {
  const rec = (await runTx(STORE_POINTERS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_POINTERS).get(key)),
  )) as PointerRecord | undefined;
  return rec?.attempt ?? 1;
}

async function setPointer(key: string, attempt: number): Promise<void> {
  await runTx(STORE_POINTERS, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_POINTERS).put({ key, attempt })),
  );
}

// ------------------------------------------------------------
//  Save lesson progress
// ------------------------------------------------------------

export async function saveLessonProgress(
  subject: string,
  level: number,
  lessonId: number,
  data: LessonData = {},
): Promise<void> {
  if (!isBrowser()) return;

  const now = new Date();
  const dateKey = dateKeyOf(now);
  const baseLabel = baseDateLabelOf(now);
  const pointerKey = `${subject}::${level}::${dateKey}`;

  let attempt = await getPointer(pointerKey);
  let recordId = `${subject}::${level}::${dateKey}::${attempt}`;

  let record = (await runTx(STORE_RECORDS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_RECORDS).get(recordId)),
  )) as LevelProgressRecord | undefined;

  const lessonKey = String(lessonId);

  if (record && record.lessons[lessonKey]) {
    attempt += 1;
    await setPointer(pointerKey, attempt);
    recordId = `${subject}::${level}::${dateKey}::${attempt}`;
    record = undefined;
  }

  const dateLabel = dateLabelWithAttempt(baseLabel, attempt);

  const updated: LevelProgressRecord = record
    ? {
        ...record,
        lessons: { ...record.lessons, [lessonKey]: data },
        updatedAt: now.toISOString(),
      }
    : {
        id: recordId,
        subject,
        level,
        dateKey,
        dateLabel,
        attempt,
        lessons: { [lessonKey]: data },
        updatedAt: now.toISOString(),
      };

  await runTx(STORE_RECORDS, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_RECORDS).put(updated)),
  );
}

// ------------------------------------------------------------
//  Read helpers
// ------------------------------------------------------------

export async function getAllProgressRecords(): Promise<LevelProgressRecord[]> {
  if (!isBrowser()) return [];
  return (await runTx(STORE_RECORDS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_RECORDS).getAll()),
  )) as LevelProgressRecord[];
}

export async function resetAllProgress(): Promise<void> {
  if (!isBrowser()) return;
  await runTx([STORE_RECORDS, STORE_POINTERS], "readwrite", (t) => {
    t.objectStore(STORE_RECORDS).clear();
    t.objectStore(STORE_POINTERS).clear();
  });
}