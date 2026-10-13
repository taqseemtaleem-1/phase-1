// ============================================================
//  src/lib/db.ts
//  Taqseem Taleem — Offline-first IndexedDB data layer
// ============================================================
//  Everything in this file works 100% offline. IndexedDB lives
//  inside the browser/tablet itself, so nothing here ever needs
//  internet access to save or read data.
//
//  What it gives you:
//   • A stable per-tablet "device id" (auto-generated once, kept
//     forever, no username/password needed for it).
//   • A simple username + password store (kept locally for now).
//   • A generic "activity" log — call logActivity(...) from
//     anywhere in the app (any lesson, any game, any screen) with
//     whatever data you want saved. Nothing is hard-coded to a
//     specific lesson shape, so you can log literally anything.
// ============================================================

const DB_NAME = "taqseemTaleemDB";
const DB_VERSION = 1;

const STORE_DEVICE = "device";
const STORE_USERS = "users";
const STORE_SESSION = "session";
const STORE_ACTIVITIES = "activities";

// ------------------------------------------------------------
//  Types
// ------------------------------------------------------------

export interface StoredUser {
  username: string;
  passwordHash: string;
  deviceId: string;
  createdAt: string;
}

export interface CurrentUser {
  username: string;
  deviceId: string;
}

export interface ActivityInput {
  /** Free-form label for what happened, e.g. "lesson_complete", "game_score", "button_click" */
  type: string;
  /** Optional — fill in when the activity belongs to a specific lesson */
  subject?: string;
  level?: number | string;
  lessonId?: number | string;
  unit?: number | string;
  /** Anything you want — score, duration, answers, mistakes, whatever. */
  data?: Record<string, unknown>;
}

export interface ActivityRecord extends ActivityInput {
  id: number;
  username: string;
  deviceId: string;
  lessonKey: string;
  createdAt: string;
}

export interface ActivityFilter {
  username?: string;
  subject?: string;
  level?: number | string;
  lessonId?: number | string;
  type?: string;
}

// ------------------------------------------------------------
//  Low-level helpers
// ------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB is not available (server-side render)"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_DEVICE)) {
        db.createObjectStore(STORE_DEVICE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        db.createObjectStore(STORE_USERS, { keyPath: "username" });
      }
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVITIES)) {
        const store = db.createObjectStore(STORE_ACTIVITIES, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("username", "username", { unique: false });
        store.createIndex("subject", "subject", { unique: false });
        store.createIndex("lessonKey", "lessonKey", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked — close other tabs of this app"));
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
          .then((r) => {
            result = r;
          })
          .catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error("IndexedDB transaction aborted"));
      }),
  );
}

function uuid(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function hashPassword(password: string): Promise<string> {
  if (isBrowser() && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Extremely unlikely fallback (no SubtleCrypto) — still better than plaintext.
  let h = 0;
  for (let i = 0; i < password.length; i++) h = (h * 31 + password.charCodeAt(i)) | 0;
  return String(h);
}

// ------------------------------------------------------------
//  Device / Tablet ID — works with zero login, created once per tablet
// ------------------------------------------------------------

export async function getDeviceId(): Promise<string> {
  if (!isBrowser()) return "";

  const existing = await runTx(STORE_DEVICE, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_DEVICE).get("tabletId")),
  );
  if (existing) return (existing as { value: string }).value;

  const id = uuid();
  await runTx(STORE_DEVICE, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_DEVICE).put({ key: "tabletId", value: id })),
  );
  return id;
}

// ------------------------------------------------------------
//  Users (username + password) — local only for now.
// ------------------------------------------------------------

export async function registerUser(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isBrowser()) return { ok: false, error: "not_in_browser" };
  const name = username.trim();
  if (!name || !password) return { ok: false, error: "username_and_password_required" };

  const existing = await runTx(STORE_USERS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_USERS).get(name)),
  );
  if (existing) return { ok: false, error: "username_already_exists" };

  const deviceId = await getDeviceId();
  const user: StoredUser = {
    username: name,
    passwordHash: await hashPassword(password),
    deviceId,
    createdAt: new Date().toISOString(),
  };

  await runTx(STORE_USERS, "readwrite", (t) => reqToPromise(t.objectStore(STORE_USERS).put(user)));
  await setCurrentUser(name);
  return { ok: true };
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isBrowser()) return { ok: false, error: "not_in_browser" };
  const name = username.trim();

  const user = (await runTx(STORE_USERS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_USERS).get(name)),
  )) as StoredUser | undefined;

  if (!user) return { ok: false, error: "user_not_found" };
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return { ok: false, error: "wrong_password" };

  await setCurrentUser(name);
  return { ok: true };
}

async function setCurrentUser(username: string): Promise<void> {
  await runTx(STORE_SESSION, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_SESSION).put({ key: "currentUser", value: username })),
  );
}

export async function logoutUser(): Promise<void> {
  if (!isBrowser()) return;
  await runTx(STORE_SESSION, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_SESSION).delete("currentUser")),
  );
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isBrowser()) return null;
  const session = (await runTx(STORE_SESSION, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_SESSION).get("currentUser")),
  )) as { value: string } | undefined;

  if (!session) return null;
  return { username: session.value, deviceId: await getDeviceId() };
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

export async function listUsers(): Promise<Omit<StoredUser, "passwordHash">[]> {
  if (!isBrowser()) return [];
  const all = (await runTx(STORE_USERS, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_USERS).getAll()),
  )) as StoredUser[];
  return all.map(({ passwordHash: _passwordHash, ...rest }) => rest);
}

// ------------------------------------------------------------
//  Activities — the generic "save whatever I want" log.
//  Call this from any lesson, any game, any screen.
// ------------------------------------------------------------

function lessonKeyOf(input: ActivityInput): string {
  return [input.subject ?? "-", input.level ?? "-", input.lessonId ?? "-"].join(":");
}

export async function logActivity(input: ActivityInput): Promise<number | null> {
  if (!isBrowser()) return null;

  const current = await getCurrentUser();
  const deviceId = current?.deviceId ?? (await getDeviceId());

  const record: Omit<ActivityRecord, "id"> = {
    ...input,
    username: current?.username ?? "guest",
    deviceId,
    lessonKey: lessonKeyOf(input),
    createdAt: new Date().toISOString(),
  };

  const id = await runTx(STORE_ACTIVITIES, "readwrite", (t) =>
    reqToPromise(t.objectStore(STORE_ACTIVITIES).add(record)),
  );
  return id as number;
}

/** Convenience shortcut for the very common "this lesson is done" event. */
export function logLessonComplete(
  subject: string,
  level: number | string,
  lessonId: number | string,
  extra?: Record<string, unknown>,
) {
  return logActivity({ type: "lesson_complete", subject, level, lessonId, data: extra });
}

export async function getActivities(filter: ActivityFilter = {}): Promise<ActivityRecord[]> {
  if (!isBrowser()) return [];
  const all = (await runTx(STORE_ACTIVITIES, "readonly", (t) =>
    reqToPromise(t.objectStore(STORE_ACTIVITIES).getAll()),
  )) as ActivityRecord[];

  return all.filter((a) => {
    if (filter.username && a.username !== filter.username) return false;
    if (filter.subject && a.subject !== filter.subject) return false;
    if (filter.level !== undefined && String(a.level) !== String(filter.level)) return false;
    if (filter.lessonId !== undefined && String(a.lessonId) !== String(filter.lessonId)) return false;
    if (filter.type && a.type !== filter.type) return false;
    return true;
  });
}

/** Everything logged for one exact lesson (subject + level + lessonId). */
export function getLessonActivities(
  subject: string,
  level: number | string,
  lessonId: number | string,
) {
  return getActivities({ subject, level, lessonId });
}

// ------------------------------------------------------------
//  Export / reset — handy for debugging or a "backup" button
// ------------------------------------------------------------

export async function exportAllData() {
  if (!isBrowser()) return null;
  const [users, activities, deviceId] = await Promise.all([
    listUsers(),
    getActivities(),
    getDeviceId(),
  ]);
  return { deviceId, users, activities, exportedAt: new Date().toISOString() };
}

/** Wipes ALL local data (users, activities, session). Device id is kept. Use with care. */
export async function resetAllData(): Promise<void> {
  if (!isBrowser()) return;
  await runTx([STORE_USERS, STORE_ACTIVITIES, STORE_SESSION], "readwrite", (t) => {
    t.objectStore(STORE_USERS).clear();
    t.objectStore(STORE_ACTIVITIES).clear();
    t.objectStore(STORE_SESSION).clear();
  });
}
