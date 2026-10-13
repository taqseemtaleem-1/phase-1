// scripts/generate-icons.mjs
// Taqseem Taleem — PWA icon generator
// Runs sharp to create all PWA-required icons from taqseem-logo.png

import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SOURCE_IMAGE = resolve(projectRoot, "src/assets/taqseem-logo.png");
const PUBLIC_DIR = resolve(projectRoot, "public");
const ICONS_DIR = resolve(PUBLIC_DIR, "icons");

if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });
if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

if (!existsSync(SOURCE_IMAGE)) {
  console.error(`Source image not found: ${SOURCE_IMAGE}`);
  process.exit(1);
}

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const MASKABLE_BG = { r: 22, g: 163, b: 74, alpha: 1 };

async function generateStandardIcons() {
  console.log("\nGenerating standard icons...");
  for (const size of STANDARD_SIZES) {
    const outPath = resolve(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(outPath);
    console.log(`  OK: icon-${size}x${size}.png`);
  }
}

async function generateMaskableIcons() {
  console.log("\nGenerating maskable icons...");
  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * 0.8);
    const pad = Math.round((size - inner) / 2);
    const outPath = resolve(ICONS_DIR, `maskable-${size}x${size}.png`);

    await sharp(SOURCE_IMAGE)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: MASKABLE_BG,
      })
      .png()
      .toFile(outPath);
    console.log(`  OK: maskable-${size}x${size}.png`);
  }
}

async function generateAppleTouchIcon() {
  console.log("\nGenerating Apple touch icon...");
  const outPath = resolve(PUBLIC_DIR, "apple-touch-icon.png");
  await sharp(SOURCE_IMAGE)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(outPath);
  console.log(`  OK: apple-touch-icon.png (180x180)`);
}

async function generateFavicon() {
  console.log("\nGenerating favicon.ico...");
  const outPath = resolve(PUBLIC_DIR, "favicon.ico");
  await sharp(SOURCE_IMAGE)
    .resize(32, 32, { fit: "cover" })
    .png()
    .toFile(outPath);
  console.log(`  OK: favicon.ico (32x32)`);
}

async function main() {
  console.log("Taqseem Taleem - PWA Icon Generator");
  console.log("====================================");
  console.log(`Source: ${SOURCE_IMAGE}`);
  console.log(`Output: ${ICONS_DIR}`);

  try {
    await generateStandardIcons();
    await generateMaskableIcons();
    await generateAppleTouchIcon();
    await generateFavicon();

    console.log("\n====================================");
    console.log("All icons generated successfully!");
    console.log("");
    console.log("Files created:");
    console.log("   public/icons/*.png    (8 standard + 2 maskable)");
    console.log("   public/apple-touch-icon.png");
    console.log("   public/favicon.ico");
    console.log("");
  } catch (err) {
    console.error("\nIcon generation failed:", err);
    process.exit(1);
  }
}

main();