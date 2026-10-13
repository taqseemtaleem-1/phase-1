// src/lib/image-cache.ts
// Image blob cache for offline photos
// ✅ UPDATED: Better error handling + singleton DB

import Dexie, { type Table } from "dexie";

// ══════════════════════════════════════════════════════════════
//  📸 IMAGE CACHE TYPES
// ══════════════════════════════════════════════════════════════

export interface CachedImage {
  url: string;
  blob: Blob;
  dataUrl: string;
  cachedAt: string;
  size: number;
}

// ══════════════════════════════════════════════════════════════
//  🗄️ IMAGE CACHE DATABASE
// ══════════════════════════════════════════════════════════════

class ImageCacheDB extends Dexie {
  images!: Table<CachedImage, string>;

  constructor() {
    super("taqseem-images-db");

    this.version(1).stores({
      images: "url, cachedAt",
    });
  }
}

export const imageDb = new ImageCacheDB();

// ══════════════════════════════════════════════════════════════
//  📥 DOWNLOAD & CACHE IMAGE
// ══════════════════════════════════════════════════════════════

export async function cacheImage(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    // Check if already cached
    const existing = await imageDb.images.get(url);
    if (existing) {
      console.log(`📸 [image] Already cached: ${url.substring(0, 50)}...`);
      return existing.dataUrl;
    }

    // 🔥 If offline — don't even try to fetch
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log(`📴 [image] Offline — skipping download`);
      return null;
    }

    // Download image
    console.log(`📥 [image] Downloading: ${url.substring(0, 50)}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();

    // Convert to data URL
    const dataUrl = await blobToDataUrl(blob);

    // Save to IndexedDB
    await imageDb.images.put({
      url,
      blob,
      dataUrl,
      cachedAt: new Date().toISOString(),
      size: blob.size,
    });

    console.log(`✅ [image] Cached (${Math.round(blob.size / 1024)} KB)`);
    return dataUrl;
  } catch (err) {
    console.warn(`❌ [image] Cache failed:`, err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  📤 GET CACHED IMAGE
// ══════════════════════════════════════════════════════════════

export async function getCachedImage(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const entry = await imageDb.images.get(url);
    return entry?.dataUrl ?? null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  📦 BULK CACHE IMAGES
// ══════════════════════════════════════════════════════════════

export async function cacheImagesBulk(
  urls: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: number; failed: number }> {
  // 🔥 Offline check
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.log("📴 [image] Offline — skipping bulk cache");
    return { success: 0, failed: urls.length };
  }

  let success = 0;
  let failed = 0;
  const total = urls.length;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await cacheImage(url);

    if (result) success++;
    else failed++;

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  console.log(`📸 [image] Bulk cache: ${success} success, ${failed} failed`);
  return { success, failed };
}

// ══════════════════════════════════════════════════════════════
//  🗑️ CLEANUP OLD IMAGES
// ══════════════════════════════════════════════════════════════

export async function cleanupOldImages(daysOld: number = 30): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const cutoffStr = cutoff.toISOString();

    const oldImages = await imageDb.images
      .where("cachedAt")
      .below(cutoffStr)
      .toArray();

    await imageDb.images.bulkDelete(oldImages.map((img) => img.url));
    console.log(`🗑️ [image] Cleaned up ${oldImages.length} old images`);
    return oldImages.length;
  } catch (err) {
    console.error("[image] Cleanup failed:", err);
    return 0;
  }
}

// ══════════════════════════════════════════════════════════════
//  📊 IMAGE CACHE STATS
// ══════════════════════════════════════════════════════════════

export interface ImageCacheStats {
  count: number;
  totalSize: number;
}

export async function getImageCacheStats(): Promise<ImageCacheStats> {
  try {
    const all = await imageDb.images.toArray();
    const totalSize = all.reduce((sum, img) => sum + img.size, 0);
    return { count: all.length, totalSize };
  } catch {
    return { count: 0, totalSize: 0 };
  }
}

// ══════════════════════════════════════════════════════════════
//  🗑️ CLEAR IMAGE CACHE
// ══════════════════════════════════════════════════════════════

export async function clearImageCache(): Promise<void> {
  try {
    await imageDb.images.clear();
    console.log("🗑️ [image] Cache cleared");
  } catch (err) {
    console.error("[image] Clear failed:", err);
  }
}

// ══════════════════════════════════════════════════════════════
//  🔧 HELPERS
// ══════════════════════════════════════════════════════════════

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}