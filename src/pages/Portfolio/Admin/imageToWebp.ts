/**
 * Converts a dropped/selected image to WebP entirely in the browser -
 * no server or build step involved. PNG/JPG go through a canvas re-encode;
 * an image that's already WebP is used as-is. Also center-crops to a
 * 16:9 frame so every project card gets a consistent aspect ratio
 * regardless of what the source image's dimensions were.
 */

export interface ConvertedImage {
  blob: Blob;
  base64: string; // no data: prefix, ready for the GitHub Contents API
  previewUrl: string;
  width: number;
  height: number;
}

const TARGET_RATIO = 16 / 9;
// Project cards in the grid never render wider than ~600px even on a
// large desktop (see ProjectGrid.css - the grid splits into multiple
// columns well before a single card gets that wide). 960px covers that
// with headroom for retina/high-DPI displays without shipping 3-4x more
// pixels than any real layout will ever show.
const MAX_WIDTH = 960;

export function slugifyId(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function slugifyFilename(title: string): string {
  return `${slugifyId(title)}-${Date.now().toString(36)}`;
}

export async function convertToWebp(file: File): Promise<ConvertedImage> {
  const bitmap = await createImageBitmap(file);

  // Center-crop to 16:9.
  let cropW = bitmap.width;
  let cropH = bitmap.height;
  const currentRatio = bitmap.width / bitmap.height;

  if (currentRatio > TARGET_RATIO) {
    cropW = Math.round(bitmap.height * TARGET_RATIO);
  } else if (currentRatio < TARGET_RATIO) {
    cropH = Math.round(bitmap.width / TARGET_RATIO);
  }
  const cropX = Math.round((bitmap.width - cropW) / 2);
  const cropY = Math.round((bitmap.height - cropH) / 2);

  const outW = Math.min(MAX_WIDTH, cropW);
  const outH = Math.round(outW / TARGET_RATIO);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("WebP encoding failed."))),
      "image/webp",
      0.86,
    );
  });

  const base64 = await blobToBase64(blob);
  const previewUrl = URL.createObjectURL(blob);

  return { blob, base64, previewUrl, width: outW, height: outH };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
