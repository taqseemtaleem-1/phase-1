// src/lib/cache-db.ts
// IndexedDB cache using Dexie.js
// ✅ UPDATED: Added upsert for students (don't clear all)

import Dexie, { type Table } from "dexie";
import type { Student, Device } from "./types";

// ══════════════════════════════════════════════════════════════
//  📦 CACHE TYPES
// ══════════════════════════════════════════════════════════════

export interface CachedStudent extends Student {}

export interface CachedDevice {
  token: string;
  deviceName: string;
  isLoggedIn: boolean;
  lastLogin: string;
}

export interface CachedMeta {
  key: string;
  value: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════
//  🗄️ INDEXEDDB DATABASE
// ══════════════════════════════════════════════════════════════

class TaqseemAppDB extends Dexie {
  students!: Table<CachedStudent, string>;
  devices!: Table<CachedDevice, string>;
  meta!: Table<CachedMeta, string>;

  constructor() {
    super("taqseem-app-db");

    this.version(1).stores({
      students: "studentId, schoolId, grade, token, studentName",
      devices: "token, deviceName",
      meta: "key",
    });
  }
}

export const db = new TaqseemAppDB();

// ══════════════════════════════════════════════════════════════
//  👥 STUDENTS CACHE
//  ✅ UPDATED: Upsert instead of clear+put
//     This prevents accidental data loss if `students` array is
//     empty or partial.
// ══════════════════════════════════════════════════════════════

export async function cacheStudents(students: Student[]): Promise<void> {
  if (students.length === 0) {
    console.warn("[cache] cacheStudents: empty array — skipping");
    return;
  }
  try {
    await db.transaction("rw", db.students, async () => {
      await db.students.bulkPut(students);
    });
    console.log(`💾 [cache] Upserted ${students.length} students`);
  } catch (err) {
    console.error("[cache] Students save failed:", err);
  }
}

/**
 * 🔥 NEW: Replace all students — used when fresh fetch returns
 * a full list that should overwrite the entire cache.
 */
export async function replaceAllStudents(students: Student[]): Promise<void> {
  try {
    await db.transaction("rw", db.students, async () => {
      await db.students.clear();
      await db.students.bulkPut(students);
    });
    console.log(`💾 [cache] Replaced with ${students.length} students`);
  } catch (err) {
    console.error("[cache] Students replace failed:", err);
  }
}

export async function getCachedStudents(): Promise<Student[]> {
  try {
    const all = await db.students.toArray();
    return all;
  } catch (err) {
    console.error("[cache] Students load failed:", err);
    return [];
  }
}

export async function getCachedStudentsByToken(
  token: string,
): Promise<Student[]> {
  try {
    const id = token.trim().toUpperCase();
    const all = await db.students.where("token").equals(id).toArray();
    return all;
  } catch (err) {
    console.error("[cache] Students by token failed:", err);
    return [];
  }
}

export async function clearStudentsCache(): Promise<void> {
  try {
    await db.students.clear();
    console.log("🗑️ [cache] Students cleared");
  } catch (err) {
    console.error("[cache] Clear students failed:", err);
  }
}

// ══════════════════════════════════════════════════════════════
//  📱 DEVICES CACHE
//  ✅ UPDATED: Upsert instead of clear+put
// ══════════════════════════════════════════════════════════════

export async function cacheDevices(devices: Device[]): Promise<void> {
  if (devices.length === 0) {
    console.warn("[cache] cacheDevices: empty array — skipping");
    return;
  }
  try {
    const mapped: CachedDevice[] = devices.map((d) => ({
      token: d.token,
      deviceName: d.deviceName,
      isLoggedIn: d.isLoggedIn,
      lastLogin: d.lastLogin || "",
    }));

    await db.transaction("rw", db.devices, async () => {
      await db.devices.bulkPut(mapped);
    });
    console.log(`💾 [cache] Upserted ${devices.length} devices`);
  } catch (err) {
    console.error("[cache] Devices save failed:", err);
  }
}

export async function getCachedDevices(): Promise<Device[]> {
  try {
    const all = await db.devices.toArray();
    return all.map((d) => ({
      token: d.token,
      deviceName: d.deviceName,
      isLoggedIn: d.isLoggedIn,
      lastLogin: d.lastLogin,
    }));
  } catch (err) {
    console.error("[cache] Devices load failed:", err);
    return [];
  }
}

export async function getCachedDeviceByToken(
  token: string,
): Promise<Device | null> {
  try {
    const id = token.trim().toUpperCase();
    const device = await db.devices.get(id);
    if (!device) return null;

    return {
      token: device.token,
      deviceName: device.deviceName,
      isLoggedIn: device.isLoggedIn,
      lastLogin: device.lastLogin,
    };
  } catch (err) {
    console.error("[cache] Device by token failed:", err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  ⚙️ META (timestamps, flags, saved token, etc.)
// ══════════════════════════════════════════════════════════════

export async function setMeta(key: string, value: string): Promise<void> {
  try {
    await db.meta.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cache] Set meta failed:", err);
  }
}

export async function getMeta(key: string): Promise<string | null> {
  try {
    const entry = await db.meta.get(key);
    return entry?.value ?? null;
  } catch (err) {
    console.error("[cache] Get meta failed:", err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  📊 CACHE STATS
// ══════════════════════════════════════════════════════════════

export interface CacheStats {
  students: number;
  devices: number;
  lastSync: string | null;
  hasData: boolean;
}

export async function getCacheStats(): Promise<CacheStats> {
  try {
    const [students, devices, lastSync] = await Promise.all([
      db.students.count(),
      db.devices.count(),
      getMeta("last_sync"),
    ]);

    return {
      students,
      devices,
      lastSync,
      hasData: students > 0 || devices > 0,
    };
  } catch {
    return {
      students: 0,
      devices: 0,
      lastSync: null,
      hasData: false,
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  🗑️ CLEAR ALL CACHE
// ══════════════════════════════════════════════════════════════

export async function clearAllCache(): Promise<void> {
  try {
    await db.transaction("rw", [db.students, db.devices, db.meta], async () => {
      await db.students.clear();
      await db.devices.clear();
      await db.meta.clear();
    });
    console.log("🗑️ [cache] All cache cleared");
  } catch (err) {
    console.error("[cache] Clear all failed:", err);
  }
}